import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { assessedBy } = body

    const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!rhCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get next version number
    const lastAssessment = await prisma.rHAssessment.findFirst({
      where: { caseId: params.id },
      orderBy: { version: 'desc' },
    })
    const version = (lastAssessment?.version ?? 0) + 1

    const assessment = await prisma.rHAssessment.create({
      data: {
        caseId: params.id,
        assessedBy: assessedBy || 'Unknown',
        status: 'DRAFT',
        version,
      },
    })

    // Update case status to awaiting assessment if it's still NEW
    if (rhCase.status === 'NEW') {
      await prisma.rHCase.update({
        where: { id: params.id },
        data: { status: 'AWAITING_ASSESSMENT' },
      })
    }

    return NextResponse.json(assessment, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rh/cases/[id]/assessments]', err)
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 })
  }
}
