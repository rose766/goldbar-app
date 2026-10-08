export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        vas: true,
        gamePlans: {
          orderBy: { date: 'desc' },
          include: { objectives: true },
        },
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            va: { select: { id: true, name: true } },
            gamePlan: { select: { id: true, title: true } },
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Client GET error:', error)
    return NextResponse.json({ error: 'Failed to load client' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      name,
      status,
      accountManager,
      health,
      healthReasons,
      nextCheckIn,
      lastActivity,
      notes,
      staleThresholdDays,
    } = body

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(accountManager !== undefined && { accountManager }),
        ...(health !== undefined && { health }),
        ...(healthReasons !== undefined && {
          healthReasons: Array.isArray(healthReasons)
            ? JSON.stringify(healthReasons)
            : healthReasons,
        }),
        ...(nextCheckIn !== undefined && { nextCheckIn: nextCheckIn ? new Date(nextCheckIn) : null }),
        ...(lastActivity !== undefined && { lastActivity: lastActivity ? new Date(lastActivity) : null }),
        ...(notes !== undefined && { notes }),
        ...(staleThresholdDays !== undefined && { staleThresholdDays }),
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Client PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.client.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Client DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
