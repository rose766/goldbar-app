import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { purpose, assignedTo, dueDate, checkType } = body

    if (!purpose || !assignedTo || !dueDate) {
      return NextResponse.json({ error: 'purpose, assignedTo, and dueDate are required' }, { status: 400 })
    }

    const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!rhCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const followUp = await prisma.rHFollowUp.create({
      data: {
        caseId: params.id,
        purpose,
        assignedTo,
        dueDate: new Date(dueDate),
        checkType: checkType || 'VA_CHECKIN',
        status: 'PENDING',
        createdBy: 'Rose',
      },
    })

    return NextResponse.json(followUp, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rh/cases/[id]/follow-ups]', err)
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 })
  }
}
