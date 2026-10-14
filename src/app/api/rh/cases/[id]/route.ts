import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rhCase = await prisma.rHCase.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      va: true,
      scenarios: {
        include: { scenario: true },
        orderBy: { isPrimary: 'desc' },
      },
      assessments: {
        include: { responses: true },
        orderBy: { assessmentDate: 'desc' },
      },
      evidence: { orderBy: { recordedAt: 'desc' } },
      rootCauses: { orderBy: { isPrimary: 'desc' } },
      coachingPlans: { orderBy: { version: 'desc' } },
      actions: { orderBy: { dueDate: 'asc' } },
      followUps: { orderBy: { dueDate: 'asc' } },
      escalation: true,
      aiRecs: { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { changedAt: 'desc' } },
    },
  })

  if (!rhCase) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json(rhCase)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      title, description, severity, status, statusReason, assignedAm,
      clientFeedback, vaFeedback, nextReviewDate, healthStatus, tags,
      changedBy,
    } = body

    const existing = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const REQUIRES_REASON = ['ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED']
    if (status && status !== existing.status && REQUIRES_REASON.includes(status) && !statusReason) {
      return NextResponse.json(
        { error: `statusReason is required when transitioning to ${status}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (severity !== undefined) updateData.severity = severity
    if (assignedAm !== undefined) updateData.assignedAm = assignedAm
    if (clientFeedback !== undefined) updateData.clientFeedback = clientFeedback
    if (vaFeedback !== undefined) updateData.vaFeedback = vaFeedback
    if (nextReviewDate !== undefined) updateData.nextReviewDate = nextReviewDate ? new Date(nextReviewDate) : null
    if (healthStatus !== undefined) updateData.healthStatus = healthStatus
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags

    if (status && status !== existing.status) {
      updateData.status = status

      // Create status history record
      await prisma.rHStatusHistory.create({
        data: {
          caseId: params.id,
          fromStatus: existing.status,
          toStatus: status,
          reason: statusReason || null,
          changedBy: changedBy || 'Unknown',
        },
      })

      // Log audit
      await prisma.rHAuditLog.create({
        data: {
          caseId: params.id,
          entityType: 'CASE',
          entityId: params.id,
          action: 'STATUS_CHANGE',
          field: 'status',
          oldValue: existing.status,
          newValue: status,
          changedBy: changedBy || 'Unknown',
        },
      })
    }

    const updated = await prisma.rHCase.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/cases/[id]]', err)
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 })
  }
}
