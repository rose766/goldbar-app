export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalActiveCases,
      casesNeedingAttention,
      assessmentsPending,
      openActions,
      overdueActions,
      followUpsDueToday,
      followUpsOverdue,
      awaitingLeadership,
      resolvedThisMonth,
      reopenedCases,
      recentStatusHistory,
      priorityQueue,
      upcomingFollowUps,
      overdueActionsList,
    ] = await Promise.all([
      prisma.rHCase.count({
        where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
      }),
      prisma.rHCase.count({
        where: { status: { in: ['AWAITING_ASSESSMENT', 'ESCALATED', 'RESTAFFING_UNDER_REVIEW'] } },
      }),
      prisma.rHAssessment.count({
        where: { status: 'DRAFT' },
      }),
      prisma.rHAction.count({
        where: { status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
      }),
      prisma.rHAction.count({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      prisma.rHFollowUp.count({
        where: {
          dueDate: { gte: todayStart, lt: todayEnd },
          status: 'PENDING',
        },
      }),
      prisma.rHFollowUp.count({
        where: {
          dueDate: { lt: todayStart },
          status: 'PENDING',
        },
      }),
      prisma.rHEscalation.count({
        where: { status: 'PENDING' },
      }),
      prisma.rHCase.count({
        where: {
          resolvedAt: { gte: monthStart },
        },
      }),
      prisma.rHCase.count({
        where: { status: 'REOPENED' },
      }),
      prisma.rHStatusHistory.findMany({
        take: 10,
        orderBy: { changedAt: 'desc' },
        include: {
          case: {
            select: {
              caseNumber: true,
              title: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rHCase.findMany({
        where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
        take: 10,
        orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          caseNumber: true,
          title: true,
          severity: true,
          status: true,
          nextReviewDate: true,
          client: { select: { name: true } },
          va: { select: { name: true } },
        },
      }),
      prisma.rHFollowUp.findMany({
        where: { status: 'PENDING' },
        take: 10,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          purpose: true,
          dueDate: true,
          dueTime: true,
          assignedTo: true,
          case: {
            select: {
              caseNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rHAction.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        select: {
          id: true,
          actionNumber: true,
          title: true,
          dueDate: true,
          assignedTo: true,
          case: {
            select: {
              caseNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      metrics: {
        totalActiveCases,
        casesNeedingAttention,
        assessmentsPending,
        openActions,
        overdueActions,
        followUpsDueToday,
        followUpsOverdue,
        awaitingLeadership,
        resolvedThisMonth,
        reopenedCases,
      },
      recentActivity: recentStatusHistory.map((h) => ({
        id: h.id,
        type: 'STATUS_CHANGE',
        caseNumber: h.case.caseNumber,
        caseTitle: h.case.title,
        clientName: h.case.client.name,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
        changedAt: h.changedAt,
      })),
      priorityQueue: priorityQueue.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        severity: c.severity,
        status: c.status,
        clientName: c.client.name,
        vaName: c.va?.name ?? null,
        nextReviewDate: c.nextReviewDate,
      })),
      upcomingFollowUps: upcomingFollowUps.map((f) => ({
        id: f.id,
        purpose: f.purpose,
        dueDate: f.dueDate,
        dueTime: f.dueTime,
        assignedTo: f.assignedTo,
        caseNumber: f.case.caseNumber,
        clientName: f.case.client.name,
      })),
      overdueActionsList: overdueActionsList.map((a) => ({
        id: a.id,
        actionNumber: a.actionNumber,
        title: a.title,
        dueDate: a.dueDate,
        assignedTo: a.assignedTo,
        caseNumber: a.case.caseNumber,
        clientName: a.case.client.name,
      })),
    })
  } catch (error) {
    console.error('RH Dashboard GET error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
