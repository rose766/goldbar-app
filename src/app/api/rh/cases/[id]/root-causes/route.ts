export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rootCauses = await prisma.rHRootCause.findMany({
      where: { caseId: params.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(rootCauses)
  } catch (error) {
    console.error('Root causes GET error:', error)
    return NextResponse.json({ error: 'Failed to load root causes' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { category, description, supportingEvidence, isPrimary, confidence, isAiGenerated } = body

    if (!category || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description' },
        { status: 400 }
      )
    }

    const rootCause = await prisma.rHRootCause.create({
      data: {
        caseId: params.id,
        category,
        description,
        supportingEvidence: supportingEvidence ?? null,
        isPrimary: isPrimary ?? false,
        confidence: confidence ?? 'MEDIUM',
        isAiGenerated: isAiGenerated ?? false,
      },
    })

    return NextResponse.json(rootCause, { status: 201 })
  } catch (error) {
    console.error('Root causes POST error:', error)
    return NextResponse.json({ error: 'Failed to create root cause' }, { status: 500 })
  }
}
