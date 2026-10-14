import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const body = await request.json()
    const { responses, status } = body

    const assessment = await prisma.rHAssessment.findUnique({
      where: { id: params.aid },
    })
    if (!assessment || assessment.caseId !== params.id) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    if (assessment.status === 'COMPLETED' && status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Cannot edit a completed assessment' }, { status: 400 })
    }

    // Upsert responses
    if (Array.isArray(responses) && responses.length > 0) {
      for (const r of responses) {
        if (!r.questionKey || !r.answer) continue
        const existing = await prisma.rHAssessmentResponse.findFirst({
          where: { assessmentId: params.aid, questionKey: r.questionKey },
        })
        if (existing) {
          await prisma.rHAssessmentResponse.update({
            where: { id: existing.id },
            data: {
              answer: r.answer,
              evidenceNote: r.evidenceNote || null,
              notes: r.notes || null,
              sourceType: r.sourceType || null,
            },
          })
        } else {
          await prisma.rHAssessmentResponse.create({
            data: {
              assessmentId: params.aid,
              section: r.section || r.questionKey.charAt(0),
              questionKey: r.questionKey,
              questionText: r.questionText || '',
              answer: r.answer,
              evidenceNote: r.evidenceNote || null,
              notes: r.notes || null,
              sourceType: r.sourceType || null,
            },
          })
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (status === 'COMPLETED') updateData.completedAt = new Date()

    const updated = await prisma.rHAssessment.update({
      where: { id: params.aid },
      data: updateData,
      include: { responses: true },
    })

    // Advance case status if assessment completed
    if (status === 'COMPLETED') {
      const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
      if (rhCase && ['NEW', 'AWAITING_ASSESSMENT'].includes(rhCase.status)) {
        await prisma.rHCase.update({
          where: { id: params.id },
          data: { status: 'UNDER_INVESTIGATION' },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rh/cases/[id]/assessments/[aid]]', err)
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 })
  }
}
