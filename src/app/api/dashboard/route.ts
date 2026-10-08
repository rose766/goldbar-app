export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const [
      totalClients,
      totalVAs,
      openItems,
      overdueItems,
      dueSoonItems,
      blockedItems,
      missingDeadlines,
      missingOwners,
      myFollowUps,
      atRiskClients,
      needsAttentionClients,
      pendingReviews,
      staleItems,
      lastDocSync,
    ] = await Promise.all([
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.vA.count({ where: { status: 'ACTIVE' } }),
      prisma.openItem.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.openItem.count({
        where: { isOverdue: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.openItem.count({
        where: { isDueSoon: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.openItem.count({
        where: { status: 'BLOCKED' },
      }),
      prisma.openItem.count({
        where: { isMissingDeadline: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.openItem.count({
        where: { isMissingOwner: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.openItem.count({
        where: { amFollowUp: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.client.count({ where: { health: 'AT_RISK' } }),
      prisma.client.count({ where: { health: 'NEEDS_ATTENTION' } }),
      prisma.reviewItem.count({ where: { status: 'PENDING' } }),
      prisma.openItem.count({
        where: { isStale: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      prisma.sourceDocument.findFirst({
        orderBy: { lastProcessedAt: 'desc' },
        select: { lastProcessedAt: true, processingStatus: true },
        where: { lastProcessedAt: { not: null } },
      }),
    ])

    const syncStatus: 'ok' | 'never' = lastDocSync ? 'ok' : 'never'
    const lastSync: Date | null = lastDocSync?.lastProcessedAt ?? null

    return NextResponse.json({
      totalClients,
      totalVAs,
      openItems,
      overdueItems,
      dueSoonItems,
      blockedItems,
      missingDeadlines,
      missingOwners,
      myFollowUps,
      atRiskClients,
      needsAttentionClients,
      pendingReviews,
      staleItems,
      lastSync,
      syncStatus,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 })
  }
}
