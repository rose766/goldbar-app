import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gamePlan = await prisma.gamePlan.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { id: true, name: true } },
        objectives: {
          orderBy: { order: 'asc' },
          include: {
            milestones: { orderBy: { order: 'asc' } },
          },
        },
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: {
            va: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!gamePlan) {
      return NextResponse.json({ error: 'Game plan not found' }, { status: 404 })
    }

    return NextResponse.json(gamePlan)
  } catch (error) {
    console.error('Game plan GET error:', error)
    return NextResponse.json({ error: 'Failed to load game plan' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const existing = await prisma.gamePlan.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Game plan not found' }, { status: 404 })
    }

    // If updating an ACTIVE game plan with content changes, create a new version
    const contentFields = ['title', 'summary', 'keyObjectives', 'keyCommitments', 'nextSteps']
    const hasContentChange = contentFields.some((f) => f in body && body[f] !== existing[f as keyof typeof existing])

    let updatedPlan

    if (existing.status === 'ACTIVE' && hasContentChange && body._createVersion !== false) {
      // Mark old plan as SUPERSEDED
      await prisma.gamePlan.update({
        where: { id: params.id },
        data: { status: 'SUPERSEDED' },
      })

      // Create new version
      updatedPlan = await prisma.gamePlan.create({
        data: {
          clientId: existing.clientId,
          title: body.title ?? existing.title,
          version: existing.version + 1,
          status: 'ACTIVE',
          date: body.date ? new Date(body.date) : existing.date,
          summary: body.summary ?? existing.summary,
          keyObjectives: body.keyObjectives ?? existing.keyObjectives,
          keyCommitments: body.keyCommitments ?? existing.keyCommitments,
          nextSteps: body.nextSteps ?? existing.nextSteps,
          sourceSlackMessage: body.sourceSlackMessage ?? existing.sourceSlackMessage,
          sourceLink: body.sourceLink ?? existing.sourceLink,
          sourceChannel: body.sourceChannel ?? existing.sourceChannel,
          sourceDate: body.sourceDate ? new Date(body.sourceDate) : existing.sourceDate,
          sourceTimestamp: body.sourceTimestamp ?? existing.sourceTimestamp,
          notes: body.notes ?? existing.notes,
          previousVersionId: params.id,
        },
      })
    } else {
      // Simple update
      const updateData: Record<string, unknown> = {}
      const fields = [
        'title', 'status', 'summary', 'keyObjectives', 'keyCommitments',
        'nextSteps', 'sourceSlackMessage', 'sourceLink', 'sourceChannel',
        'sourceTimestamp', 'notes',
      ]
      for (const f of fields) {
        if (f in body) updateData[f] = body[f]
      }
      if ('date' in body) updateData.date = new Date(body.date)
      if ('sourceDate' in body) updateData.sourceDate = body.sourceDate ? new Date(body.sourceDate) : null
      if ('lastReviewed' in body) updateData.lastReviewed = body.lastReviewed ? new Date(body.lastReviewed) : null

      updatedPlan = await prisma.gamePlan.update({
        where: { id: params.id },
        data: updateData,
      })
    }

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Game plan PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update game plan' }, { status: 500 })
  }
}
