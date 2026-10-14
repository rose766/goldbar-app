export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const links = await prisma.rHCaseScenario.findMany({
      where: { caseId: params.id },
      include: { scenario: true },
      orderBy: { addedAt: 'asc' },
    })
    return NextResponse.json(links)
  } catch (error) {
    console.error('Case scenarios GET error:', error)
    return NextResponse.json({ error: 'Failed to load scenarios' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { scenarioId, isPrimary, addedBy } = body

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 })
    }

    const scenario = await prisma.rHScenario.findUnique({ where: { id: scenarioId } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    if (isPrimary) {
      await prisma.rHCaseScenario.updateMany({
        where: { caseId: params.id },
        data: { isPrimary: false },
      })
    }

    const link = await prisma.rHCaseScenario.upsert({
      where: { caseId_scenarioId: { caseId: params.id, scenarioId } },
      update: { isPrimary: isPrimary ?? false },
      create: {
        caseId: params.id,
        scenarioId,
        isPrimary: isPrimary ?? false,
        addedBy: addedBy ?? null,
        snapshotJson: JSON.stringify(scenario),
      },
      include: { scenario: true },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Case scenarios POST error:', error)
    return NextResponse.json({ error: 'Failed to attach scenario' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { scenarioId } = body

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 })
    }

    await prisma.rHCaseScenario.delete({
      where: { caseId_scenarioId: { caseId: params.id, scenarioId } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Case scenarios DELETE error:', error)
    return NextResponse.json({ error: 'Failed to detach scenario' }, { status: 500 })
  }
}
