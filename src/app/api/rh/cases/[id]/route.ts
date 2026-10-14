export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const STATUSES_REQUIRING_REASON = ['ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rhCase = await prisma.rHCase.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
        scenarios: {
          include: { scenario: true },
          orderBy: { addedAt: 'asc' },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            _count: { select: { responses: true } },
          },
        },
        rootCauses: { orderBy: { createdAt: 'asc' } },
        escalation: true,
        _count: {
          select: {
            actions: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
            followUps: { where: { status: 'PENDING' } },
          },
        },
      },
    })

    if (!rhCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...rhCase,
      openActionsCount: rhCase._count.actions,
      pendingFollowUpsCount: rhCase._count.followUps,
    })
  } catch (error) {
    console.error('RH Case GET error:', error)
    return NextResponse.json({ error: 'Failed to load case' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { changedBy, statusReason, ...updateFields } = body

    if (!changedBy) {
      return NextResponse.json({ error: 'changedBy is required' }, { status: 400 })
    }

    const existing = await prisma.rHCase.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const newStatus = updateFields.status
    if (newStatus && newStatus !== existing.status) {
      if (STATUSES_REQUIRING_REASON.includes(newStatus) && !statusReason) {
        return NextResponse.json(
          { error: `statusReason is required when transitioning to ${newStatus}` },
          { status: 400 }
        )
      }
    }

    const dataToUpdate: Record<string, unknown> = { ...updateFields }
    if (updateFields.dateIdentified) dataToUpdate.dateIdentified = new Date(updateFields.dateIdentified)
    if (updateFields.nextReviewDate) dataToUpdate.nextReviewDate = new Date(updateFields.nextReviewDate)
    if (updateFields.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
      dataToUpdate.resolvedAt = new Date()
    }
    if (updateFields.status === 'CLOSED' && existing.status !== 'CLOSED') {
      dataToUpdate.closedAt = new Date()
    }
    if (statusReason) dataToUpdate.statusReason = statusReason

    const updated = await prisma.rHCase.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    if (newStatus && newStatus !== existing.status) {
      await prisma.rHStatusHistory.create({
        data: {
          caseId: params.id,
          fromStatus: existing.status,
          toStatus: newStatus,
          reason: statusReason ?? null,
          changedBy,
        },
      })

      await prisma.rHAuditLog.create({
        data: {
          caseId: params.id,
          entityType: 'CASE',
          entityId: params.id,
          action: 'STATUS_CHANGE',
          field: 'status',
          oldValue: existing.status,
          newValue: newStatus,
          changedBy,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('RH Case PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
