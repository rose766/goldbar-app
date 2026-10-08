import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const va = await prisma.vA.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            client: { select: { id: true, name: true } },
          },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        },
      },
    })

    if (!va) {
      return NextResponse.json({ error: 'VA not found' }, { status: 404 })
    }

    return NextResponse.json(va)
  } catch (error) {
    console.error('VA GET error:', error)
    return NextResponse.json({ error: 'Failed to load VA' }, { status: 500 })
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
      role,
      startDate,
      status,
      currentPriorities,
      performanceFlags,
      lastClientFeedback,
      lastUpdate,
      notes,
    } = body

    const va = await prisma.vA.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(status !== undefined && { status }),
        ...(currentPriorities !== undefined && { currentPriorities }),
        ...(performanceFlags !== undefined && {
          performanceFlags: Array.isArray(performanceFlags)
            ? JSON.stringify(performanceFlags)
            : performanceFlags,
        }),
        ...(lastClientFeedback !== undefined && { lastClientFeedback }),
        ...(lastUpdate !== undefined && { lastUpdate: lastUpdate ? new Date(lastUpdate) : null }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(va)
  } catch (error) {
    console.error('VA PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update VA' }, { status: 500 })
  }
}
