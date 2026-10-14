export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  try {
    const plan = await prisma.rHCoachingPlan.findFirst({
      where: { id: params.pid, caseId: params.id },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Coaching plan not found' }, { status: 404 })
    }
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Coaching plan GET error:', error)
    return NextResponse.json({ error: 'Failed to load coaching plan' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  try {
    const body = await request.json()
    const { status, approvedBy, vaActions, clientActions, amActions, startDate, targetEndDate, ...rest } = body

    const plan = await prisma.rHCoachingPlan.findFirst({
      where: { id: params.pid, caseId: params.id },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Coaching plan not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...rest }
    if (vaActions !== undefined) updateData.vaActions = JSON.stringify(vaActions)
    if (clientActions !== undefined) updateData.clientActions = JSON.stringify(clientActions)
    if (amActions !== undefined) updateData.amActions = JSON.stringify(amActions)
    if (startDate) updateData.startDate = new Date(startDate)
    if (targetEndDate) updateData.targetEndDate = new Date(targetEndDate)

    if (status) {
      updateData.status = status
      if (status === 'APPROVED') {
        if (!approvedBy) {
          return NextResponse.json({ error: 'approvedBy is required when approving a plan' }, { status: 400 })
        }
        updateData.approvedBy = approvedBy
        updateData.approvedAt = new Date()

        // Supersede previous approved plans
        await prisma.rHCoachingPlan.updateMany({
          where: {
            caseId: params.id,
            status: 'APPROVED',
            id: { not: params.pid },
          },
          data: { status: 'SUPERSEDED' },
        })
      }
    }

    const updated = await prisma.rHCoachingPlan.update({
      where: { id: params.pid },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Coaching plan PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update coaching plan' }, { status: 500 })
  }
}
