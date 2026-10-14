import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description, assignedRole, assignedTo, dueDate, priority, taskOwner, followUpOwner } = body

    if (!title || !assignedRole || !priority) {
      return NextResponse.json({ error: 'title, assignedRole, and priority are required' }, { status: 400 })
    }

    const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!rhCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Generate action number
    const counter = await prisma.rHActionCounter.upsert({
      where: { id: 1 },
      create: { id: 1, lastNum: 1 },
      update: { lastNum: { increment: 1 } },
    })
    const actionNumber = `A-${String(counter.lastNum).padStart(5, '0')}`

    const action = await prisma.rHAction.create({
      data: {
        actionNumber,
        caseId: params.id,
        title,
        description: description || null,
        assignedRole,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'NOT_STARTED',
        createdBy: 'Rose',
      },
    })

    return NextResponse.json(action, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rh/cases/[id]/actions]', err)
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 })
  }
}
