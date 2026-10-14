import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description, sourceType, recordedBy, isConfirmed } = body

    if (!title || !description || !sourceType || !recordedBy) {
      return NextResponse.json({ error: 'title, description, sourceType, and recordedBy are required' }, { status: 400 })
    }

    const rhCase = await prisma.rHCase.findUnique({ where: { id: params.id } })
    if (!rhCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const evidence = await prisma.rHEvidence.create({
      data: {
        caseId: params.id,
        title,
        description,
        sourceType,
        recordedBy,
        isConfirmed: isConfirmed ?? false,
      },
    })

    await prisma.rHAuditLog.create({
      data: {
        caseId: params.id,
        entityType: 'EVIDENCE',
        entityId: evidence.id,
        action: 'CREATE',
        newValue: title,
        changedBy: recordedBy,
      },
    })

    return NextResponse.json(evidence, { status: 201 })
  } catch (err) {
    console.error('[POST /api/rh/cases/[id]/evidence]', err)
    return NextResponse.json({ error: 'Failed to add evidence' }, { status: 500 })
  }
}
