export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const body = await request.json()
    const { status, completionEvidence, blockerReason, blockerOwner, blockerFollowUpDate, cancelReason, updatedBy, ...otherFields } = body

    const action = await prisma.rHAction.findFirst({
      where: { id: params.aid, caseId: params.id },
    })
    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...otherFields }

    if (status && status !== action.status) {
      const allowed = VALID_TRANSITIONS[action.status] ?? []
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${action.status} to ${status}` },
          { status: 400 }
        )
      }
      if (status === 'COMPLETED') {
        if (!completionEvidence) {
          return NextResponse.json(
            { error: 'completionEvidence is required when completing an action' },
            { status: 400 }
          )
        }
        updateData.completionEvidence = completionEvidence
        updateData.completedAt = new Date()
      }
      if (status === 'BLOCKED') {
        updateData.blockerReason = blockerReason ?? null
        updateData.blockerOwner = blockerOwner ?? null
        updateData.blockerFollowUpDate = blockerFollowUpDate ? new Date(blockerFollowUpDate) : null
      }
      if (status === 'CANCELLED') {
        updateData.cancelReason = cancelReason ?? null
      }
      updateData.status = status
    }

    if (updatedBy) updateData.updatedBy = updatedBy
    if (otherFields.dueDate) updateData.dueDate = new Date(otherFields.dueDate)

    const updated = await prisma.rHAction.update({
      where: { id: params.aid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Action PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 })
  }
}
