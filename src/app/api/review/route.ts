import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [items, count] = await Promise.all([
      prisma.reviewItem.findMany({
        where: { status: 'PENDING' },
        include: {
          openItem: {
            select: {
              id: true,
              title: true,
              client: { select: { id: true, name: true } },
              va: { select: { id: true, name: true } },
            },
          },
          analysisRun: { select: { id: true, runDate: true, channelName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reviewItem.count({ where: { status: 'PENDING' } }),
    ])

    return NextResponse.json({ items, count })
  } catch (error) {
    console.error('Review GET error:', error)
    return NextResponse.json({ error: 'Failed to load review items' }, { status: 500 })
  }
}
