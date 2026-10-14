export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessments = await prisma.rHAssessment.findMany({
      where: { caseId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { responses: true } },
      },
    })
    return NextResponse.json(assessments)
  } catch (error) {
    console.error('Assessments GET error:', error)
    return NextResponse.json({ error: 'Failed to load assessments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { assessedBy, notes } = body

    if (!assessedBy) {
      return NextResponse.json({ error: 'assessedBy is required' }, { status: 400 })
    }

    const lastAssessment = await prisma.rHAssessment.findFirst({
      where: { caseId: params.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const version = (lastAssessment?.version ?? 0) + 1

    const assessment = await prisma.rHAssessment.create({
      data: {
        caseId: params.id,
        assessedBy,
        notes: notes ?? null,
        version,
      },
    })

    return NextResponse.json(assessment, { status: 201 })
  } catch (error) {
    console.error('Assessments POST error:', error)
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
  }
}
