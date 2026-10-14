import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (severity) where.severity = severity
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { caseNumber: { contains: search } },
    ]
  }

  const cases = await prisma.rHCase.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      va: { select: { id: true, name: true } },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(cases)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, vaId, title, description, severity, assignedAm, dateIdentified, clientFeedback, vaFeedback, nextReviewDate } = body

    if (!clientId || !title || !assignedAm) {
      return NextResponse.json({ error: 'clientId, title, and assignedAm are required' }, { status: 400 })
    }

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'CLIENT_NOT_FOUND' }, { status: 404 })
    }

    // Verify VA if provided
    if (vaId) {
      const va = await prisma.vA.findUnique({ where: { id: vaId } })
      if (!va) {
        return NextResponse.json({ error: 'VA_NOT_FOUND' }, { status: 404 })
      }
    }

    // Generate case number using counter
    const counter = await prisma.rHCaseCounter.upsert({
      where: { id: 1 },
      create: { id: 1, lastNum: 1 },
      update: { lastNum: { increment: 1 } },
    })
    const caseNumber = `GB-RH-${String(counter.lastNum).padStart(5, '0')}`

    const rhCase = await prisma.rHCase.create({
      data: {
        caseNumber,
        clientId,
        vaId: vaId || null,
        title,
        description: description || '',
        severity: severity || 'MODERATE',
        status: 'NEW',
        assignedAm,
        createdBy: assignedAm,
        dateIdentified: dateIdentified ? new Date(dateIdentified) : new Date(),
        clientFeedback: clientFeedback || null,
        vaFeedback: vaFeedback || null,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
      },
      include: {
        client: { select: { id: true, name: true } },
        va: { select: { id: true, name: true } },
      },
    })

    await prisma.rHAuditLog.create({
      data: {
        caseId: rhCase.id,
        entityType: 'CASE',
        entityId: rhCase.id,
        action: 'CREATE',
        newValue: caseNumber,
        changedBy: assignedAm,
      },
    })

    return NextResponse.json(rhCase, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rh/cases]', err)
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
  }
}
