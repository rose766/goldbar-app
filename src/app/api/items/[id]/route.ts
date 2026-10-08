import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeItemFlags } from '@/lib/health'

const WAITING_STATUSES = ['WAITING_ON_CLIENT', 'WAITING_ON_VA', 'WAITING_ON_GOLDBAR']

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.openItem.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        va: true,
        gamePlan: { select: { id: true, title: true } },
        objective: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true } },
        history: { orderBy: { changedAt: 'desc' } },
        reviewItems: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Item GET error:', error)
    return NextResponse.json({ error: 'Failed to load item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Load existing item to record history
    const existing = await prisma.openItem.findUnique({
      where: { id: params.id },
      include: { client: { select: { staleThresholdDays: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Track history for changed scalar fields
    const trackedFields = [
      'title', 'description', 'nextStep', 'owner', 'ownerType',
      'status', 'priority', 'deadline', 'waitingFor',
      'blockerDescription', 'amFollowUp', 'amFollowUpDate', 'amFollowUpNotes',
    ] as const

    const historyEntries: {
      openItemId: string
      field: string
      previousValue: string | null
      newValue: string | null
      changedBy: string | null
      source: string | null
    }[] = []

    for (const field of trackedFields) {
      if (field in body) {
        const prev = existing[field as keyof typeof existing]
        const next = body[field]
        const prevStr = prev === null || prev === undefined ? null : String(prev)
        const nextStr = next === null || next === undefined ? null : String(next)
        if (prevStr !== nextStr) {
          historyEntries.push({
            openItemId: params.id,
            field,
            previousValue: prevStr,
            newValue: nextStr,
            changedBy: body._changedBy ?? null,
            source: body._source ?? 'MANUAL',
          })
        }
      }
    }

    // Compute updated flags
    const deadline =
      'deadline' in body
        ? body.deadline
          ? new Date(body.deadline)
          : null
        : existing.deadline

    const lastConfirmed =
      'lastConfirmed' in body
        ? body.lastConfirmed
          ? new Date(body.lastConfirmed)
          : null
        : existing.lastConfirmed

    const status = body.status ?? existing.status
    const owner = 'owner' in body ? body.owner : existing.owner
    const nextStep = 'nextStep' in body ? body.nextStep : existing.nextStep

    const flags = computeItemFlags({
      deadline,
      status,
      lastConfirmed,
      staleThresholdDays: existing.client?.staleThresholdDays ?? 5,
      owner,
      nextStep,
    })

    // Handle waitingSince on status change to WAITING_*
    let waitingSince = existing.waitingSince
    if (body.status && WAITING_STATUSES.includes(body.status) && !existing.waitingSince) {
      waitingSince = new Date()
    } else if (body.status && !WAITING_STATUSES.includes(body.status)) {
      waitingSince = null
    }
    if ('waitingSince' in body) {
      waitingSince = body.waitingSince ? new Date(body.waitingSince) : null
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      ...flags,
      waitingSince,
    }

    const scalarFields = [
      'title', 'description', 'nextStep', 'owner', 'ownerType', 'ownerConfidence',
      'amFollowUp', 'amFollowUpNotes', 'deadlineStatus', 'deadlineConfidence',
      'status', 'priority', 'waitingFor', 'lastConfirmedSource',
      'blockerDescription', 'dependency', 'sourceChannel', 'sourceTimestamp',
      'sourceMessage', 'sourceLink', 'completionEvidence', 'confidenceLevel',
      'notes', 'vaId', 'gamePlanId', 'objectiveId', 'milestoneId',
    ]

    for (const field of scalarFields) {
      if (field in body) updateData[field] = body[field]
    }

    const dateFields = [
      'amFollowUpDate', 'deadline', 'lastConfirmed', 'sourceDate',
      'completedDate', 'lastUpdate',
    ]

    for (const field of dateFields) {
      if (field in body) {
        updateData[field] = body[field] ? new Date(body[field]) : null
      }
    }

    // Write history and update item in a transaction
    const [item] = await prisma.$transaction([
      prisma.openItem.update({
        where: { id: params.id },
        data: updateData,
        include: {
          client: { select: { id: true, name: true } },
          va: { select: { id: true, name: true } },
        },
      }),
      ...historyEntries.map((entry) =>
        prisma.openItemHistory.create({ data: entry })
      ),
    ])

    return NextResponse.json(item)
  } catch (error) {
    console.error('Item PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.openItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Item DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
