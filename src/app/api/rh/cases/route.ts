export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const assignedAm = searchParams.get('assignedAm')
    const clientId = searchParams.get('clientId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (severity) where.severity = severity
    if (assignedAm) where.assignedAm = assignedAm
    if (clientId) where.clientId = clientId
    if (search) {
      where.OR = [
        { caseNumber: { contains: search } },
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [cases, total] = await Promise.all([
      prisma.rHCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          va: { select: { id: true, name: true } },
          _count: {
            select: {
              actions: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
              followUps: { where: { status: 'PENDING' } },
            },
          },
        },
      }),
      prisma.rHCase.count({ where }),
    ])

    return NextResponse.json({
      cases: cases.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        status: c.status,
        severity: c.severity,
        healthStatus: c.healthStatus,
        assignedAm: c.assignedAm,
        dateIdentified: c.dateIdentified,
        nextReviewDate: c.nextReviewDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        client: c.client,
        va: c.va,
        openActionsCount: c._count.actions,
        pendingFollowUpsCount: c._count.followUps,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('RH Cases GET error:', error)
    return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      vaId,
      assignedAm,
      assignedTrainer,
      createdBy,
      title,
      description,
      severity,
      dateIdentified,
      sourceOfConcern,
      primaryScenarioId,
      nextReviewDate,
      tags,
    } = body

    if (!clientId || !assignedAm || !title || !description || !dateIdentified || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, assignedAm, title, description, dateIdentified, createdBy' },
        { status: 400 }
      )
    }

    // Atomic counter increment
    const counter = await prisma.rHCaseCounter.upsert({
      where: { id: 1 },
      update: { lastNum: { increment: 1 } },
      create: { id: 1, lastNum: 1 },
    })
    const caseNumber = `GB-RH-${String(counter.lastNum).padStart(5, '0')}`

    const newCase = await prisma.rHCase.create({
      data: {
        caseNumber,
        clientId,
        vaId: vaId ?? null,
        assignedAm,
        assignedTrainer: assignedTrainer ?? null,
        createdBy,
        title,
        description,
        severity: severity ?? 'MODERATE',
        dateIdentified: new Date(dateIdentified),
        sourceOfConcern: sourceOfConcern ?? null,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
        tags: tags ? JSON.stringify(tags) : '[]',
        statusHistory: {
          create: {
            fromStatus: '',
            toStatus: 'NEW',
            changedBy: createdBy,
          },
        },
        ...(primaryScenarioId
          ? {
              scenarios: {
                create: {
                  scenarioId: primaryScenarioId,
                  isPrimary: true,
                  addedBy: createdBy,
                },
              },
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(newCase, { status: 201 })
  } catch (error) {
    console.error('RH Cases POST error:', error)
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
  }
}
