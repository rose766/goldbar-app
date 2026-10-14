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

    const [actions, total] = await Promise.all([
      prisma.rHAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        include: {
          case: {
            select: {
              caseNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      }),
      prisma.rHAction.count({ where }),
    ])

    return NextResponse.json({
      actions: actions.map((a) => ({
        ...a,
        caseNumber: a.case.caseNumber,
        clientName: a.case.client.name,
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
    console.error('Actions (global) GET error:', error)
    return NextResponse.json({ error: 'Failed to load actions' }, { status: 500 })
  }
}
