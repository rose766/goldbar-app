export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestChannel, getChannelName } from '@/lib/slack'
import { extractFromMessages, buildContext } from '@/lib/ai-extract'

const BATCH_SIZE = 15

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const isDryRun = body.isDryRun !== false // default true — always dry-run until explicitly set false

  const channelId = process.env.SLACK_CHANNEL_ID
  if (!channelId) {
    return NextResponse.json({ error: 'SLACK_CHANNEL_ID is not configured' }, { status: 400 })
  }
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 400 })
  }

  // Get or create config to read cursor
  const config = await prisma.slackSyncConfig.upsert({
    where: { channelId },
    create: { channelId },
    update: {},
  })

  // Create analysis run
  const run = await prisma.slackAnalysisRun.create({
    data: {
      channelId,
      channelName: config.channelName ?? channelId,
      isDryRun,
      status: 'RUNNING',
    },
  })

  try {
    // ── Step 1: Resolve channel name ─────────────────────────────────────
    const channelName = config.channelName ?? (await getChannelName(channelId))
    if (!config.channelName) {
      await prisma.slackSyncConfig.update({
        where: { channelId },
        data: { channelName },
      })
    }

    // ── Step 2: Fetch messages from Slack ────────────────────────────────
    const { ingested, newCursor } = await ingestChannel(channelId, config.cursor)

    // ── Step 3: Store raw messages (idempotent upsert) ───────────────────
    let messagesSkipped = 0
    let messagesAnalyzed = 0

    for (const msg of ingested) {
      try {
        await prisma.slackMessage.upsert({
          where: { slackTimestamp_channelId: { slackTimestamp: msg.ts, channelId } },
          create: {
            analysisRunId: run.id,
            slackTimestamp: msg.ts,
            channelId,
            channelName,
            authorName: msg.displayName,
            authorId: msg.userId ?? undefined,
            rawText: msg.text,
            threadTs: msg.threadTs ?? undefined,
          },
          update: {}, // no-op if already stored
        })
        messagesAnalyzed++
      } catch {
        messagesSkipped++
      }
    }

    // ── Step 4: Load DB context for AI ───────────────────────────────────
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
        take: 100,
      }),
    ])

    const context = buildContext(clients, vas, openItems)

    // ── Step 5: AI extraction in batches ─────────────────────────────────
    // Group thread replies with their parent for context
    const parentMessages = ingested.filter((m) => !m.isThreadReply)
    const replyMap = new Map<string, typeof ingested>()
    for (const m of ingested) {
      if (m.isThreadReply && m.threadTs) {
        const arr = replyMap.get(m.threadTs) ?? []
        arr.push(m)
        replyMap.set(m.threadTs, arr)
      }
    }

    // Build grouped batches: parent + its replies form one unit
    const grouped: (typeof ingested)[] = []
    for (const parent of parentMessages) {
      const thread = [parent, ...(replyMap.get(parent.ts) ?? [])]
      grouped.push(thread)
    }

    // Flatten into batches of BATCH_SIZE messages
    const batches: (typeof ingested)[] = []
    let currentBatch: typeof ingested = []
    for (const thread of grouped) {
      if (currentBatch.length + thread.length > BATCH_SIZE && currentBatch.length > 0) {
        batches.push(currentBatch)
        currentBatch = []
      }
      currentBatch.push(...thread)
    }
    if (currentBatch.length > 0) batches.push(currentBatch)

    // ── Step 6: Process each batch ───────────────────────────────────────
    let newItemsDetected = 0
    let updatesDetected = 0
    let completionsDetected = 0
    let itemsFlaggedForReview = 0

    for (const batch of batches) {
      const proposals = await extractFromMessages(batch, context)

      for (const proposal of proposals) {
        if (proposal.action === 'INFORMATIONAL') continue

        // Dedup: skip if a PENDING dry-run review with same sourceTimestamp exists
        const existing = await prisma.reviewItem.findFirst({
          where: {
            sourceTimestamp: proposal.sourceTimestamp,
            isDryRun: true,
            status: 'PENDING',
          },
        })
        if (existing) continue

        // Map action to reviewType
        const reviewType = proposal.reviewType ?? 'MEDIUM_CONFIDENCE_EXTRACTION'

        await prisma.reviewItem.create({
          data: {
            analysisRunId: run.id,
            openItemId: proposal.proposedData.openItemId ?? undefined,
            isDryRun,
            reviewType,
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
          },
        })

        // Tally stats
        if (proposal.action === 'CREATE_ITEM') newItemsDetected++
        else if (proposal.action === 'COMPLETE_ITEM') completionsDetected++
        else if (
          ['UPDATE_ITEM', 'DEADLINE_CHANGE', 'OWNER_CHANGE', 'FLAG_BLOCKER'].includes(proposal.action)
        ) updatesDetected++

        if (proposal.confidence !== 'HIGH') itemsFlaggedForReview++
      }
    }

    // ── Step 7: Update cursor and finalize ───────────────────────────────
    if (newCursor) {
      await prisma.slackSyncConfig.update({
        where: { channelId },
        data: { cursor: newCursor, lastSyncAt: new Date() },
      })
    }

    await prisma.slackAnalysisRun.update({
      where: { id: run.id },
      data: {
        channelName,
        lastCursorTimestamp: newCursor ?? undefined,
        messagesAnalyzed,
        messagesSkipped,
        newItemsDetected,
        updatesDetected,
        completionsDetected,
        itemsCreated: 0, // dry-run never creates
        itemsUpdated: 0,
        itemsCompleted: 0,
        itemsFlaggedForReview,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      runId: run.id,
      isDryRun,
      messagesAnalyzed,
      messagesSkipped,
      newItemsDetected,
      updatesDetected,
      completionsDetected,
      itemsFlaggedForReview,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await prisma.slackAnalysisRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', errorLog: msg, completedAt: new Date() },
    })
    console.error('Slack sync error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
