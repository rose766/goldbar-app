import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()

    const items = await prisma.openItem.findMany({
      where: {
        isOverdue: true,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
      orderBy: [{ deadline: 'asc' }, { priority: 'asc' }],
    })

    const itemsWithDaysOverdue = items.map((item) => {
      const daysOverdue = item.deadline
        ? Math.floor((now.getTime() - item.deadline.getTime()) / (1000 * 60 * 60 * 24))
        : 0
      return { ...item, daysOverdue }
    })

    return NextResponse.json(itemsWithDaysOverdue)
  } catch (error) {
    console.error('Overdue GET error:', error)
    return NextResponse.json({ error: 'Failed to load overdue items' }, { status: 500 })
  }
}
