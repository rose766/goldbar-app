import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    const body = await request.json()
    const { outcome } = body

    const followUp = await prisma.rHFollowUp.findUnique({ where: { id: params.fid } })
    if (!followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }

    const updated = await prisma.rHFollowUp.update({
      where: { id: params.fid },
      data: {
        status: 'COMPLETED',
        outcome: outcome || null,
        completedAt: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/follow-ups/[fid]/complete]', err)
    return NextResponse.json({ error: 'Failed to complete follow-up' }, { status: 500 })
  }
}
