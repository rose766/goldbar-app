export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestWorkspace } from '@/lib/slack-workspace'

const PRESET_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

function toSlackTimestamp(date: Date): string {
  return (date.getTime() / 1000).toFixed(6)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!process.env.SLACK_BOT_TOKEN) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN is not configured' }, { status: 400 })
  }

  const channel = await prisma.slackChannel.findUnique({ where: { id: params.id } })
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }
  if (!channel.isAccessible) {
    return NextResponse.json({ error: 'Channel is not accessible to the bot' }, { status: 400 })
  }
  if (channel.classification === 'EXCLUDED') {
    return NextResponse.json({ error: 'Channel is excluded from ingestion' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))

  // Resolve since timestamp from preset or explicit ISO string
  let sinceTimestamp: string | undefined
  if (body.sincePreset === 'full') {
    sinceTimestamp = undefined // fetch all history
  } else if (typeof body.sincePreset === 'string' && PRESET_DAYS[body.sincePreset]) {
    const daysBack = PRESET_DAYS[body.sincePreset]
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    sinceTimestamp = toSlackTimestamp(since)
  } else if (typeof body.sinceTimestamp === 'string') {
    // Accept ISO string or raw Slack timestamp
    const parsed = parseFloat(body.sinceTimestamp)
    if (!isNaN(parsed)) {
      sinceTimestamp = body.sinceTimestamp
    } else {
      const date = new Date(body.sinceTimestamp)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid sinceTimestamp — provide Slack Unix timestamp or ISO date string' }, { status: 400 })
      }
      sinceTimestamp = toSlackTimestamp(date)
    }
  } else {
    return NextResponse.json(
      { error: 'Provide sincePreset (7d | 30d | 90d | full) or sinceTimestamp (ISO string or Slack ts)' },
      { status: 400 }
    )
  }

  try {
    // Backfill: ingest with sinceTimestamp override, does NOT advance cursor
    const result = await ingestWorkspace({
      channelIds: [channel.slackChannelId],
      sinceTimestamp,
      isBackfill: true,
    })

    const channelResult = result.results[0]

    return NextResponse.json({
      success: true,
      isBackfill: true,
      sinceTimestamp: sinceTimestamp ?? 'full',
      channelId: channel.slackChannelId,
      channelName: channel.channelName,
      result: channelResult,
      totalMessagesIngested: result.totalMessagesIngested,
      note: 'Backfill stores messages only. Run a channel sync to trigger AI analysis.',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
