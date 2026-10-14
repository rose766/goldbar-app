export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evidence = await prisma.rHEvidence.findMany({
      where: { caseId: params.id },
      orderBy: { recordedAt: 'desc' },
    })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error('Evidence GET error:', error)
    return NextResponse.json({ error: 'Failed to load evidence' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description, sourceType, recordedBy, isConfirmed, notes } = body

    if (!title || !description || !sourceType || !recordedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, sourceType, recordedBy' },
        { status: 400 }
      )
    }

    const evidence = await prisma.rHEvidence.create({
      data: {
        caseId: params.id,
        title,
        description,
        sourceType,
        recordedBy,
        isConfirmed: isConfirmed ?? false,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(evidence, { status: 201 })
  } catch (error) {
    console.error('Evidence POST error:', error)
    return NextResponse.json({ error: 'Failed to create evidence' }, { status: 500 })
  }
}
