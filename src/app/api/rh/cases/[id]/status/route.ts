import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, reason, changedBy } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const REQUIRES_REASON = ['ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED']
    if (REQUIRES_REASON.includes(status) && !reason) {
      return NextResponse.json(
        { error: `A reason is required when changing status to ${status}` },
        { status: 400 }
      )
    }

    const existing = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    if (existing.status === status) {
      return NextResponse.json(existing)
    }

    const [updated] = await prisma.$transaction([
      prisma.rHCase.update({
        where: { id: params.id },
        data: { status },
      }),
      prisma.rHStatusHistory.create({
        data: {
          caseId: params.id,
          fromStatus: existing.status,
          toStatus: status,
          reason: reason || null,
          changedBy: changedBy || 'Unknown',
        },
      }),
      prisma.rHAuditLog.create({
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
      }),
    ])

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/cases/[id]/status]', err)
    return NextResponse.json({ error: 'Failed to update case status' }, { status: 500 })
  }
}
