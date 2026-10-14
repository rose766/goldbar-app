export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fid: string } }
) {
  try {
    const body = await request.json()
    const { status, outcome, nextStep, notes, dueDate, dueTime } = body

    const followUp = await prisma.rHFollowUp.findFirst({
      where: { id: params.fid, caseId: params.id },
    })
    if (!followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (outcome !== undefined) updateData.outcome = outcome
    if (nextStep !== undefined) updateData.nextStep = nextStep
    if (notes !== undefined) updateData.notes = notes
    if (dueDate) updateData.dueDate = new Date(dueDate)
    if (dueTime !== undefined) updateData.dueTime = dueTime

    if ((status === 'COMPLETED' || status === 'SKIPPED') && !followUp.completedAt) {
      updateData.completedAt = new Date()
    }

    const updated = await prisma.rHFollowUp.update({
      where: { id: params.fid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Follow-up PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}
