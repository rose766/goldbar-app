export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const escalation = await prisma.rHEscalation.findUnique({
      where: { caseId: params.id },
    })
    if (!escalation) {
      return NextResponse.json({ error: 'No escalation found for this case' }, { status: 404 })
    }
    return NextResponse.json(escalation)
  } catch (error) {
    console.error('Escalation GET error:', error)
    return NextResponse.json({ error: 'Failed to load escalation' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      reason,
      specificEvidence,
      previousCoaching,
      clientPerspective,
      vaPerspective,
      amRecommendation,
      risks,
      escalatedBy,
    } = body

    if (!reason || !escalatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: reason, escalatedBy' },
        { status: 400 }
      )
    }

    const existing = await prisma.rHEscalation.findUnique({
      where: { caseId: params.id },
    })
    if (existing) {
      return NextResponse.json({ error: 'An escalation already exists for this case' }, { status: 409 })
    }

    const [escalation] = await prisma.$transaction([
      prisma.rHEscalation.create({
        data: {
          caseId: params.id,
          reason,
          specificEvidence: specificEvidence ?? null,
          previousCoaching: previousCoaching ?? null,
          clientPerspective: clientPerspective ?? null,
          vaPerspective: vaPerspective ?? null,
          amRecommendation: amRecommendation ?? null,
          risks: risks ?? null,
          escalatedBy,
        },
      }),
      prisma.rHCase.update({
        where: { id: params.id },
        data: { status: 'ESCALATED' },
      }),
      prisma.rHStatusHistory.create({
        data: {
          caseId: params.id,
          fromStatus: 'ACTIVE',
          toStatus: 'ESCALATED',
          reason: reason,
          changedBy: escalatedBy,
        },
      }),
    ])

    return NextResponse.json(escalation, { status: 201 })
  } catch (error) {
    console.error('Escalation POST error:', error)
    return NextResponse.json({ error: 'Failed to create escalation' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, decision, decisionNotes, decidedBy, nextSteps } = body

    const escalation = await prisma.rHEscalation.findUnique({
      where: { caseId: params.id },
    })
    if (!escalation) {
      return NextResponse.json({ error: 'No escalation found for this case' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (decision !== undefined) updateData.decision = decision
    if (decisionNotes !== undefined) updateData.decisionNotes = decisionNotes
    if (nextSteps !== undefined) updateData.nextSteps = nextSteps
    if (decidedBy) {
      updateData.decidedBy = decidedBy
      updateData.decidedAt = new Date()
    }

    const updated = await prisma.rHEscalation.update({
      where: { caseId: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Escalation PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update escalation' }, { status: 500 })
  }
}
