/**
 * Tests for /api/documents/intake route
 * Covers: auth, file size, file type, deduplication, client matching.
 * All Prisma calls and document processing are mocked — no live services required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Module mocks (top-level — Vitest hoists vi.mock calls) ──────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sourceDocument: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
    reviewItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/document-extract', () => ({
  extractDocumentText: vi.fn(),
  hashText: vi.fn((t: string) => (t + '0'.repeat(32)).slice(0, 32)),
}))

vi.mock('@/lib/document-ai', () => ({
  buildDocContext: vi.fn().mockResolvedValue({ clients: [], vas: [], openItems: [] }),
  extractFromDocument: vi.fn().mockResolvedValue([]),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/documents/intake/route'
import { prisma } from '@/lib/prisma'
import { extractDocumentText } from '@/lib/document-extract'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = 'test-lindy-secret-abc'

function makeRequest(body: Record<string, unknown>, authHeader?: string) {
  return new NextRequest('http://localhost/api/documents/intake', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader !== undefined ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  })
}

const SMALL_TXT_BASE64 = Buffer.from('Hello document text content for testing').toString('base64')

const baseBody = {
  title: 'Test Document',
  fileName: 'test.txt',
  fileType: 'txt',
  fileBase64: SMALL_TXT_BASE64,
}

const MOCK_EXTRACTION = {
  text: 'Sample document text for testing',
  contentHash: 'abc123def456abc123def456abc12345',
  pageCount: 1,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/documents/intake — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINDY_INTAKE_SECRET = SECRET
    vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-1' } as never)
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.$transaction).mockResolvedValue([])
  })

  // Scenario 1: No auth header → 401
  it('rejects requests with no Authorization header', async () => {
    const res = await POST(makeRequest(baseBody))
    expect(res.status).toBe(401)
  })

  // Scenario 2: Wrong secret → 401
  it('rejects requests with wrong secret', async () => {
    const res = await POST(makeRequest(baseBody, 'Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  // Scenario 3: Correct secret → 202
  it('accepts requests with correct secret', async () => {
    const res = await POST(makeRequest(baseBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(202)
  })

  it('returns 401 when LINDY_INTAKE_SECRET env var is not configured', async () => {
    delete process.env.LINDY_INTAKE_SECRET
    const res = await POST(makeRequest(baseBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/documents/intake — file type validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINDY_INTAKE_SECRET = SECRET
    vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-1' } as never)
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.$transaction).mockResolvedValue([])
  })

  it('rejects unsupported file types with 415', async () => {
    const res = await POST(
      makeRequest({ ...baseBody, fileType: 'exe', fileName: 'bad.exe' }, `Bearer ${SECRET}`)
    )
    expect(res.status).toBe(415)
    const body = await res.json()
    expect(body.error).toMatch(/unsupported file type/i)
  })

  it('rejects .csv with 415', async () => {
    const res = await POST(
      makeRequest({ ...baseBody, fileType: 'csv', fileName: 'data.csv' }, `Bearer ${SECRET}`)
    )
    expect(res.status).toBe(415)
  })

  it('accepts supported types: txt, md (passed if mocks cooperate)', async () => {
    for (const fileType of ['txt', 'md']) {
      vi.clearAllMocks()
      vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
      vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-1' } as never)
      vi.mocked(prisma.client.findMany).mockResolvedValue([])
      vi.mocked(prisma.$transaction).mockResolvedValue([])

      const res = await POST(
        makeRequest({ ...baseBody, fileType, fileName: `test.${fileType}` }, `Bearer ${SECRET}`)
      )
      expect(res.status).not.toBe(415)
    }
  })
})

describe('POST /api/documents/intake — file size limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINDY_INTAKE_SECRET = SECRET
    vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-1' } as never)
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.$transaction).mockResolvedValue([])
  })

  it('rejects payload exceeding ~14 MB (representing >10 MB file) with 413', async () => {
    const oversizedBase64 = 'A'.repeat(Math.ceil(10 * 1024 * 1024 * 1.5))
    const res = await POST(
      makeRequest({ ...baseBody, fileBase64: oversizedBase64 }, `Bearer ${SECRET}`)
    )
    expect(res.status).toBe(413)
  })
})

describe('POST /api/documents/intake — deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINDY_INTAKE_SECRET = SECRET
    vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.$transaction).mockResolvedValue([])
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-new' } as never)
  })

  // Scenario 4: Same Drive ID + same hash → 200 duplicate
  it('returns duplicate=true when same googleDriveFileId with same content hash exists', async () => {
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue({
      id: 'existing-doc',
      contentHash: MOCK_EXTRACTION.contentHash,
    } as never)

    const res = await POST(
      makeRequest({ ...baseBody, googleDriveFileId: 'drive-file-abc' }, `Bearer ${SECRET}`)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(body.existingDocumentId).toBe('existing-doc')
  })

  // Scenario 5: Hash-only duplicate (non-empty text, no Drive ID) → 200 duplicate
  it('returns duplicate=true when content hash matches an existing document (no Drive ID)', async () => {
    // No Drive ID in request → Drive ID findFirst is skipped
    // The hash check is the only findFirst call
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue({
      id: 'hash-match-doc',
      contentHash: MOCK_EXTRACTION.contentHash,
    } as never)

    const res = await POST(makeRequest(baseBody, `Bearer ${SECRET}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
  })

  // Scenario 6: Empty extraction → skip hash check (scanned PDFs would false-positive otherwise)
  it('skips hash dedup and proceeds for empty-text documents (scanned/image-based)', async () => {
    vi.mocked(extractDocumentText).mockResolvedValue({
      text: '',
      contentHash: 'e3b0c44298fc1c149afbf4c8996fb924',
    })
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'scan-doc-1' } as never)

    const res = await POST(makeRequest(baseBody, `Bearer ${SECRET}`))
    // Must NOT return 200 duplicate — must proceed to create the document
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.warning).toMatch(/no text was extracted/i)
    expect(prisma.sourceDocument.create).toHaveBeenCalled()
  })
})

describe('POST /api/documents/intake — client matching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.LINDY_INTAKE_SECRET = SECRET
    vi.mocked(extractDocumentText).mockResolvedValue(MOCK_EXTRACTION)
    vi.mocked(prisma.sourceDocument.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sourceDocument.create).mockResolvedValue({ id: 'doc-1' } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([])
  })

  // Scenario 9: Exactly one match → clientMatched: true
  it('matches client when exactly one active client matches the hint', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', name: 'Acme Corp' },
    ] as never)

    const res = await POST(
      makeRequest({ ...baseBody, clientHint: 'Acme' }, `Bearer ${SECRET}`)
    )
    const body = await res.json()
    expect(res.status).toBe(202)
    expect(body.clientMatched).toBe(true)
    expect(vi.mocked(prisma.sourceDocument.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: 'c1' }),
      })
    )
  })

  // Scenario 10: Multiple matches → clientMatched: false (ambiguous — never auto-pick)
  it('leaves client unmatched when multiple clients match the hint', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', name: 'Acme Corp' },
      { id: 'c2', name: 'Acme Holdings LLC' },
    ] as never)

    const res = await POST(
      makeRequest({ ...baseBody, clientHint: 'Acme' }, `Bearer ${SECRET}`)
    )
    const body = await res.json()
    expect(res.status).toBe(202)
    expect(body.clientMatched).toBe(false)
    expect(vi.mocked(prisma.sourceDocument.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: null }),
      })
    )
  })

  // Scenario 11: No match → clientMatched: false
  it('leaves client unmatched when no active clients match the hint', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      { id: 'c1', name: 'Totally Different Corp' },
    ] as never)

    const res = await POST(
      makeRequest({ ...baseBody, clientHint: 'Acme' }, `Bearer ${SECRET}`)
    )
    const body = await res.json()
    expect(res.status).toBe(202)
    expect(body.clientMatched).toBe(false)
  })
})
