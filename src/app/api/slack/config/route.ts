export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const channelId = process.env.SLACK_CHANNEL_ID
    if (!channelId) {
      return NextResponse.json({ configured: false, reason: 'SLACK_CHANNEL_ID not set' })
    }

    const config = await prisma.slackSyncConfig.findUnique({
      where: { channelId },
    })

    const lastRun = await prisma.slackAnalysisRun.findFirst({
      where: { channelId, isDryRun: true },
      orderBy: { runDate: 'desc' },
      select: {
        id: true,
        runDate: true,
        status: true,
        messagesAnalyzed: true,
        messagesSkipped: true,
        newItemsDetected: true,
        updatesDetected: true,
        completionsDetected: true,
        itemsFlaggedForReview: true,
        errorLog: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      configured: true,
      channelId,
      channelName: config?.channelName ?? null,
      cursor: config?.cursor ?? null,
      isEnabled: config?.isEnabled ?? false,
      lastSyncAt: config?.lastSyncAt ?? null,
      lastRun,
    })
  } catch (error) {
    console.error('Slack config GET error:', error)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { isEnabled, resetCursor } = body

    const channelId = process.env.SLACK_CHANNEL_ID
    if (!channelId) {
      return NextResponse.json({ error: 'SLACK_CHANNEL_ID not set' }, { status: 400 })
    }

    const config = await prisma.slackSyncConfig.upsert({
      where: { channelId },
      create: {
        channelId,
        isEnabled: isEnabled ?? false,
        cursor: null,
      },
      update: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(resetCursor && { cursor: null }),
      },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Slack config POST error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
