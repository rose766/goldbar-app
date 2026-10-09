/**
 * Tests for /api/review/[id] PATCH route
 * Covers: double-approve prevention, client-not-found blocking,
 * server-side clientId re-validation, happy path approval and rejection.
 * All Prisma calls are mocked — no live database required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mocks (top-level — Vitest hoists vi.mock calls) ─────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reviewItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    openItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    openItemHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/health', () => ({
  computeItemFlags: vi.fn().mockReturnValue({
    isOverdue: false,
    isStale: false,
    isBlocked: false,
    isDueSoon: false,
  }),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PATCH } from '@/app/api/review/[id]/route'
import { prisma } from '@/lib/prisma'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(action: string) {
  return new NextRequest('http://localhost/api/review/test-id', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

function pendingReviewItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    status: 'PENDING',
    openItemId: null,
    sourceDocumentId: 'doc-1',
    sourceLink: null,
    sourceMessage: null,
    proposedData: JSON.stringify({
      clientId: 'client-1',
      title: 'Test Open Item',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      ownerType: 'UNASSIGNED',
      amFollowUp: false,
      missingDeadline: false,
      missingOwner: false,
      clientNotFound: false,
    }),
    openItem: null,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PATCH /api/review/[id] — double-approve prevention', () => {
  beforeEach(() => {
    vi.mocked(prisma.reviewItem.update).mockReset()
    vi.mocked(prisma.openItem.create).mockReset()
    vi.mocked(prisma.client.findUnique).mockReset()
  })

  it('returns 409 when trying to approve an already-approved item', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({ status: 'APPROVED' }) as never
    )

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already been reviewed/i)

    // ReviewItem must NOT be updated again
    expect(prisma.reviewItem.update).not.toHaveBeenCalled()
  })

  it('returns 409 when trying to reject an already-rejected item', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({ status: 'REJECTED' }) as never
    )

    const res = await PATCH(makeRequest('REJECT'), { params: { id: 'review-1' } })
    expect(res.status).toBe(409)
  })

  it('returns 409 when trying to ignore an already-ignored item', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({ status: 'IGNORED' }) as never
    )

    const res = await PATCH(makeRequest('IGNORE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/review/[id] — client-not-found blocking', () => {
  beforeEach(() => {
    vi.mocked(prisma.reviewItem.update).mockReset()
    vi.mocked(prisma.openItem.create).mockReset()
    vi.mocked(prisma.client.findUnique).mockReset()
  })

  // Scenario 12: APPROVE with clientId=null and no openItemId → 422, not APPROVED
  it('returns 422 when approving a new proposal with no clientId (clientNotFound)', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({
        proposedData: JSON.stringify({
          clientId: null,
          title: 'Orphan item',
          clientNotFound: true,
        }),
      }) as never
    )

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/no client/i)

    // Must NOT create an OpenItem
    expect(prisma.openItem.create).not.toHaveBeenCalled()

    // Must NOT mark ReviewItem as APPROVED
    expect(prisma.reviewItem.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    )
  })

  it('returns 422 when approving a new proposal with an empty-string clientId', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({
        proposedData: JSON.stringify({ clientId: '', title: 'Empty client item' }),
      }) as never
    )

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(422)
    expect(prisma.openItem.create).not.toHaveBeenCalled()
  })

  it('also blocks EDIT_AND_APPROVE when clientId is null', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(
      pendingReviewItem({
        proposedData: JSON.stringify({ clientId: null, title: 'No client' }),
      }) as never
    )

    const res = await PATCH(makeRequest('EDIT_AND_APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(422)
  })
})

describe('PATCH /api/review/[id] — server-side clientId re-validation', () => {
  beforeEach(() => {
    vi.mocked(prisma.reviewItem.update).mockReset()
    vi.mocked(prisma.openItem.create).mockReset()
  })

  // Scenario 13: clientId present in proposedData but deleted from DB → 422
  it('returns 422 when clientId exists in proposedData but not in the database', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(pendingReviewItem() as never)
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null) // client was deleted

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)

    expect(prisma.openItem.create).not.toHaveBeenCalled()
    expect(prisma.reviewItem.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    )
  })
})

describe('PATCH /api/review/[id] — happy path', () => {
  beforeEach(() => {
    vi.mocked(prisma.reviewItem.update).mockReset()
    vi.mocked(prisma.openItem.create).mockReset()
  })

  // Scenario 14: Valid clientId → 200, OpenItem created, ReviewItem marked APPROVED
  it('creates an OpenItem and marks ReviewItem APPROVED when clientId is valid', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(pendingReviewItem() as never)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'client-1', staleThresholdDays: 5 } as never)
    vi.mocked(prisma.openItem.create).mockResolvedValue({ id: 'new-open-item-1' } as never)
    vi.mocked(prisma.reviewItem.update).mockResolvedValue({ id: 'review-1', status: 'APPROVED' } as never)

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(200)

    expect(prisma.openItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'client-1',
          sourceDocumentId: 'doc-1',
          source: 'DOCUMENT',
        }),
      })
    )

    expect(prisma.reviewItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    )
  })

  it('marks ReviewItem REJECTED and never creates an OpenItem on REJECT', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(pendingReviewItem() as never)
    vi.mocked(prisma.reviewItem.update).mockResolvedValue({ id: 'review-1', status: 'REJECTED' } as never)

    const res = await PATCH(makeRequest('REJECT'), { params: { id: 'review-1' } })
    expect(res.status).toBe(200)

    expect(prisma.openItem.create).not.toHaveBeenCalled()
    expect(prisma.reviewItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      })
    )
  })

  it('returns 404 when review item does not exist', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(null)

    const res = await PATCH(makeRequest('APPROVE'), { params: { id: 'nonexistent' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid action', async () => {
    vi.mocked(prisma.reviewItem.findUnique).mockResolvedValue(pendingReviewItem() as never)
    vi.mocked(prisma.client.findUnique).mockResolvedValue({ id: 'client-1', staleThresholdDays: 5 } as never)

    const res = await PATCH(makeRequest('DANCE'), { params: { id: 'review-1' } })
    expect(res.status).toBe(400)
  })
})
