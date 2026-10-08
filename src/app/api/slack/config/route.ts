export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Legacy config endpoint — now returns workspace-level status.
// Channel configuration is managed via /api/slack/channels/[id] (PATCH).
export async function GET() {
  try {
    const configured = !!process.env.SLACK_BOT_TOKEN
    const liveSyncEnabled = process.env.SLACK_LIVE_SYNC_ENABLED === 'true'

    const workspace = await prisma.slackWorkspace.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    const [totalChannels, ingestionEnabled, analysisEnabled] = await Promise.all([
      prisma.slackChannel.count(),
      prisma.slackChannel.count({ where: { ingestionEnabled: true, enabled: true } }),
      prisma.slackChannel.count({ where: { analysisEnabled: true, enabled: true } }),
    ])

    const lastRun = await prisma.slackAnalysisRun.findFirst({
      where: { isDryRun: true },
      orderBy: { runDate: 'desc' },
      select: {
        id: true,
        runDate: true,
        status: true,
        messagesAnalyzed: true,
        itemsFlaggedForReview: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      configured,
      liveSyncEnabled,
      isDryRun: !liveSyncEnabled,
      workspace: workspace ?? null,
      channelStats: { totalChannels, ingestionEnabled, analysisEnabled },
      lastRun,
      // Legacy fields for backward compatibility
      channelId: null,
      channelName: workspace?.teamName ?? null,
      cursor: null,
      isEnabled: ingestionEnabled > 0,
      lastSyncAt: workspace?.lastSyncAt ?? null,
    })
  } catch (error) {
    console.error('Slack config GET error:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}
