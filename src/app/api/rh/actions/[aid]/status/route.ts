import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { aid: string } }
) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const action = await prisma.rHAction.findUnique({ where: { id: params.aid } })
    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'COMPLETED') updateData.completedAt = new Date()

    const updated = await prisma.rHAction.update({
      where: { id: params.aid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/actions/[aid]/status]', err)
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 })
  }
}
