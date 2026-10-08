export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestWorkspace } from '@/lib/slack-workspace'
import { buildPermalink } from '@/lib/slack'
import { extractFromMessages, buildContext } from '@/lib/ai-extract'
import type { SlackIngested } from '@/lib/slack'

const BATCH_SIZE = 15

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  // Server-side gate: live sync requires explicit env var
  const liveSyncEnabled = process.env.SLACK_LIVE_SYNC_ENABLED === 'true'
  const requestedLiveSync = body.isDryRun === false
  if (requestedLiveSync && !liveSyncEnabled) {
    return NextResponse.json(
      { error: 'Live sync is disabled. Set SLACK_LIVE_SYNC_ENABLED=true on the server to enable production writes.' },
      { status: 403 }
    )
  }
  const isDryRun = !liveSyncEnabled || !requestedLiveSync

  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 400 })
  }

  // Optional: sync only specific channels
  const channelIds: string[] | undefined = Array.isArray(body.channelIds) ? body.channelIds : undefined

  try {
    // ── Step 1: Ingest messages from Slack ─────────────────────────────────
    const syncStartTime = new Date()

    const ingestionResult = await ingestWorkspace({ channelIds })

    // ── Step 2: AI analysis for channels with analysisEnabled=true ─────────
    const analysisChannels = await prisma.slackChannel.findMany({
      where: {
        analysisEnabled: true,
        enabled: true,
        isAccessible: true,
        classification: { not: 'EXCLUDED' },
        ...(channelIds ? { slackChannelId: { in: channelIds } } : {}),
      },
    })

    if (analysisChannels.length === 0 || ingestionResult.totalMessagesIngested === 0) {
      return NextResponse.json({
        success: true,
        isDryRun,
        ingestion: ingestionResult,
        analysis: { channelsAnalyzed: 0, proposalsCreated: 0 },
      })
    }

    // Load DB context once for all channels
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
        include: { client: { select: { name: true } }, va: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ])

    const context = buildContext(clients, vas, openItems)

    let totalProposals = 0
    let channelsAnalyzed = 0

    for (const channel of analysisChannels) {
      // Only analyze messages that were newly ingested in this sync run
      const newMessages = await prisma.slackMessage.findMany({
        where: {
          channelId: channel.slackChannelId,
          processedAt: { gte: syncStartTime },
        },
        orderBy: { slackTimestamp: 'asc' },
      })

      if (newMessages.length === 0) continue

      const run = await prisma.slackAnalysisRun.create({
        data: {
          slackChannelDbId: channel.id,
          channelId: channel.slackChannelId,
          channelName: channel.channelName,
          isDryRun,
          status: 'RUNNING',
        },
      })

      try {
        // Convert DB records to SlackIngested format for the AI extractor
        const ingested: SlackIngested[] = newMessages.map((m) => ({
          ts: m.slackTimestamp,
          threadTs: m.threadTs ?? null,
          isThreadReply: !!(m.threadTs && m.threadTs !== m.slackTimestamp),
          userId: m.authorId ?? null,
          displayName: m.authorName ?? 'Unknown',
          text: m.rawText,
          permalink: m.permalink ?? buildPermalink(channel.slackChannelId, m.slackTimestamp),
          isParentWithReplies: false,
        }))

        // Group: parent messages with their thread replies
        const parents = ingested.filter((m) => !m.isThreadReply)
        const replyMap = new Map<string, SlackIngested[]>()
        for (const m of ingested) {
          if (m.isThreadReply && m.threadTs) {
            const arr = replyMap.get(m.threadTs) ?? []
            arr.push(m)
            replyMap.set(m.threadTs, arr)
          }
        }

        const grouped: SlackIngested[][] = parents.map((p) => [p, ...(replyMap.get(p.ts) ?? [])])

        // Flatten into batches of BATCH_SIZE
        const batches: SlackIngested[][] = []
        let cur: SlackIngested[] = []
        for (const thread of grouped) {
          if (cur.length + thread.length > BATCH_SIZE && cur.length > 0) {
            batches.push(cur)
            cur = []
          }
          cur.push(...thread)
        }
        if (cur.length > 0) batches.push(cur)

        let channelProposals = 0

        for (const batch of batches) {
          const proposals = await extractFromMessages(batch, context)

          for (const proposal of proposals) {
            if (proposal.action === 'INFORMATIONAL') continue

            // Dedup: skip if identical proposal already pending for this ts
            const existing = await prisma.reviewItem.findFirst({
              where: { sourceTimestamp: proposal.sourceTimestamp, isDryRun: true, status: 'PENDING' },
            })
            if (existing) continue

            await prisma.reviewItem.create({
              data: {
                analysisRunId: run.id,
                openItemId: proposal.proposedData.openItemId ?? undefined,
                isDryRun,
                reviewType: proposal.reviewType ?? 'MEDIUM_CONFIDENCE_EXTRACTION',
                status: 'PENDING',
                aiInterpretation: proposal.aiInterpretation,
                aiConfidence: proposal.confidence,
                proposedAction: proposal.action,
                proposedData: JSON.stringify({
                  ...proposal.proposedData,
                  clientId: proposal.clientId,
                  clientName: proposal.clientName,
                  vaId: proposal.vaId,
                  vaName: proposal.vaName,
                }),
                sourceMessage: proposal.sourceMessage,
                sourceTimestamp: proposal.sourceTimestamp,
                sourceLink: proposal.sourceLink,
                notes: proposal.authorName ? `Author: ${proposal.authorName}` : null,
              },
            })
            channelProposals++
          }
        }

        await prisma.slackAnalysisRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            messagesAnalyzed: newMessages.length,
            itemsFlaggedForReview: channelProposals,
          },
        })

        totalProposals += channelProposals
        channelsAnalyzed++
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        await prisma.slackAnalysisRun.update({
          where: { id: run.id },
          data: { status: 'FAILED', errorLog: msg, completedAt: new Date() },
        })
      }
    }

    return NextResponse.json({
      success: true,
      isDryRun,
      ingestion: ingestionResult,
      analysis: { channelsAnalyzed, proposalsCreated: totalProposals },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Workspace sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
