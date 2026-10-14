export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const followUps = await prisma.rHFollowUp.findMany({
      where: { caseId: params.id },
      orderBy: { dueDate: 'asc' },
    })
    return NextResponse.json(followUps)
  } catch (error) {
    console.error('Follow-ups GET error:', error)
    return NextResponse.json({ error: 'Failed to load follow-ups' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { purpose, assignedTo, dueDate, dueTime, checkType, notes, createdBy } = body

    if (!purpose || !assignedTo || !dueDate || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: purpose, assignedTo, dueDate, createdBy' },
        { status: 400 }
      )
    }

    const followUp = await prisma.rHFollowUp.create({
      data: {
        caseId: params.id,
        purpose,
        assignedTo,
        dueDate: new Date(dueDate),
        dueTime: dueTime ?? null,
        checkType: checkType ?? null,
        notes: notes ?? null,
        createdBy,
      },
    })

    return NextResponse.json(followUp, { status: 201 })
  } catch (error) {
    console.error('Follow-ups POST error:', error)
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}
