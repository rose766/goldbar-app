export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Latest dry-run analysis run
    const lastRun = await prisma.slackAnalysisRun.findFirst({
      where: { isDryRun: true },
      orderBy: { runDate: 'desc' },
      select: {
        id: true,
        runDate: true,
        status: true,
        channelName: true,
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

    // All pending dry-run proposals
    const proposals = await prisma.reviewItem.findMany({
      where: { isDryRun: true, status: 'PENDING' },
      include: {
        openItem: {
          select: {
            id: true,
            title: true,
            status: true,
            client: { select: { name: true } },
            va: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { aiConfidence: 'asc' }, // NEEDS_REVIEW first
        { createdAt: 'desc' },
      ],
    })

    // Summary counts for reviewed proposals
    const reviewed = await prisma.reviewItem.groupBy({
      by: ['status'],
      where: { isDryRun: true, status: { not: 'PENDING' } },
      _count: { status: true },
    })

    // Workspace status (replaces old SlackSyncConfig)
    const workspace = await prisma.slackWorkspace.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        teamId: true,
        teamName: true,
        teamDomain: true,
        totalChannels: true,
        accessibleChannels: true,
        lastDiscoveredAt: true,
        lastSyncAt: true,
      },
    })

    const ingestionEnabledCount = await prisma.slackChannel.count({
      where: { ingestionEnabled: true, enabled: true },
    })

    return NextResponse.json({
      lastRun,
      proposals: proposals.map((p) => ({
        id: p.id,
        reviewType: p.reviewType,
        status: p.status,
        isDryRun: p.isDryRun,
        aiConfidence: p.aiConfidence,
        proposedAction: p.proposedAction,
        aiInterpretation: p.aiInterpretation,
        proposedData: (() => {
          try { return JSON.parse(p.proposedData) } catch { return {} }
        })(),
        sourceMessage: p.sourceMessage,
        sourceTimestamp: p.sourceTimestamp,
        sourceLink: p.sourceLink,
        linkedItem: p.openItem,
        createdAt: p.createdAt,
      })),
      reviewedCounts: reviewed.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = r._count.status
        return acc
      }, {}),
      workspace: workspace ?? null,
      ingestionEnabledChannels: ingestionEnabledCount,
    })
  } catch (error) {
    console.error('Slack preview GET error:', error)
    return NextResponse.json({ error: 'Failed to load preview data' }, { status: 500 })
  }
}
