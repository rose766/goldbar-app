export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestWorkspace } from '@/lib/slack-workspace'
import { buildPermalink } from '@/lib/slack'
import { extractFromMessages, buildContext } from '@/lib/ai-extract'
import type { SlackIngested } from '@/lib/slack'

const BATCH_SIZE = 15

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))

  const liveSyncEnabled = process.env.SLACK_LIVE_SYNC_ENABLED === 'true'
  const requestedLiveSync = body.isDryRun === false
  if (requestedLiveSync && !liveSyncEnabled) {
    return NextResponse.json(
      { error: 'Live sync is disabled. Set SLACK_LIVE_SYNC_ENABLED=true to enable production writes.' },
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

  const channel = await prisma.slackChannel.findUnique({ where: { id: params.id } })
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }
  if (!channel.ingestionEnabled) {
    return NextResponse.json({ error: 'Ingestion is not enabled for this channel' }, { status: 400 })
  }
  if (!channel.isAccessible) {
    return NextResponse.json({ error: 'Channel is not accessible to the bot' }, { status: 400 })
  }
  if (channel.classification === 'EXCLUDED') {
    return NextResponse.json({ error: 'Channel is excluded from ingestion' }, { status: 400 })
  }

  try {
    const syncStartTime = new Date()

    // Step 1: Ingest this specific channel
    const ingestionResult = await ingestWorkspace({ channelIds: [channel.slackChannelId] })
    const channelResult = ingestionResult.results[0]

    if (!channelResult || channelResult.status !== 'SUCCESS' || ingestionResult.totalMessagesIngested === 0) {
      return NextResponse.json({
        success: true,
        isDryRun,
        ingestion: channelResult,
        analysis: { proposalsCreated: 0, reason: 'No new messages' },
      })
    }

    // Step 2: AI analysis (only if analysisEnabled)
    if (!channel.analysisEnabled) {
      return NextResponse.json({
        success: true,
        isDryRun,
        ingestion: channelResult,
        analysis: { proposalsCreated: 0, reason: 'Analysis is disabled for this channel' },
      })
    }

    const newMessages = await prisma.slackMessage.findMany({
      where: { channelId: channel.slackChannelId, processedAt: { gte: syncStartTime } },
      orderBy: { slackTimestamp: 'asc' },
    })

    if (newMessages.length === 0) {
      return NextResponse.json({
        success: true,
        isDryRun,
        ingestion: channelResult,
        analysis: { proposalsCreated: 0, reason: 'No new messages after dedup' },
      })
    }

    const [clients, vas, openItems] = await Promise.all([
      prisma.client.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, health: true } }),
      prisma.vA.findMany({ where: { status: 'ACTIVE' }, include: { client: { select: { name: true } } } }),
      prisma.openItem.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: { client: { select: { name: true } }, va: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    ])

    const context = buildContext(clients, vas, openItems)

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

      const parents = ingested.filter((m) => !m.isThreadReply)
      const replyMap = new Map<string, SlackIngested[]>()
      for (const m of ingested) {
        if (m.isThreadReply && m.threadTs) {
          const arr = replyMap.get(m.threadTs) ?? []
          arr.push(m)
          replyMap.set(m.threadTs, arr)
        }
      }

      const grouped = parents.map((p) => [p, ...(replyMap.get(p.ts) ?? [])])
      const batches: SlackIngested[][] = []
      let cur: SlackIngested[] = []
      for (const thread of grouped) {
        if (cur.length + thread.length > BATCH_SIZE && cur.length > 0) { batches.push(cur); cur = [] }
        cur.push(...thread)
      }
      if (cur.length > 0) batches.push(cur)

      let proposalsCreated = 0

      for (const batch of batches) {
        const proposals = await extractFromMessages(batch, context)
        for (const proposal of proposals) {
          if (proposal.action === 'INFORMATIONAL') continue
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
          proposalsCreated++
        }
      }

      await prisma.slackAnalysisRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED', completedAt: new Date(),
          messagesAnalyzed: newMessages.length,
          itemsFlaggedForReview: proposalsCreated,
        },
      })

      return NextResponse.json({
        success: true,
        isDryRun,
        ingestion: channelResult,
        analysis: { proposalsCreated, messagesAnalyzed: newMessages.length },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await prisma.slackAnalysisRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', errorLog: msg, completedAt: new Date() },
      })
      return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
