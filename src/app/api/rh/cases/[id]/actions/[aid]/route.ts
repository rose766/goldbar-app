import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const body = await request.json()
    const { status, blockerReason, blockerOwner, cancelReason, completedAt, completionNotes } = body

    const action = await prisma.rHAction.findUnique({ where: { id: params.aid } })
    if (!action || action.caseId !== params.id) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (blockerReason !== undefined) updateData.blockerReason = blockerReason
    if (blockerOwner !== undefined) updateData.blockerOwner = blockerOwner
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason
    if (completionNotes !== undefined) updateData.completionEvidence = completionNotes
    if (status === 'COMPLETED') updateData.completedAt = completedAt ? new Date(completedAt) : new Date()
    updateData.updatedBy = 'Rose'

    const updated = await prisma.rHAction.update({
      where: { id: params.aid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/cases/[id]/actions/[aid]]', err)
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 })
  }
}
