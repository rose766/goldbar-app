export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

export async function GET() {
  try {
    const items = await prisma.openItem.findMany({
      where: {
        amFollowUp: true,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    // Sort: overdue first, then by priority, then by amFollowUpDate
    items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
      const pA = PRIORITY_ORDER[a.priority] ?? 99
      const pB = PRIORITY_ORDER[b.priority] ?? 99
      if (pA !== pB) return pA - pB
      if (a.amFollowUpDate && b.amFollowUpDate) {
        return a.amFollowUpDate.getTime() - b.amFollowUpDate.getTime()
      }
      if (a.amFollowUpDate) return -1
      if (b.amFollowUpDate) return 1
      return 0
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Follow-ups GET error:', error)
    return NextResponse.json({ error: 'Failed to load follow-ups' }, { status: 500 })
  }
}
