export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actions = await prisma.rHAction.findMany({
      where: { caseId: params.id },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(actions)
  } catch (error) {
    console.error('Actions GET error:', error)
    return NextResponse.json({ error: 'Failed to load actions' }, { status: 500 })
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
      description,
      assignedRole,
      assignedTo,
      dueDate,
      priority,
      expectedResult,
      createdBy,
      relatedScenarioId,
    } = body

    if (!title || !assignedRole || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: title, assignedRole, createdBy' },
        { status: 400 }
      )
    }

    const counter = await prisma.rHActionCounter.upsert({
      where: { id: 1 },
      update: { lastNum: { increment: 1 } },
      create: { id: 1, lastNum: 1 },
    })
    const actionNumber = `A-${String(counter.lastNum).padStart(5, '0')}`

    const action = await prisma.rHAction.create({
      data: {
        caseId: params.id,
        actionNumber,
        title,
        description: description ?? null,
        assignedRole,
        assignedTo: assignedTo ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? 'MEDIUM',
        expectedResult: expectedResult ?? null,
        createdBy,
        relatedScenarioId: relatedScenarioId ?? null,
      },
    })

    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    console.error('Actions POST error:', error)
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 })
  }
}
