import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildDocContext, extractFromDocument } from '@/lib/document-ai'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doc = await prisma.sourceDocument.findUnique({ where: { id: params.id } })
  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (!doc.extractedText) {
    return NextResponse.json({ error: 'No extracted text — cannot analyze' }, { status: 422 })
  }

  // Mark as re-analyzing
  await prisma.sourceDocument.update({
    where: { id: params.id },
    data: { processingStatus: 'ANALYZING', processingError: null },
  })

  // Delete previous PENDING proposals from this document (keep APPROVED/REJECTED for audit)
  await prisma.reviewItem.deleteMany({
    where: { sourceDocumentId: params.id, status: 'PENDING' },
  })

  try {
    const context = await buildDocContext()
    const proposals = await extractFromDocument(doc.extractedText, doc.title, context)

    const reviewItems = proposals.map((p) => ({
      sourceDocumentId: params.id,
      reviewType: p.reviewType,
      status: 'PENDING',
      aiInterpretation: p.aiInterpretation,
      aiConfidence: p.confidence,
      proposedAction: p.action,
      proposedData: JSON.stringify({
        ...p.proposedData,
        clientId: p.clientId,
        clientName: p.clientName,
        vaId: p.vaId,
        vaName: p.vaName,
        openItemId: p.openItemId,
      }),
      sourceMessage: p.sourceExcerpt,
      isDryRun: false,
    }))

    await prisma.$transaction([
      prisma.reviewItem.createMany({ data: reviewItems }),
      prisma.sourceDocument.update({
        where: { id: params.id },
        data: {
          processingStatus: 'READY_FOR_REVIEW',
          proposalsCreated: proposals.length,
          lastProcessedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true, proposalsCreated: proposals.length })
  } catch (err) {
    await prisma.sourceDocument.update({
      where: { id: params.id },
      data: {
        processingStatus: 'FAILED',
        processingError: err instanceof Error ? err.message : String(err),
        lastProcessedAt: new Date(),
      },
    })
    return NextResponse.json({ error: 'Analysis failed', detail: String(err) }, { status: 500 })
  }
}
