export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        vas: { select: { id: true } },
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: {
            id: true,
            isOverdue: true,
            status: true,
            amFollowUp: true,
            isMissingDeadline: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const summaries = clients.map((client) => {
      const activeItems = client.openItems
      const overdueCount = activeItems.filter((i) => i.isOverdue).length
      const blockedCount = activeItems.filter((i) => i.status === 'BLOCKED').length
      const missingDeadlineCount = activeItems.filter((i) => i.isMissingDeadline).length
      const amAttentionCount = activeItems.filter((i) => i.amFollowUp).length

      let healthReasons: string[] = []
      try {
        healthReasons = client.healthReasons ? JSON.parse(client.healthReasons) : []
      } catch {
        healthReasons = []
      }

      return {
        id: client.id,
        name: client.name,
        status: client.status,
        health: client.health,
        healthReasons,
        vaCount: client.vas.length,
        openItemCount: activeItems.length,
        overdueCount,
        blockedCount,
        missingDeadlineCount,
        amAttentionCount,
        nextCheckIn: client.nextCheckIn,
        lastActivity: client.lastActivity,
        lastDocumentSync: client.lastDocumentSync,
        accountManager: client.accountManager,
      }
    })

    return NextResponse.json(summaries)
  } catch (error) {
    console.error('Clients GET error:', error)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await prisma.client.create({
      data: {
        name: body.name,
        status: body.status ?? 'ACTIVE',
        accountManager: body.accountManager ?? 'Rose',
        health: body.health ?? 'ON_TRACK',
        nextCheckIn: body.nextCheckIn ? new Date(body.nextCheckIn) : undefined,
        notes: body.notes,
        staleThresholdDays: body.staleThresholdDays ?? 5,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Clients POST error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
