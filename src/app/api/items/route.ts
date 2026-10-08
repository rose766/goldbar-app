import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeItemFlags } from '@/lib/health'

const WAITING_STATUSES = ['WAITING_ON_CLIENT', 'WAITING_ON_VA', 'WAITING_ON_GOLDBAR']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const vaId = searchParams.get('vaId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const amFollowUp = searchParams.get('amFollowUp')
    const isOverdue = searchParams.get('isOverdue')
    const isMissingDeadline = searchParams.get('isMissingDeadline')
    const isMissingOwner = searchParams.get('isMissingOwner')
    const isStale = searchParams.get('isStale')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (clientId) where.clientId = clientId
    if (vaId) where.vaId = vaId
    if (status) where.status = status
    if (priority) where.priority = priority
    if (amFollowUp === 'true') where.amFollowUp = true
    if (isOverdue === 'true') where.isOverdue = true
    if (isMissingDeadline === 'true') where.isMissingDeadline = true
    if (isMissingOwner === 'true') where.isMissingOwner = true
    if (isStale === 'true') where.isStale = true
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { nextStep: { contains: search } },
      ]
    }

    const items = await prisma.openItem.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Items GET error:', error)
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get client's staleThresholdDays for flag computation
    const client = body.clientId
      ? await prisma.client.findUnique({
          where: { id: body.clientId },
          select: { staleThresholdDays: true },
        })
      : null

    const deadline = body.deadline ? new Date(body.deadline) : null
    const lastConfirmed = body.lastConfirmed ? new Date(body.lastConfirmed) : null
    const status = body.status ?? 'NOT_STARTED'

    const flags = computeItemFlags({
      deadline,
      status,
      lastConfirmed,
      staleThresholdDays: client?.staleThresholdDays ?? 5,
      owner: body.owner ?? null,
      nextStep: body.nextStep ?? null,
    })

    // Set waitingSince if entering a waiting status
    const waitingSince =
      WAITING_STATUSES.includes(status) && !body.waitingSince
        ? new Date()
        : body.waitingSince
        ? new Date(body.waitingSince)
        : undefined

    const item = await prisma.openItem.create({
      data: {
        clientId: body.clientId,
        vaId: body.vaId,
        gamePlanId: body.gamePlanId,
        objectiveId: body.objectiveId,
        milestoneId: body.milestoneId,
        title: body.title,
        description: body.description,
        nextStep: body.nextStep,
        owner: body.owner,
        ownerType: body.ownerType ?? 'UNASSIGNED',
        ownerConfidence: body.ownerConfidence ?? 'HIGH',
        amFollowUp: body.amFollowUp ?? false,
        amFollowUpDate: body.amFollowUpDate ? new Date(body.amFollowUpDate) : undefined,
        amFollowUpNotes: body.amFollowUpNotes,
        deadline,
        deadlineStatus: body.deadlineStatus ?? 'CONFIRMED',
        deadlineConfidence: body.deadlineConfidence ?? 'HIGH',
        status,
        priority: body.priority ?? 'MEDIUM',
        ...flags,
        waitingSince,
        waitingFor: body.waitingFor,
        lastConfirmed,
        lastConfirmedSource: body.lastConfirmedSource,
        blockerDescription: body.blockerDescription,
        dependency: body.dependency,
        source: body.source ?? 'MANUAL',
        sourceChannel: body.sourceChannel,
        sourceDate: body.sourceDate ? new Date(body.sourceDate) : undefined,
        sourceTimestamp: body.sourceTimestamp,
        sourceMessage: body.sourceMessage,
        sourceLink: body.sourceLink,
        confidenceLevel: body.confidenceLevel ?? 'HIGH',
        notes: body.notes,
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Items POST error:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
