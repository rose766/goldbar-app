import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; fid: string } }
) {
  try {
    const body = await request.json()
    const { status, outcome, nextStep } = body

    const followUp = await prisma.rHFollowUp.findUnique({ where: { id: params.fid } })
    if (!followUp || followUp.caseId !== params.id) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (outcome !== undefined) updateData.outcome = outcome
    if (nextStep !== undefined) updateData.nextStep = nextStep
    if (status === 'COMPLETED') updateData.completedAt = new Date()

    const updated = await prisma.rHFollowUp.update({
      where: { id: params.fid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/cases/[id]/follow-ups/[fid]]', err)
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 })
  }
}
