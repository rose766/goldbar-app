export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const workspace = await prisma.slackWorkspace.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const channelStats = await prisma.slackChannel.groupBy({
      by: ['ingestionEnabled', 'analysisEnabled', 'isArchived', 'classification', 'isAccessible'],
      _count: { id: true },
    })

    const allChannels = await prisma.slackChannel.count()
    const accessibleChannels = await prisma.slackChannel.count({ where: { isAccessible: true } })
    const excludedChannels = await prisma.slackChannel.count({ where: { classification: 'EXCLUDED' } })
    const ingestionEnabled = await prisma.slackChannel.count({ where: { ingestionEnabled: true, enabled: true } })
    const analysisEnabled = await prisma.slackChannel.count({ where: { analysisEnabled: true, enabled: true } })
    const errorChannels = await prisma.slackChannel.count({ where: { lastError: { not: null } } })

    const [totalMessages, pendingProposals, lastRun] = await Promise.all([
      prisma.slackMessage.count(),
      prisma.reviewItem.count({ where: { isDryRun: true, status: 'PENDING' } }),
      prisma.slackAnalysisRun.findFirst({
        where: { isDryRun: true },
        orderBy: { runDate: 'desc' },
        select: { id: true, runDate: true, status: true, channelName: true, messagesAnalyzed: true, itemsFlaggedForReview: true },
      }),
    ])

    const channelsWithErrors = await prisma.slackChannel.findMany({
      where: { lastError: { not: null } },
      select: { slackChannelId: true, channelName: true, lastError: true, lastSyncAt: true },
      take: 10,
    })

    return NextResponse.json({
      configured: !!process.env.SLACK_BOT_TOKEN,
      liveSyncEnabled: process.env.SLACK_LIVE_SYNC_ENABLED === 'true',
      workspace,
      stats: {
        allChannels,
        accessibleChannels,
        excludedChannels,
        ingestionEnabled,
        analysisEnabled,
        errorChannels,
        totalMessages,
        pendingProposals,
      },
      lastRun,
      channelsWithErrors,
    })
  } catch (error) {
    console.error('Workspace GET error:', error)
    return NextResponse.json({ error: 'Failed to load workspace status' }, { status: 500 })
  }
}
