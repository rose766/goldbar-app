import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocExtractionContext {
  clients: Array<{ id: string; name: string; health: string }>
  vas: Array<{ id: string; name: string; clientId: string; clientName: string }>
  openItems: Array<{ id: string; title: string; status: string; clientName: string; vaName: string | null }>
}

export interface DocumentProposal {
  action: 'CREATE_ITEM' | 'UPDATE_ITEM' | 'CREATE_GAME_PLAN' | 'INFORMATIONAL' | 'NEEDS_REVIEW'
  reviewType: string
  confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'
  aiInterpretation: string
  aiReasoning: string
  sourceExcerpt: string  // exact text from document that led to this proposal

  // Matched entities (null if not found/ambiguous)
  clientId:   string | null
  clientName: string | null
  vaId:       string | null
  vaName:     string | null
  openItemId: string | null // if updating existing item

  // Proposed item fields
  proposedData: {
    title?:               string
    description?:         string
    nextStep?:            string
    owner?:               string | null      // task owner (person doing the work)
    ownerType?:           string
    amFollowUp?:          boolean
    amFollowUpNotes?:     string | null     // who the AM should follow up with and why
    deadline?:            string | null      // ISO date string, null if not stated
    deadlineStatus?:      string
    priority?:            string
    status?:              string
    blockerDescription?:  string | null
    dependency?:          string | null
    waitingFor?:          string | null
    completionEvidence?:  string | null
    openItemId?:          string | null
    // Missing info flags
    missingDeadline?:     boolean
    missingOwner?:        boolean
    clientNotFound?:      boolean
    vaNotFound?:          boolean
  }
}

// ─── Context builder ──────────────────────────────────────────────────────────

export async function buildDocContext(): Promise<DocExtractionContext> {
  const [clients, vas, openItems] = await Promise.all([
    prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, health: true },
    }),
    prisma.vA.findMany({
      where: { status: 'ACTIVE' },
      include: { client: { select: { name: true } } },
    }),
    prisma.openItem.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: {
        client: { select: { name: true } },
        va: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    }),
  ])

  return {
    clients: clients.map((c) => ({ id: c.id, name: c.name, health: c.health })),
    vas: vas.map((v) => ({ id: v.id, name: v.name, clientId: v.clientId, clientName: v.client.name })),
    openItems: openItems.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      clientName: i.client.name,
      vaName: i.va?.name ?? null,
    })),
  }
}

// ─── Sanitizer ───────────────────────────────────────────────────────────────

function sanitizeProposal(p: DocumentProposal, ctx: DocExtractionContext): DocumentProposal {
  const clientIds = new Set(ctx.clients.map((c) => c.id))
  const vaIds = new Set(ctx.vas.map((v) => v.id))
  const itemIds = new Set(ctx.openItems.map((i) => i.id))

  let downgrade = false

  if (p.clientId && !clientIds.has(p.clientId)) {
    p.clientId = null
    p.proposedData.clientNotFound = true
    downgrade = true
  }
  if (p.vaId && !vaIds.has(p.vaId)) {
    p.vaId = null
    p.proposedData.vaNotFound = true
    downgrade = true
  }
  if (p.proposedData.openItemId && !itemIds.has(p.proposedData.openItemId)) {
    p.proposedData.openItemId = null
    downgrade = true
  }
  if (p.openItemId && !itemIds.has(p.openItemId)) {
    p.openItemId = null
    downgrade = true
  }

  if (downgrade && p.confidence === 'HIGH') {
    p.confidence = 'NEEDS_REVIEW'
  }

  // Validate enums
  const validActions = new Set(['CREATE_ITEM', 'UPDATE_ITEM', 'CREATE_GAME_PLAN', 'INFORMATIONAL', 'NEEDS_REVIEW'])
  if (!validActions.has(p.action)) p.action = 'NEEDS_REVIEW'

  const validConf = new Set(['HIGH', 'MEDIUM', 'NEEDS_REVIEW'])
  if (!validConf.has(p.confidence)) p.confidence = 'NEEDS_REVIEW'

  return p
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: DocExtractionContext, documentTitle: string): string {
  const clientList = ctx.clients.map((c) => `  - id:${c.id} name:"${c.name}" health:${c.health}`).join('\n')
  const vaList = ctx.vas.map((v) => `  - id:${v.id} name:"${v.name}" client:"${v.clientName}"`).join('\n')
  const itemList = ctx.openItems
    .slice(0, 40)
    .map((i) => `  - id:${i.id} title:"${i.title}" status:${i.status} client:"${i.clientName}"`)
    .join('\n')

  return `You are an expert operations analyst for Goldbar Staffing, an executive assistant (EA) agency.

You are analyzing a business document: "${documentTitle}"

Your job is to extract every actionable commitment, task, open item, objective, milestone, and follow-up from this document and return structured proposals for human review.

## KNOWN CLIENTS (use exact IDs):
${clientList || '  (none)'}

## KNOWN VAs / EXECUTIVE ASSISTANTS (use exact IDs):
${vaList || '  (none)'}

## EXISTING OPEN ITEMS (check before proposing CREATE — avoid duplicates):
${itemList || '  (none)'}

## CRITICAL RULES:

### NEVER INVENT
- NEVER invent deadlines. If the document does not explicitly state a deadline, set deadline: null and missingDeadline: true.
- NEVER invent owners. If ownership is unclear, set owner: null, ownerType: "UNASSIGNED", missingOwner: true.
- NEVER invent client names. If the client is not clear, set clientId: null, clientNotFound: true.
- NEVER invent VA names. If a VA is not in the known list, set vaId: null.
- NEVER invent completion status. Only mark completed if the document explicitly states completion.
- NEVER invent priority unless the document explicitly states urgency/priority.

### TASK OWNER vs AM FOLLOW-UP OWNER — THIS IS CRITICAL
- Task owner = the person DOING the work (a VA, a client contact, a third party)
- AM Follow-Up owner = the Goldbar Account Manager responsible for CHECKING IN
- If the document says "Rose will follow up with Kendri about the SOP":
  → owner = "Kendri" (the one doing the work)
  → amFollowUp = true
  → amFollowUpNotes = "Rose to follow up with Kendri"
  → DO NOT set owner = "Rose"
- If it's unclear whether "Rose" is doing the task or just following up, flag with NEEDS_REVIEW.
- Account Managers (Rose, etc.) should almost never be the task owner unless they are explicitly building/creating something themselves.

### CLIENT MATCHING
- Match client names to the known clients list using fuzzy matching
- If exact match: use that clientId
- If ambiguous or not found: clientId = null, confidence = NEEDS_REVIEW

### VA MATCHING
- Match VA names to the known VAs list
- If exact match: use that vaId
- If not found: vaId = null (do NOT create a fictional VA)

### DUPLICATE DETECTION
- Before proposing CREATE_ITEM, check existing open items for semantic similarity
- If a similar item exists: propose UPDATE_ITEM instead with the existing openItemId
- Prefer UPDATE over CREATE when in doubt

### MISSING INFO FLAGS
- missingDeadline: true if no deadline stated
- missingOwner: true if no clear task owner
- clientNotFound: true if client cannot be matched
- vaNotFound: true if VA mentioned but not found in list

### CONFIDENCE LEVELS
- HIGH: clear, explicit, unambiguous statement in document
- MEDIUM: reasonable inference, but some uncertainty
- NEEDS_REVIEW: ambiguous, conflicting, or missing critical context

### WHAT TO EXTRACT
Extract ALL of:
1. Open items / tasks / deliverables / commitments
2. Next steps assigned to specific people
3. Deadlines and target dates
4. Blockers and dependencies
5. AM follow-up items (things the account manager needs to check)
6. Objectives and milestones (flag as CREATE_GAME_PLAN if this is a full game plan doc)
7. Client concerns or risks
8. Missing information that needs clarification

### WHAT NOT TO EXTRACT
- Generic company descriptions
- Boilerplate content
- Strategic vision without specific actions
- Already-completed items (unless they need to be marked complete in the system)

### OUTPUT FORMAT
Return a JSON array of proposal objects. Each object must have ALL of these fields:

{
  "action": "CREATE_ITEM" | "UPDATE_ITEM" | "CREATE_GAME_PLAN" | "INFORMATIONAL" | "NEEDS_REVIEW",
  "reviewType": one of: POSSIBLE_DUPLICATE | MISSING_DEADLINE | UNCLEAR_OWNER | UNCLEAR_CLIENT | UNCLEAR_VA | POSSIBLE_COMPLETION | NEW_GAME_PLAN | PRIORITY_CHANGE | MEDIUM_CONFIDENCE_EXTRACTION | AM_FOLLOW_UP | BLOCKER | DEPENDENCY | RISK | MISSING_INFO,
  "confidence": "HIGH" | "MEDIUM" | "NEEDS_REVIEW",
  "aiInterpretation": "one sentence describing what this item is",
  "aiReasoning": "brief explanation of why you extracted this and how confident you are",
  "sourceExcerpt": "exact quote or close paraphrase from the document that justifies this extraction",
  "clientId": "<exact client id from list above>" | null,
  "clientName": "<client name as mentioned in document>" | null,
  "vaId": "<exact VA id from list above>" | null,
  "vaName": "<VA name as mentioned in document>" | null,
  "openItemId": "<existing item id if updating>" | null,
  "proposedData": {
    "title": "concise task title",
    "description": "full task description",
    "nextStep": "immediate next action" | null,
    "owner": "person doing the work" | null,
    "ownerType": "VA" | "CLIENT" | "GOLDBAR" | "EXTERNAL" | "UNASSIGNED",
    "amFollowUp": true | false,
    "amFollowUpNotes": "who to follow up with and about what" | null,
    "deadline": "YYYY-MM-DD" | null,
    "deadlineStatus": "CONFIRMED" | "ESTIMATED" | "TBD",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "status": "NOT_STARTED" | "IN_PROGRESS" | "WAITING" | "COMPLETED",
    "blockerDescription": "description of blocker" | null,
    "dependency": "what this depends on" | null,
    "waitingFor": "who/what we are waiting on" | null,
    "completionEvidence": "evidence of completion" | null,
    "missingDeadline": true | false,
    "missingOwner": true | false,
    "clientNotFound": true | false,
    "vaNotFound": true | false
  }
}

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON array.
If the document contains no actionable items, return [].`
}

// ─── Main extraction function ─────────────────────────────────────────────────

const MAX_DOC_CHARS = 80000  // ~20k tokens — stay well within claude-haiku-4-5 context

export async function extractFromDocument(
  documentText: string,
  documentTitle: string,
  context: DocExtractionContext
): Promise<DocumentProposal[]> {
  // Truncate if necessary
  const text = documentText.length > MAX_DOC_CHARS
    ? documentText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated for analysis — full text stored]'
    : documentText

  const systemPrompt = buildSystemPrompt(context, documentTitle)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please analyze this document and extract all actionable items:\n\n${text}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: DocumentProposal[]
  try {
    // Strip any markdown fences if present
    const jsonText = raw.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim()
    parsed = JSON.parse(jsonText)
    if (!Array.isArray(parsed)) parsed = []
  } catch {
    console.error('Document AI: failed to parse response', raw.slice(0, 500))
    return []
  }

  return parsed.map((p) => sanitizeProposal(p, context))
}
