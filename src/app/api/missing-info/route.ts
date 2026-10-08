import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.openItem.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        OR: [
          { isMissingDeadline: true },
          { isMissingOwner: true },
          { isMissingNextStep: true },
          { status: 'NEEDS_CLARIFICATION' },
        ],
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })

    // Group by type
    const missingDeadline = items.filter((i) => i.isMissingDeadline)
    const missingOwner = items.filter((i) => i.isMissingOwner)
    const missingNextStep = items.filter((i) => i.isMissingNextStep)
    const needsClarification = items.filter((i) => i.status === 'NEEDS_CLARIFICATION')

    return NextResponse.json({
      missingDeadline,
      missingOwner,
      missingNextStep,
      needsClarification,
      total: items.length,
    })
  } catch (error) {
    console.error('Missing info GET error:', error)
    return NextResponse.json({ error: 'Failed to load missing info items' }, { status: 500 })
  }
}
