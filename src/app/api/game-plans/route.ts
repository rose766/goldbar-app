export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const gamePlans = await prisma.gamePlan.findMany({
      include: {
        client: { select: { id: true, name: true } },
        objectives: { orderBy: { order: 'asc' } },
      },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(gamePlans)
  } catch (error) {
    console.error('Game plans GET error:', error)
    return NextResponse.json({ error: 'Failed to load game plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const gamePlan = await prisma.gamePlan.create({
      data: {
        clientId: body.clientId,
        title: body.title,
        version: body.version ?? 1,
        status: body.status ?? 'ACTIVE',
        date: new Date(body.date),
        summary: body.summary,
        keyObjectives: body.keyObjectives,
        keyCommitments: body.keyCommitments,
        nextSteps: body.nextSteps,
        sourceExcerpt: body.sourceExcerpt,
        sourceLink: body.sourceLink,
        notes: body.notes,
        previousVersionId: body.previousVersionId,
      },
    })
    return NextResponse.json(gamePlan, { status: 201 })
  } catch (error) {
    console.error('Game plans POST error:', error)
    return NextResponse.json({ error: 'Failed to create game plan' }, { status: 500 })
  }
}
