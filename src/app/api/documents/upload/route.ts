import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractDocumentText, detectFileType } from '@/lib/document-extract'
import { buildDocContext, extractFromDocument } from '@/lib/document-ai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const clientId = (formData.get('clientId') as string | null) ?? null
  const title = (formData.get('title') as string | null) ?? file.name.replace(/\.[^.]+$/, '')

  const fileType = detectFileType(file.name)
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Extract text
  let extracted: Awaited<ReturnType<typeof extractDocumentText>>
  try {
    extracted = await extractDocumentText(buffer, fileType)
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse file: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    )
  }

  // Duplicate check by hash
  const existing = await prisma.sourceDocument.findFirst({
    where: { contentHash: extracted.contentHash },
  })
  if (existing) {
    return NextResponse.json({
      duplicate: true,
      message: 'Identical document already exists',
      existingDocumentId: existing.id,
    })
  }

  // Validate clientId if provided
  if (clientId) {
    const clientExists = await prisma.client.findUnique({ where: { id: clientId } })
    if (!clientExists) {
      return NextResponse.json({ error: 'clientId not found' }, { status: 400 })
    }
  }

  // Create document
  const doc = await prisma.sourceDocument.create({
    data: {
      title,
      fileName: file.name,
      fileType,
      sourceType: 'MANUAL',
      contentHash: extracted.contentHash,
      extractedText: extracted.text,
      processingStatus: 'RECEIVED',
      clientId,
    },
  })

  // Trigger analysis inline (manual uploads wait for result)
  try {
    await prisma.sourceDocument.update({
      where: { id: doc.id },
      data: { processingStatus: 'ANALYZING' },
    })

    const context = await buildDocContext()
    const proposals = await extractFromDocument(extracted.text, title, context)

    const reviewItems = proposals.map((p) => ({
      sourceDocumentId: doc.id,
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
        where: { id: doc.id },
        data: {
          processingStatus: 'READY_FOR_REVIEW',
          proposalsCreated: proposals.length,
          lastProcessedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      proposalsCreated: proposals.length,
      status: 'READY_FOR_REVIEW',
    })
  } catch (err) {
    await prisma.sourceDocument.update({
      where: { id: doc.id },
      data: {
        processingStatus: 'FAILED',
        processingError: err instanceof Error ? err.message : String(err),
      },
    })
    return NextResponse.json(
      { error: 'Document saved but analysis failed', documentId: doc.id },
      { status: 207 }
    )
  }
}
