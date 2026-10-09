import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractDocumentText, hashText } from '@/lib/document-extract'
import { buildDocContext, extractFromDocument } from '@/lib/document-ai'

export const dynamic = 'force-dynamic'

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authorize(req: NextRequest): boolean {
  const secret = process.env.LINDY_INTAKE_SECRET
  if (!secret) return false  // secret must be configured
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// ─── POST /api/documents/intake ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    title,
    fileName,
    fileType,
    googleDriveFileId,
    googleDriveUrl,
    documentVersion,
    clientHint,        // optional: client name hint from Lindy
    uploadedAt,
    fileBase64,        // base64-encoded file content
    rawMetadata,
  } = body as Record<string, string | undefined>

  if (!title || !fileName || !fileType) {
    return NextResponse.json({ error: 'title, fileName, fileType are required' }, { status: 400 })
  }

  if (!fileBase64) {
    return NextResponse.json({ error: 'fileBase64 is required' }, { status: 400 })
  }

  // ── File type validation ──────────────────────────────────────────────────────
  const SUPPORTED_TYPES = new Set(['pdf', 'docx', 'pptx', 'txt', 'md', 'markdown', 'text'])
  const normalizedType = (fileType as string).toLowerCase().replace(/^\./, '')
  if (!SUPPORTED_TYPES.has(normalizedType)) {
    return NextResponse.json(
      { error: `Unsupported file type: "${fileType}". Supported types: pdf, docx, pptx, txt, md` },
      { status: 415 }
    )
  }

  // ── File size guard (check base64 length before decoding) ─────────────────────
  // base64 encodes 3 bytes as 4 chars, so a 10 MB file is ~13.7 MB in base64
  const MAX_BASE64_LEN = Math.ceil(10 * 1024 * 1024 * 1.4)
  if ((fileBase64 as string).length > MAX_BASE64_LEN) {
    return NextResponse.json({ error: 'File too large (max 10 MB raw)' }, { status: 413 })
  }

  // ── Decode file ───────────────────────────────────────────────────────────────
  let fileBuffer: Buffer
  try {
    fileBuffer = Buffer.from(fileBase64, 'base64')
  } catch {
    return NextResponse.json({ error: 'Invalid base64 in fileBase64' }, { status: 400 })
  }

  // Secondary size check on decoded bytes (belt-and-suspenders)
  const MAX_BYTES = 10 * 1024 * 1024
  if (fileBuffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  // ── Extract text ──────────────────────────────────────────────────────────────
  let extracted: Awaited<ReturnType<typeof extractDocumentText>>
  try {
    extracted = await extractDocumentText(fileBuffer, fileType)
  } catch (err) {
    return NextResponse.json(
      { error: `Text extraction failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    )
  }

  // ── Duplicate detection ───────────────────────────────────────────────────────
  // Check by Google Drive file ID first (exact match = same file re-uploaded)
  if (googleDriveFileId) {
    const existing = await prisma.sourceDocument.findFirst({
      where: { googleDriveFileId },
      orderBy: { createdAt: 'desc' },
    })
    if (existing && existing.contentHash === extracted.contentHash) {
      return NextResponse.json(
        {
          duplicate: true,
          message: 'Identical document already processed',
          existingDocumentId: existing.id,
        },
        { status: 200 }
      )
    }
    // Same Drive file but different content = new version
    if (existing) {
      // We'll set previousVersionId below
    }
  }

  // Also check by content hash alone (different path, same content)
  // Skip this check when text is empty — scanned/image PDFs all produce the same empty hash
  // and would create false duplicates. Google Drive ID check above is sufficient for those.
  const emptyExtraction = extracted.text.trim().length === 0
  if (!emptyExtraction) {
    const hashDuplicate = await prisma.sourceDocument.findFirst({
      where: { contentHash: extracted.contentHash },
      orderBy: { createdAt: 'desc' },
    })
    if (hashDuplicate) {
      return NextResponse.json(
        {
          duplicate: true,
          message: 'Document with identical content already exists',
          existingDocumentId: hashDuplicate.id,
        },
        { status: 200 }
      )
    }
  }

  // ── Client matching ───────────────────────────────────────────────────────────
  // Require an unambiguous single match. Multiple matches = leave unmatched so AI flags CLIENT_NOT_FOUND.
  let clientId: string | null = null
  if (clientHint) {
    const clients = await prisma.client.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } })
    const hint = (clientHint as string).toLowerCase()
    const matches = clients.filter(
      (c) => c.name.toLowerCase().includes(hint) || hint.includes(c.name.toLowerCase())
    )
    if (matches.length === 1) {
      clientId = matches[0].id
    } else if (matches.length > 1) {
      // Ambiguous — do not guess; let the AI flag CLIENT_NOT_FOUND for human review
      console.warn(
        `[intake] Ambiguous clientHint "${clientHint}" matched ${matches.length} clients: ` +
        matches.map((c) => c.name).join(', ')
      )
    }
  }

  // ── Find previous version ─────────────────────────────────────────────────────
  let previousVersionId: string | null = null
  if (googleDriveFileId) {
    const prev = await prisma.sourceDocument.findFirst({
      where: { googleDriveFileId },
      orderBy: { createdAt: 'desc' },
    })
    if (prev) previousVersionId = prev.id
  }

  // ── Create SourceDocument ─────────────────────────────────────────────────────
  const doc = await prisma.sourceDocument.create({
    data: {
      title,
      fileName,
      fileType: fileType.toLowerCase(),
      sourceType: 'LINDY',
      googleDriveFileId: googleDriveFileId ?? null,
      googleDriveUrl: googleDriveUrl ?? null,
      documentVersion: documentVersion ?? null,
      contentHash: extracted.contentHash,
      previousVersionId,
      extractedText: extracted.text,
      uploadedAt: uploadedAt ? new Date(uploadedAt) : null,
      processingStatus: 'RECEIVED',
      rawMetadata: rawMetadata ? JSON.stringify(rawMetadata) : null,
      clientId,
    },
  })

  // ── Background processing (fire and forget, update status async) ──────────────
  processDocumentAsync(doc.id, extracted.text, title, clientId).catch((err) => {
    console.error(`Document processing failed for ${doc.id}:`, err)
  })

  return NextResponse.json(
    {
      success: true,
      documentId: doc.id,
      status: 'RECEIVED',
      clientMatched: clientId !== null,
      extractedChars: extracted.text.length,
      warning: emptyExtraction
        ? 'No text was extracted — document may be image-based or encrypted. AI analysis will be skipped.'
        : null,
      message: 'Document received and queued for analysis',
    },
    { status: 202 }
  )
}

// ─── Async processing pipeline ────────────────────────────────────────────────

async function processDocumentAsync(
  docId: string,
  extractedText: string,
  title: string,
  clientId: string | null
) {
  try {
    // EXTRACTING state
    await prisma.sourceDocument.update({
      where: { id: docId },
      data: { processingStatus: 'EXTRACTING', lastProcessedAt: new Date() },
    })

    // ANALYZING state
    await prisma.sourceDocument.update({
      where: { id: docId },
      data: { processingStatus: 'ANALYZING' },
    })

    const context = await buildDocContext()
    const proposals = await extractFromDocument(extractedText, title, context)

    if (proposals.length === 0) {
      await prisma.sourceDocument.update({
        where: { id: docId },
        data: {
          processingStatus: 'READY_FOR_REVIEW',
          proposalsCreated: 0,
          lastProcessedAt: new Date(),
        },
      })
      return
    }

    // Create ReviewItems from proposals
    const reviewItems = proposals.map((p) => ({
      sourceDocumentId: docId,
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
      sourceLink: null,
      isDryRun: false,
    }))

    await prisma.$transaction([
      prisma.reviewItem.createMany({ data: reviewItems }),
      prisma.sourceDocument.update({
        where: { id: docId },
        data: {
          processingStatus: 'READY_FOR_REVIEW',
          proposalsCreated: proposals.length,
          lastProcessedAt: new Date(),
          clientId: clientId,
        },
      }),
    ])
  } catch (err) {
    await prisma.sourceDocument.update({
      where: { id: docId },
      data: {
        processingStatus: 'FAILED',
        processingError: err instanceof Error ? err.message : String(err),
        lastProcessedAt: new Date(),
      },
    })
  }
}
