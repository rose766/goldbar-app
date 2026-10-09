/**
 * Tests for document-ai.ts
 * Covers: ANTHROPIC_API_KEY validation, sanitizeProposal, extraction response parsing.
 * All AI calls are mocked — no live API credentials required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Hoisted mocks (run before vi.mock factories) ─────────────────────────────

const mockCreate = vi.hoisted(() => vi.fn())

// ─── Module mocks (top-level — Vitest hoists vi.mock calls) ──────────────────

vi.mock('@anthropic-ai/sdk', () => ({
  // Use a class so `new Anthropic()` works correctly
  default: class {
    messages = { create: mockCreate }
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findMany: vi.fn() },
    vA: { findMany: vi.fn() },
    openItem: { findMany: vi.fn() },
  },
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { extractFromDocument } from '@/lib/document-ai'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeContext() {
  return {
    clients: [{ id: 'client-1', name: 'Acme Corp', health: 'GREEN' }],
    vas: [{ id: 'va-1', name: 'Jane Smith', clientId: 'client-1', clientName: 'Acme Corp' }],
    openItems: [],
  }
}

function makeTextResponse(json: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] }
}

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    action: 'CREATE_ITEM',
    reviewType: 'MISSING_DEADLINE',
    confidence: 'HIGH',
    aiInterpretation: 'Test interpretation',
    aiReasoning: 'Test reasoning',
    sourceExcerpt: 'Test excerpt',
    clientId: 'client-1',
    clientName: 'Acme Corp',
    vaId: null,
    vaName: null,
    openItemId: null,
    proposedData: {
      title: 'Do something',
      missingDeadline: true,
      missingOwner: false,
      clientNotFound: false,
      vaNotFound: false,
    },
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('extractFromDocument', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  // Scenario 7: ANTHROPIC_API_KEY missing → throws immediately, never calls API
  it('throws immediately if ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    await expect(
      extractFromDocument('some document text', 'Test Doc', makeContext())
    ).rejects.toThrow('ANTHROPIC_API_KEY is not configured')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // Scenario 8: API call throws → error propagates (caller marks document FAILED)
  it('propagates API errors so callers can mark the document FAILED', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'))
    await expect(
      extractFromDocument('some document text', 'Test Doc', makeContext())
    ).rejects.toThrow('API rate limit exceeded')
  })

  it('returns empty array when AI returns an empty JSON array', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockResolvedValueOnce(makeTextResponse([]))
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result).toEqual([])
  })

  it('returns empty array when AI response is not parseable JSON', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'sorry I cannot help' }] })
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result).toEqual([])
  })

  it('strips markdown fences from AI response before parsing', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const wrapped = '```json\n' + JSON.stringify([makeProposal()]) + '\n```'
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: wrapped }] })
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result).toHaveLength(1)
    expect(result[0].action).toBe('CREATE_ITEM')
  })

  it('sanitizes hallucinated clientId → clears it and sets clientNotFound flag', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([makeProposal({ clientId: 'ghost-client-99', clientName: 'Ghost Corp' })])
    )
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result[0].clientId).toBeNull()
    expect(result[0].proposedData.clientNotFound).toBe(true)
    expect(result[0].confidence).toBe('NEEDS_REVIEW')
  })

  it('sanitizes hallucinated vaId → clears it and sets vaNotFound flag', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([makeProposal({ vaId: 'ghost-va-99', vaName: 'Nobody Real' })])
    )
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result[0].vaId).toBeNull()
    expect(result[0].proposedData.vaNotFound).toBe(true)
    expect(result[0].confidence).toBe('NEEDS_REVIEW')
  })

  it('preserves valid clientId and vaId when they exist in context', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([makeProposal({ clientId: 'client-1', vaId: 'va-1', vaName: 'Jane Smith' })])
    )
    const result = await extractFromDocument('some text', 'Test Doc', makeContext())
    expect(result[0].clientId).toBe('client-1')
    expect(result[0].vaId).toBe('va-1')
    expect(result[0].confidence).toBe('HIGH')
  })
})
