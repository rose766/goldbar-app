// AI extraction engine — Claude analyzes Slack messages and proposes changes
// Conservative: never auto-applies anything. All proposals go to ReviewItem.

import Anthropic from '@anthropic-ai/sdk'
import type { SlackIngested } from './slack'

const client = new Anthropic()

// ─── Types ─────────────────────────────────────────────────────────────────

export type ProposedAction =
  | 'CREATE_ITEM'
  | 'UPDATE_ITEM'
  | 'COMPLETE_ITEM'
  | 'DEADLINE_CHANGE'
  | 'OWNER_CHANGE'
  | 'FLAG_BLOCKER'
  | 'INFORMATIONAL'
  | 'NEEDS_REVIEW'

export interface ExtractionProposal {
  action: ProposedAction
  confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'
  reviewType: string

  // Context
  clientName: string | null
  clientId: string | null
  vaName: string | null
  vaId: string | null

  // Proposed item data
  proposedData: {
    title?: string
    description?: string
    nextStep?: string
    owner?: string
    ownerType?: string
    deadline?: string | null   // ISO date or null — never guessed
    status?: string
    priority?: string
    blockerDescription?: string
    completionEvidence?: string
    openItemId?: string        // for updates/completions — matched existing item
  }

  // AI reasoning
  aiInterpretation: string
  reason: string

  // Source traceability
  sourceMessage: string
  sourceTimestamp: string
  sourceLink: string
  authorName: string
}

export interface ExtractionContext {
  clients: Array<{ id: string; name: string; health: string }>
  vas: Array<{ id: string; name: string; clientId: string; clientName: string }>
  openItems: Array<{
    id: string
    title: string
    status: string
    clientId: string
    clientName: string
    vaId: string | null
    vaName: string | null
    owner: string | null
    deadline: string | null
  }>
}

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(context: ExtractionContext): string {
  return `You are an AI assistant for Goldbar, an Executive Assistant agency. Your job is to analyze Slack messages from account management channels and identify actionable items, updates, and information about clients and VAs.

EXISTING DATA CONTEXT:
Clients: ${JSON.stringify(context.clients)}
VAs: ${JSON.stringify(context.vas)}
Open Items (active): ${JSON.stringify(context.openItems.slice(0, 50))}

CONSERVATIVE EXTRACTION RULES (strictly enforced):
1. NEVER guess or infer a deadline. Only extract a deadline if a specific date or timeframe is EXPLICITLY stated.
2. NEVER guess an owner. Only assign an owner if explicitly named in the message.
3. NEVER assume an item is completed unless there is explicit confirmation language ("done", "completed", "finished", "resolved").
4. NEVER create a duplicate. Check the open items list before proposing creation.
5. If you are uncertain about client, VA, or intent — use confidence "NEEDS_REVIEW".
6. Prefer matching to an existing item (UPDATE) over creating a new one.
7. Informational-only messages that require no action should use action "INFORMATIONAL".

CONFIDENCE LEVELS:
- HIGH: Explicit, clear information. Client/VA clearly identified. Action unambiguous.
- MEDIUM: Mostly clear but some inference required. Flag for review.
- NEEDS_REVIEW: Unclear client/VA, ambiguous intent, or conflicting information.

OUTPUT FORMAT:
Return a JSON array of proposals. Each proposal must have ALL these fields:
{
  "action": "CREATE_ITEM" | "UPDATE_ITEM" | "COMPLETE_ITEM" | "DEADLINE_CHANGE" | "OWNER_CHANGE" | "FLAG_BLOCKER" | "INFORMATIONAL" | "NEEDS_REVIEW",
  "confidence": "HIGH" | "MEDIUM" | "NEEDS_REVIEW",
  "reviewType": one of: "POSSIBLE_DUPLICATE" | "MISSING_DEADLINE" | "UNCLEAR_OWNER" | "UNCLEAR_CLIENT" | "UNCLEAR_VA" | "POSSIBLE_COMPLETION" | "POSSIBLE_DEADLINE_CHANGE" | "CONFLICTING_INFORMATION" | "MEDIUM_CONFIDENCE_EXTRACTION" | "NEW_GAME_PLAN" | "PRIORITY_CHANGE",
  "clientName": string or null,
  "clientId": string or null (must match an existing client id from context),
  "vaName": string or null,
  "vaId": string or null (must match an existing VA id from context),
  "proposedData": {
    "title": string (required for CREATE_ITEM),
    "description": string or null,
    "nextStep": string or null,
    "owner": string or null (null if not explicitly stated),
    "ownerType": "CLIENT" | "VA" | "ACCOUNT_MANAGER" | "GOLDBAR" | "UNASSIGNED",
    "deadline": ISO date string or null (null if not explicitly stated — never guess),
    "status": valid status string or null,
    "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" or null,
    "blockerDescription": string or null,
    "completionEvidence": string or null,
    "openItemId": string or null (id of existing item this updates/completes)
  },
  "aiInterpretation": "one sentence describing what you believe this message means",
  "reason": "one sentence explaining why you chose this action and confidence level"
}

Return [] if no actionable information is found.
Return ONLY the JSON array, no markdown, no explanation.`
}

// ─── Batch extraction ───────────────────────────────────────────────────────

function buildUserPrompt(messages: SlackIngested[]): string {
  const formatted = messages
    .map((m) => {
      const role = m.isThreadReply ? '  [reply]' : '[message]'
      const thread = m.threadTs && !m.isThreadReply ? ' [has replies]' : ''
      return `${role}${thread} ${m.displayName} (${m.ts}): ${m.text}`
    })
    .join('\n')

  return `Analyze these Slack messages and return proposals as JSON:\n\n${formatted}`
}

export async function extractFromMessages(
  messages: SlackIngested[],
  context: ExtractionContext
): Promise<ExtractionProposal[]> {
  if (messages.length === 0) return []

  const systemPrompt = buildSystemPrompt(context)
  const userPrompt = buildUserPrompt(messages)

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    if (!text.trim()) return []

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed)) return []

    // Attach source traceability from the messages
    return parsed.map((p: Partial<ExtractionProposal>) => {
      // Find the most relevant source message
      const relevantMsg = messages.find((m) => !m.isThreadReply) ?? messages[0]

      return {
        action: p.action ?? 'NEEDS_REVIEW',
        confidence: p.confidence ?? 'NEEDS_REVIEW',
        reviewType: p.reviewType ?? 'MEDIUM_CONFIDENCE_EXTRACTION',
        clientName: p.clientName ?? null,
        clientId: p.clientId ?? null,
        vaName: p.vaName ?? null,
        vaId: p.vaId ?? null,
        proposedData: p.proposedData ?? {},
        aiInterpretation: p.aiInterpretation ?? '',
        reason: p.reason ?? '',
        sourceMessage: relevantMsg.text,
        sourceTimestamp: relevantMsg.ts,
        sourceLink: relevantMsg.permalink,
        authorName: relevantMsg.displayName,
      } as ExtractionProposal
    })
  } catch (err) {
    console.error('AI extraction error:', err)
    return []
  }
}

// ─── Build context from DB snapshot ────────────────────────────────────────

export function buildContext(
  clients: Array<{ id: string; name: string; health: string }>,
  vas: Array<{ id: string; name: string; clientId: string; client: { name: string } }>,
  items: Array<{
    id: string
    title: string
    status: string
    clientId: string
    client: { name: string }
    vaId: string | null
    va: { name: string } | null
    owner: string | null
    deadline: Date | null
  }>
): ExtractionContext {
  return {
    clients,
    vas: vas.map((v) => ({ id: v.id, name: v.name, clientId: v.clientId, clientName: v.client.name })),
    openItems: items.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      clientId: i.clientId,
      clientName: i.client.name,
      vaId: i.vaId,
      vaName: i.va?.name ?? null,
      owner: i.owner,
      deadline: i.deadline ? i.deadline.toISOString().split('T')[0] : null,
    })),
  }
}
