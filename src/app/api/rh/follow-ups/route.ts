export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (assignedTo) where.assignedTo = assignedTo
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {}
      if (dueDateFrom) (where.dueDate as Record<string, unknown>).gte = new Date(dueDateFrom)
      if (dueDateTo) (where.dueDate as Record<string, unknown>).lte = new Date(dueDateTo)
    }

    const [followUps, total] = await Promise.all([
      prisma.rHFollowUp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          case: {
            select: {
              caseNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rHFollowUp.count({ where }),
    ])

    return NextResponse.json({
      followUps: followUps.map((f) => ({
        ...f,
        caseNumber: f.case.caseNumber,
        clientName: f.case.client.name,
        case: undefined,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Follow-ups (global) GET error:', error)
    return NextResponse.json({ error: 'Failed to load follow-ups' }, { status: 500 })
  }
}
