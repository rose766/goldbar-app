export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const vas = await prisma.vA.findMany({
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(vas)
  } catch (error) {
    console.error('VAs GET error:', error)
    return NextResponse.json({ error: 'Failed to load VAs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const va = await prisma.vA.create({
      data: {
        clientId: body.clientId,
        name: body.name,
        role: body.role,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        status: body.status ?? 'ACTIVE',
        currentPriorities: body.currentPriorities,
        notes: body.notes,
      },
    })
    return NextResponse.json(va, { status: 201 })
  } catch (error) {
    console.error('VAs POST error:', error)
    return NextResponse.json({ error: 'Failed to create VA' }, { status: 500 })
  }
}
