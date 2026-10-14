export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const assessment = await prisma.rHAssessment.findFirst({
      where: { id: params.aid, caseId: params.id },
      include: {
        responses: { orderBy: [{ section: 'asc' }, { questionKey: 'asc' }] },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    return NextResponse.json(assessment)
  } catch (error) {
    console.error('Assessment GET error:', error)
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; aid: string } }
) {
  try {
    const body = await request.json()
    const { status, responses, notes } = body

    const assessment = await prisma.rHAssessment.findFirst({
      where: { id: params.aid, caseId: params.id },
    })
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    type ResponseInput = {
      section: string
      questionKey: string
      questionText: string
      answer: string
      evidenceNote?: string
      notes?: string
      sourceType?: string
    }

    if (responses && Array.isArray(responses)) {
      for (const r of responses as ResponseInput[]) {
        const existing = await prisma.rHAssessmentResponse.findFirst({
          where: { assessmentId: params.aid, questionKey: r.questionKey },
          select: { id: true },
        })
        if (existing) {
          await prisma.rHAssessmentResponse.update({
            where: { id: existing.id },
            data: {
              section: r.section,
              questionText: r.questionText,
              answer: r.answer,
              evidenceNote: r.evidenceNote ?? null,
              notes: r.notes ?? null,
              sourceType: r.sourceType ?? null,
            },
          })
        } else {
          await prisma.rHAssessmentResponse.create({
            data: {
              assessmentId: params.aid,
              section: r.section,
              questionKey: r.questionKey,
              questionText: r.questionText,
              answer: r.answer,
              evidenceNote: r.evidenceNote ?? null,
              notes: r.notes ?? null,
              sourceType: r.sourceType ?? null,
            },
          })
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (notes !== undefined) updateData.notes = notes
    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    const updated = await prisma.rHAssessment.update({
      where: { id: params.aid },
      data: updateData,
      include: {
        responses: { orderBy: [{ section: 'asc' }, { questionKey: 'asc' }] },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Assessment PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 })
  }
}
