export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plans = await prisma.rHCoachingPlan.findMany({
      where: { caseId: params.id },
      orderBy: { version: 'desc' },
    })
    return NextResponse.json(plans)
  } catch (error) {
    console.error('Coaching plans GET error:', error)
    return NextResponse.json({ error: 'Failed to load coaching plans' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      title,
      objective,
      rootCauseExplanation,
      vaActions,
      clientActions,
      amActions,
      successMeasures,
      reviewSchedule,
      contingency,
      startDate,
      targetEndDate,
      createdBy,
    } = body

    if (!title || !objective || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: title, objective, createdBy' },
        { status: 400 }
      )
    }

    const lastPlan = await prisma.rHCoachingPlan.findFirst({
      where: { caseId: params.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (lastPlan?.version ?? 0) + 1

    const plan = await prisma.rHCoachingPlan.create({
      data: {
        caseId: params.id,
        version,
        title,
        objective,
        rootCauseExplanation: rootCauseExplanation ?? null,
        vaActions: vaActions ? JSON.stringify(vaActions) : '[]',
        clientActions: clientActions ? JSON.stringify(clientActions) : '[]',
        amActions: amActions ? JSON.stringify(amActions) : '[]',
        successMeasures: successMeasures ?? null,
        reviewSchedule: reviewSchedule ?? null,
        contingency: contingency ?? null,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        createdBy,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Coaching plans POST error:', error)
    return NextResponse.json({ error: 'Failed to create coaching plan' }, { status: 500 })
  }
}
