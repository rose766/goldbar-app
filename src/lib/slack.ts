// Slack Web API wrapper — read-only, no writes to Slack

const SLACK_BASE = 'https://slack.com/api'

function token() {
  const t = process.env.SLACK_BOT_TOKEN
  if (!t) throw new Error('SLACK_BOT_TOKEN is not set')
  return t
}

async function slackGet<T = unknown>(
  method: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${SLACK_BASE}/${method}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Slack HTTP ${res.status} for ${method}`)

  const data = (await res.json()) as { ok: boolean; error?: string } & T
  if (!data.ok) throw new Error(`Slack API error: ${data.error ?? 'unknown'}`)

  return data
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

// ─── User resolution (cached per invocation) ───────────────────────────────

const userCache: Record<string, string> = {}

async function resolveUser(userId: string): Promise<string> {
  if (userCache[userId]) return userCache[userId]
  try {
    const data = await slackGet<{ user: { real_name?: string; profile?: { display_name?: string; real_name?: string } } }>(
      'users.info',
      { user: userId }
    )
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

function buildPermalink(channelId: string, ts: string): string {
  const tsSafe = ts.replace('.', '')
  return `https://app.slack.com/archives/${channelId}/p${tsSafe}`
}

// ─── Fetch channel history ──────────────────────────────────────────────────

export async function fetchChannelMessages(
  channelId: string,
  cursor?: string | null,
  limit = 200
): Promise<{ messages: SlackRawMessage[]; hasMore: boolean; nextCursor: string | null }> {
  const params: Record<string, string> = {
    channel: channelId,
    limit: String(limit),
    inclusive: 'false',
  }
  if (cursor) params.oldest = cursor

  const data = await slackGet<{
    messages: SlackRawMessage[]
    has_more: boolean
    response_metadata?: { next_cursor?: string }
  }>('conversations.history', params)

  return {
    messages: data.messages ?? [],
    hasMore: data.has_more ?? false,
    nextCursor: data.response_metadata?.next_cursor ?? null,
  }
}

// ─── Fetch thread replies ───────────────────────────────────────────────────

export async function fetchThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackRawMessage[]> {
  const data = await slackGet<{ messages: SlackRawMessage[] }>(
    'conversations.replies',
    { channel: channelId, ts: threadTs, limit: '100' }
  )
  // First message is the parent — skip it (already in channel history)
  return (data.messages ?? []).slice(1)
}

// ─── Ingest: fetch + resolve names + build permalinks ──────────────────────

export async function ingestChannel(
  channelId: string,
  cursor?: string | null
): Promise<{ ingested: SlackIngested[]; newCursor: string | null }> {
  const { messages } = await fetchChannelMessages(channelId, cursor)

  // Filter out bot/system messages that aren't useful
  const relevant = messages.filter(
    (m) => m.text && m.text.trim().length > 0 && !m.subtype?.includes('join')
  )

  // Collect thread parent messages and fetch their replies
  const threadReplies: SlackRawMessage[] = []
  for (const m of relevant) {
    if ((m.reply_count ?? 0) > 0 && m.thread_ts === m.ts) {
      try {
        const replies = await fetchThreadReplies(channelId, m.ts)
        threadReplies.push(...replies)
      } catch {
        // Non-fatal — skip thread if fetch fails
      }
    }
  }

  const allMessages = [...relevant, ...threadReplies]

  // Resolve usernames
  const ingested: SlackIngested[] = []
  for (const m of allMessages) {
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

  // New cursor = oldest ts processed (so next run gets newer messages)
  // Slack returns messages newest-first
  const newCursor = relevant.length > 0 ? relevant[0].ts : cursor ?? null

  return { ingested, newCursor }
}
