export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_CLASSIFICATIONS = new Set([
  'CLIENT', 'INTERNAL', 'OPERATIONS', 'STAFFING', 'HR',
  'LEADERSHIP', 'TRAINING', 'SOCIAL', 'OTHER', 'EXCLUDED',
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const channel = await prisma.slackChannel.findUnique({ where: { id: params.id } })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const update: Parameters<typeof prisma.slackChannel.update>[0]['data'] = {}

    if (typeof body.enabled === 'boolean') update.enabled = body.enabled
    if (typeof body.ingestionEnabled === 'boolean') update.ingestionEnabled = body.ingestionEnabled
    if (typeof body.analysisEnabled === 'boolean') {
      // Cannot enable analysis on an excluded or inaccessible channel
      if (body.analysisEnabled && (channel.classification === 'EXCLUDED' || !channel.isAccessible)) {
        return NextResponse.json(
          { error: 'Cannot enable analysis on an excluded or inaccessible channel' },
          { status: 400 }
        )
      }
      update.analysisEnabled = body.analysisEnabled
    }

    if (typeof body.classification === 'string') {
      if (!VALID_CLASSIFICATIONS.has(body.classification)) {
        return NextResponse.json({ error: `Invalid classification: ${body.classification}` }, { status: 400 })
      }
      update.classification = body.classification
      // Disabling analysis when channel is excluded
      if (body.classification === 'EXCLUDED') {
        update.analysisEnabled = false
        update.ingestionEnabled = false
      }
    }

    if (body.resetCursor === true) {
      update.cursor = null
      update.lastSyncAt = null
      update.lastSuccessfulSyncAt = null
    }

    if (body.clearError === true) {
      update.lastError = null
    }

    const updated = await prisma.slackChannel.update({
      where: { id: params.id },
      data: update,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Channel PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channel = await prisma.slackChannel.findUnique({
      where: { id: params.id },
      include: {
        analysisRuns: {
          orderBy: { runDate: 'desc' },
          take: 5,
          select: {
            id: true, runDate: true, status: true, messagesAnalyzed: true,
            itemsFlaggedForReview: true, isDryRun: true, errorLog: true, completedAt: true,
          },
        },
      },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const messageCount = await prisma.slackMessage.count({
      where: { channelId: channel.slackChannelId },
    })

    const pendingProposals = await prisma.reviewItem.count({
      where: {
        sourceTimestamp: { not: null },
        isDryRun: true,
        status: 'PENDING',
        analysisRun: { slackChannelDbId: channel.id },
      },
    })

    return NextResponse.json({ channel, messageCount, pendingProposals })
  } catch (error) {
    console.error('Channel GET error:', error)
    return NextResponse.json({ error: 'Failed to load channel' }, { status: 500 })
  }
}
