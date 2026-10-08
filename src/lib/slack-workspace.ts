// Workspace-wide Slack ingestion orchestrator
// Handles multi-channel ingestion with per-channel cursors and failure isolation.
// Keeps ingestion (fetch+store) separate from analysis (AI extraction).

import { prisma } from './prisma'
import { discoverChannels, getWorkspaceInfo, ingestChannel, buildPermalink } from './slack'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChannelIngestionResult {
  slackChannelId: string
  channelName: string
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RATE_LIMITED'
  messagesIngested: number
  newCursor: string | null
  error?: string
}

export interface WorkspaceIngestionResult {
  channelsProcessed: number
  channelsSucceeded: number
  channelsFailed: number
  channelsSkipped: number
  totalMessagesIngested: number
  results: ChannelIngestionResult[]
}

export interface IngestOptions {
  channelIds?: string[]     // specific Slack channel IDs; undefined = all enabled
  sinceTimestamp?: string   // backfill: use this cursor instead of stored cursor (does NOT advance stored cursor)
  isBackfill?: boolean      // prevents cursor advance when true
}

// ─── Workspace discovery ────────────────────────────────────────────────────

export async function discoverWorkspace() {
  const workspaceInfo = await getWorkspaceInfo()

  const workspace = await prisma.slackWorkspace.upsert({
    where: { teamId: workspaceInfo.teamId },
    create: {
      teamId: workspaceInfo.teamId,
      teamName: workspaceInfo.teamName,
      teamDomain: workspaceInfo.teamDomain,
      botUserId: workspaceInfo.botUserId,
    },
    update: {
      teamName: workspaceInfo.teamName,
      teamDomain: workspaceInfo.teamDomain,
      botUserId: workspaceInfo.botUserId,
      lastDiscoveredAt: new Date(),
    },
  })

  const channels = await discoverChannels()

  let accessibleCount = 0
  let upserted = 0

  for (const ch of channels) {
    await prisma.slackChannel.upsert({
      where: { slackChannelId: ch.slackChannelId },
      create: {
        workspaceId: workspace.id,
        slackChannelId: ch.slackChannelId,
        channelName: ch.channelName,
        channelType: ch.channelType,
        isPrivate: ch.isPrivate,
        isArchived: ch.isArchived,
        isMember: ch.isMember,
        isAccessible: ch.isAccessible,
        // New channels default: ingestion and analysis off until explicitly enabled
        ingestionEnabled: false,
        analysisEnabled: false,
        classification: ch.isPrivate ? 'OTHER' : 'OTHER',
      },
      update: {
        channelName: ch.channelName,
        channelType: ch.channelType,
        isPrivate: ch.isPrivate,
        isArchived: ch.isArchived,
        isMember: ch.isMember,
        isAccessible: ch.isAccessible,
      },
    })
    if (ch.isAccessible) accessibleCount++
    upserted++
  }

  await prisma.slackWorkspace.update({
    where: { id: workspace.id },
    data: {
      totalChannels: channels.length,
      accessibleChannels: accessibleCount,
      lastDiscoveredAt: new Date(),
    },
  })

  return {
    workspace,
    channelsDiscovered: channels.length,
    channelsAccessible: accessibleCount,
    channelsUpserted: upserted,
  }
}

// ─── Workspace-wide ingestion ───────────────────────────────────────────────
// Ingestion = fetch from Slack + store in DB. No AI analysis here.
// Each channel is processed independently; one failure never aborts the rest.
// Cursor is only advanced per channel after that channel succeeds.

export async function ingestWorkspace(opts: IngestOptions = {}): Promise<WorkspaceIngestionResult> {
  type WhereClause = NonNullable<Parameters<typeof prisma.slackChannel.findMany>[0]>['where']
  const where: WhereClause = {
    ingestionEnabled: true,
    enabled: true,
    isAccessible: true,
    classification: { not: 'EXCLUDED' },
  }
  if (opts.channelIds && opts.channelIds.length > 0) {
    where.slackChannelId = { in: opts.channelIds }
  }

  const channels = await prisma.slackChannel.findMany({ where })

  const results: ChannelIngestionResult[] = []

  for (const channel of channels) {
    // Each channel runs in its own try/catch — failure never bleeds into other channels
    try {
      const cursorToUse = opts.sinceTimestamp ?? channel.cursor
      const { ingested, newCursor } = await ingestChannel(channel.slackChannelId, cursorToUse)

      let stored = 0
      let skipped = 0

      for (const msg of ingested) {
        try {
          await prisma.slackMessage.upsert({
            where: {
              slackTimestamp_channelId: {
                slackTimestamp: msg.ts,
                channelId: channel.slackChannelId,
              },
            },
            create: {
              slackChannelDbId: channel.id,
              slackTimestamp: msg.ts,
              channelId: channel.slackChannelId,
              channelName: channel.channelName ?? '',
              authorName: msg.displayName,
              authorId: msg.userId ?? undefined,
              rawText: msg.text,
              threadTs: msg.threadTs ?? undefined,
              permalink: msg.permalink,
              postedAt: new Date(parseFloat(msg.ts) * 1000),
            },
            update: {}, // idempotent — no-op if already stored
          })
          stored++
        } catch {
          skipped++
        }
      }

      // Advance cursor only on a live sync (not backfill) and only on success
      if (!opts.isBackfill && !opts.sinceTimestamp && newCursor) {
        await prisma.slackChannel.update({
          where: { id: channel.id },
          data: {
            cursor: newCursor,
            lastSyncAt: new Date(),
            lastSuccessfulSyncAt: new Date(),
            lastError: null,
            totalMessages: { increment: stored },
            messagesSkipped: { increment: skipped },
          },
        })
      } else {
        // Still update lastSyncAt on backfill but don't touch cursor
        await prisma.slackChannel.update({
          where: { id: channel.id },
          data: { lastSyncAt: new Date() },
        })
      }

      results.push({
        slackChannelId: channel.slackChannelId,
        channelName: channel.channelName ?? channel.slackChannelId,
        status: 'SUCCESS',
        messagesIngested: stored,
        newCursor,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const isRateLimit = msg.toLowerCase().includes('rate limit') || msg.includes('429')

      // Record per-channel error — does not advance cursor
      try {
        await prisma.slackChannel.update({
          where: { id: channel.id },
          data: {
            lastError: msg.slice(0, 500),
            lastSyncAt: new Date(),
          },
        })
      } catch {
        // DB update failure is non-fatal
      }

      results.push({
        slackChannelId: channel.slackChannelId,
        channelName: channel.channelName ?? channel.slackChannelId,
        status: isRateLimit ? 'RATE_LIMITED' : 'FAILED',
        messagesIngested: 0,
        newCursor: null,
        error: msg.slice(0, 200),
      })
    }
  }

  const succeeded = results.filter((r) => r.status === 'SUCCESS')
  const failed = results.filter((r) => r.status !== 'SUCCESS')

  return {
    channelsProcessed: channels.length,
    channelsSucceeded: succeeded.length,
    channelsFailed: failed.length,
    channelsSkipped: 0,
    totalMessagesIngested: succeeded.reduce((sum, r) => sum + r.messagesIngested, 0),
    results,
  }
}

// ─── Re-export buildPermalink for use in routes ────────────────────────────
export { buildPermalink }
