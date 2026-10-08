// Slack Web API wrapper — read-only, no writes to Slack

const SLACK_BASE = 'https://slack.com/api'

function token() {
  const t = process.env.SLACK_BOT_TOKEN
  if (!t) throw new Error('SLACK_BOT_TOKEN is not set')
  return t
}

// Rate-limit-aware Slack API call with exponential backoff on 429
async function slackGet<T = unknown>(
  method: string,
  params: Record<string, string> = {},
  maxRetries = 3
): Promise<T> {
  const url = new URL(`${SLACK_BASE}/${method}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token()}` },
      cache: 'no-store',
    })

    if (res.status === 429) {
      if (attempt === maxRetries) throw new Error(`Slack rate limit exceeded after ${maxRetries} retries`)
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10)
      await new Promise((r) => setTimeout(r, retryAfter * 1000))
      continue
    }

    if (!res.ok) throw new Error(`Slack HTTP ${res.status} for ${method}`)

    const data = (await res.json()) as { ok: boolean; error?: string } & T
    if (!data.ok) throw new Error(`Slack API error: ${data.error ?? 'unknown'}`)

    return data
  }

  throw new Error(`Slack call to ${method} failed after ${maxRetries} retries`)
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SlackRawMessage {
  ts: string
  thread_ts?: string
  reply_count?: number
  user?: string
  username?: string
  bot_id?: string
  text: string
  subtype?: string
}

export interface SlackIngested {
  ts: string
  threadTs: string | null
  isThreadReply: boolean
  userId: string | null
  displayName: string
  text: string
  permalink: string
  isParentWithReplies: boolean
}

export interface WorkspaceInfo {
  teamId: string
  teamName: string
  teamDomain: string
  botUserId: string
}

export interface ChannelInfo {
  slackChannelId: string
  channelName: string
  channelType: string
  isPrivate: boolean
  isArchived: boolean
  isMember: boolean
  isAccessible: boolean
}

// ─── Workspace info ─────────────────────────────────────────────────────────

export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  const data = await slackGet<{
    team_id: string
    team: string
    url: string
    user_id: string
  }>('auth.test')

  const domainMatch = data.url?.match(/https?:\/\/([^.]+)\.slack\.com/)
  return {
    teamId: data.team_id,
    teamName: data.team,
    teamDomain: domainMatch?.[1] ?? '',
    botUserId: data.user_id,
  }
}

// ─── Channel discovery ──────────────────────────────────────────────────────

export async function discoverChannels(): Promise<ChannelInfo[]> {
  const allChannels: ChannelInfo[] = []

  // Discover public channels
  await paginateChannels('public_channel', allChannels)

  // Discover private channels the bot has access to
  await paginateChannels('private_channel', allChannels)

  return allChannels
}

async function paginateChannels(type: string, out: ChannelInfo[]): Promise<void> {
  let cursor: string | null = null

  do {
    const params: Record<string, string> = {
      types: type,
      limit: '200',
      exclude_archived: 'false',
    }
    if (cursor) params.cursor = cursor

    let data: {
      channels: Array<{
        id: string
        name: string
        is_private: boolean
        is_archived: boolean
        is_member: boolean
      }>
      response_metadata?: { next_cursor?: string }
    }

    try {
      data = await slackGet('conversations.list', params)
    } catch {
      // Bot may not have access to private channels — non-fatal
      break
    }

    for (const ch of data.channels ?? []) {
      out.push({
        slackChannelId: ch.id,
        channelName: ch.name,
        channelType: ch.is_private ? 'PRIVATE' : 'PUBLIC',
        isPrivate: ch.is_private,
        isArchived: ch.is_archived,
        isMember: ch.is_member,
        isAccessible: ch.is_member,  // can only read if bot is a member
      })
    }

    cursor = data.response_metadata?.next_cursor ?? null
  } while (cursor)
}

// ─── Channel info ───────────────────────────────────────────────────────────

export async function getChannelName(channelId: string): Promise<string> {
  try {
    const data = await slackGet<{ channel: { name: string } }>(
      'conversations.info',
      { channel: channelId }
    )
    return data.channel.name
  } catch {
    return channelId
  }
}

// ─── User resolution (cached per module lifecycle) ──────────────────────────

const userCache: Record<string, string> = {}

export async function resolveUser(userId: string): Promise<string> {
  if (userCache[userId]) return userCache[userId]
  try {
    const data = await slackGet<{
      user: { real_name?: string; profile?: { display_name?: string; real_name?: string } }
    }>('users.info', { user: userId })
    const name =
      data.user.profile?.display_name ||
      data.user.profile?.real_name ||
      data.user.real_name ||
      userId
    userCache[userId] = name
    return name
  } catch {
    return userId
  }
}

// ─── Permalink ──────────────────────────────────────────────────────────────

export function buildPermalink(channelId: string, ts: string): string {
  const tsSafe = ts.replace('.', '')
  return `https://app.slack.com/archives/${channelId}/p${tsSafe}`
}

// ─── Fetch all thread replies (paginated) ───────────────────────────────────

async function fetchAllThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackRawMessage[]> {
  const allReplies: SlackRawMessage[] = []
  let paginationCursor: string | null = null
  let isFirstPage = true
  let hasMore = true

  while (hasMore) {
    const params: Record<string, string> = {
      channel: channelId,
      ts: threadTs,
      limit: '200',
    }
    if (paginationCursor) params.cursor = paginationCursor

    const data = await slackGet<{
      messages: SlackRawMessage[]
      has_more: boolean
      response_metadata?: { next_cursor?: string }
    }>('conversations.replies', params)

    const page = data.messages ?? []
    if (isFirstPage) {
      allReplies.push(...page.slice(1)) // first message is parent — already in history
      isFirstPage = false
    } else {
      allReplies.push(...page)
    }

    hasMore = data.has_more ?? false
    paginationCursor = data.response_metadata?.next_cursor ?? null
    if (!paginationCursor) hasMore = false
  }

  return allReplies
}

// ─── Ingest a single channel (all pages since cursor) ──────────────────────

export async function ingestChannel(
  channelId: string,
  cursor?: string | null
): Promise<{ ingested: SlackIngested[]; newCursor: string | null }> {
  const allMessages: SlackRawMessage[] = []
  let paginationCursor: string | null = null
  let hasMore = true

  while (hasMore) {
    const params: Record<string, string> = {
      channel: channelId,
      limit: '200',
      inclusive: 'false',
    }
    if (cursor) params.oldest = cursor
    if (paginationCursor) params.cursor = paginationCursor

    const data = await slackGet<{
      messages: SlackRawMessage[]
      has_more: boolean
      response_metadata?: { next_cursor?: string }
    }>('conversations.history', params)

    allMessages.push(...(data.messages ?? []))
    hasMore = data.has_more ?? false
    paginationCursor = data.response_metadata?.next_cursor ?? null
    if (!paginationCursor) hasMore = false
  }

  const relevant = allMessages.filter(
    (m) => m.text && m.text.trim().length > 0 && !m.subtype?.includes('join')
  )

  // Fetch thread replies for messages that have them
  const threadReplies: SlackRawMessage[] = []
  for (const m of relevant) {
    if ((m.reply_count ?? 0) > 0 && m.thread_ts === m.ts) {
      try {
        const replies = await fetchAllThreadReplies(channelId, m.ts)
        threadReplies.push(...replies)
      } catch {
        // Non-fatal — skip if thread fetch fails
      }
    }
  }

  const combined = [...relevant, ...threadReplies]

  const ingested: SlackIngested[] = []
  for (const m of combined) {
    const userId = m.user ?? m.bot_id ?? null
    const displayName = userId ? await resolveUser(userId) : (m.username ?? 'Unknown')

    ingested.push({
      ts: m.ts,
      threadTs: m.thread_ts ?? null,
      isThreadReply: !!(m.thread_ts && m.thread_ts !== m.ts),
      userId,
      displayName,
      text: m.text,
      permalink: buildPermalink(channelId, m.ts),
      isParentWithReplies: (m.reply_count ?? 0) > 0 && m.thread_ts === m.ts,
    })
  }

  // Slack returns newest-first; relevant[0] is the newest message.
  const newCursor = relevant.length > 0 ? relevant[0].ts : cursor ?? null

  return { ingested, newCursor }
}
