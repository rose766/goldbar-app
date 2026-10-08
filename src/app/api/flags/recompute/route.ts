export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeItemFlags, calculateClientHealth } from '@/lib/health'
import { differenceInDays } from 'date-fns'

export async function POST() {
  try {
    // Load all non-completed items with their client's staleThresholdDays
    const items = await prisma.openItem.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: {
        client: { select: { staleThresholdDays: true, lastSlackSync: true } },
      },
    })

    let updatedCount = 0

    for (const item of items) {
      const flags = computeItemFlags({
        deadline: item.deadline,
        status: item.status,
        lastConfirmed: item.lastConfirmed,
        staleThresholdDays: item.client?.staleThresholdDays ?? 5,
        owner: item.owner,
        nextStep: item.nextStep,
      })

      // Only update if something changed
      if (
        flags.isOverdue !== item.isOverdue ||
        flags.isDueSoon !== item.isDueSoon ||
        flags.isStale !== item.isStale ||
        flags.isMissingDeadline !== item.isMissingDeadline ||
        flags.isMissingOwner !== item.isMissingOwner ||
        flags.isMissingNextStep !== item.isMissingNextStep
      ) {
        await prisma.openItem.update({
          where: { id: item.id },
          data: flags,
        })
        updatedCount++
      }
    }

    // Recompute client health for all active clients
    const clients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      include: {
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: {
            isOverdue: true,
            isStale: true,
            isMissingDeadline: true,
            status: true,
            waitingSince: true,
          },
        },
        vas: {
          select: { performanceFlags: true },
        },
      },
    })

    for (const client of clients) {
      const overdueCount = client.openItems.filter((i) => i.isOverdue).length
      const blockedCount = client.openItems.filter((i) => i.status === 'BLOCKED').length
      const missingDeadlineCount = client.openItems.filter((i) => i.isMissingDeadline).length
      const staleItemCount = client.openItems.filter((i) => i.isStale).length

      // Max days waiting on client
      const now = new Date()
      const waitingOnClientItems = client.openItems.filter(
        (i) => i.status === 'WAITING_ON_CLIENT' && i.waitingSince
      )
      const waitingOnClientDays =
        waitingOnClientItems.length > 0
          ? Math.max(
              ...waitingOnClientItems.map((i) =>
                differenceInDays(now, i.waitingSince!)
              )
            )
          : 0

      const performanceFlagCount = client.vas.reduce((sum, va) => {
        try {
          const flags = va.performanceFlags ? JSON.parse(va.performanceFlags) : []
          return sum + (Array.isArray(flags) ? flags.length : 0)
        } catch {
          return sum
        }
      }, 0)

      const pendingReviewCount = await prisma.reviewItem.count({
        where: {
          status: 'PENDING',
          openItem: { clientId: client.id },
        },
      })

      const { health, reasons } = calculateClientHealth({
        overdueCount,
        blockedCount,
        missingDeadlineCount,
        staleItemCount,
        waitingOnClientDays,
        unresolvedClientIssues: 0,
        performanceFlagCount,
        repeatedMissedCommitments: 0,
        pendingReviewCount,
        lastSlackSync: client.lastSlackSync,
      })

      const oldHealth = client.health

      await prisma.client.update({
        where: { id: client.id },
        data: {
          health,
          healthReasons: JSON.stringify(reasons),
        },
      })

      // Record health history if it changed
      if (health !== oldHealth) {
        await prisma.clientHealthHistory.create({
          data: {
            clientId: client.id,
            fromHealth: oldHealth,
            toHealth: health,
            reasons: JSON.stringify(reasons),
            source: 'flags/recompute',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      itemsUpdated: updatedCount,
      clientsRecomputed: clients.length,
    })
  } catch (error) {
    console.error('Flags recompute error:', error)
    return NextResponse.json({ error: 'Failed to recompute flags' }, { status: 500 })
  }
}
