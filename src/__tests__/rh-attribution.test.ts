/**
 * Tests for server-side attribution in the Relationship Health module.
 *
 * Verifies that:
 * 1. getCurrentUser() reads from CURRENT_USER_NAME env var
 * 2. POST /api/rh/cases derives createdBy server-side and ignores client body
 * 3. POST /api/rh/cases rejects requests missing required fields
 * 4. Middleware blocks unauthenticated requests to /api/rh/* routes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/current-user'
import { middleware } from '@/middleware'

const VALID_SECRET = 'test-session-secret-32-chars-long!!'

function makeApiRequest(path: string, cookie?: string, method = 'GET'): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: cookie ? { Cookie: `session=${cookie}` } : {},
  })
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────

describe('getCurrentUser', () => {
  afterEach(() => {
    delete process.env.CURRENT_USER_NAME
  })

  it('returns "Rose" when CURRENT_USER_NAME is not set', () => {
    delete process.env.CURRENT_USER_NAME
    expect(getCurrentUser()).toBe('Rose')
  })

  it('returns the configured name when CURRENT_USER_NAME is set', () => {
    process.env.CURRENT_USER_NAME = 'Alice'
    expect(getCurrentUser()).toBe('Alice')
  })

  it('returns a custom name with spaces', () => {
    process.env.CURRENT_USER_NAME = 'Rose M.'
    expect(getCurrentUser()).toBe('Rose M.')
  })
})

// ─── Middleware — /api/rh/* route protection ──────────────────────────────────

describe('middleware — /api/rh/* route protection', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = VALID_SECRET
  })
  afterEach(() => {
    delete process.env.SESSION_SECRET
  })

  it('returns 401 for unauthenticated GET /api/rh/cases', () => {
    const res = middleware(makeApiRequest('/api/rh/cases'))
    expect(res.status).toBe(401)
  })

  it('returns 401 for unauthenticated POST /api/rh/cases', () => {
    const res = middleware(makeApiRequest('/api/rh/cases', undefined, 'POST'))
    expect(res.status).toBe(401)
  })

  it('returns 401 for unauthenticated GET /api/rh/cases/some-id', () => {
    const res = middleware(makeApiRequest('/api/rh/cases/some-id'))
    expect(res.status).toBe(401)
  })

  it('returns 401 for unauthenticated GET /api/rh/scenarios', () => {
    const res = middleware(makeApiRequest('/api/rh/scenarios'))
    expect(res.status).toBe(401)
  })

  it('passes authenticated requests to /api/rh/* through', () => {
    const res = middleware(makeApiRequest('/api/rh/cases', VALID_SECRET))
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/rh/cases — validation ─────────────────────────────────────────
// These tests call the route handler directly with a mocked Prisma so we can
// verify validation without a real database.

import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    rHCaseCounter: {
      upsert: vi.fn().mockResolvedValue({ lastNum: 1 }),
    },
    rHCase: {
      create: vi.fn().mockResolvedValue({
        id: 'test-id',
        caseNumber: 'GB-RH-00001',
        client: { id: 'c1', name: 'Test Client' },
        va: null,
      }),
    },
  },
}))

import { POST as casesPOST } from '@/app/api/rh/cases/route'

function makeCasesPost(body: Record<string, unknown>, cookie?: string): NextRequest {
  return new NextRequest('http://localhost/api/rh/cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: `session=${cookie}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

const VALID_CASE_BODY = {
  clientId: 'client-id-1',
  assignedAm: 'Rose',
  title: 'Test Case',
  description: 'Test description for the case',
  dateIdentified: new Date().toISOString(),
}

describe('POST /api/rh/cases — validation', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = VALID_SECRET
    process.env.CURRENT_USER_NAME = 'Rose'
  })
  afterEach(() => {
    delete process.env.SESSION_SECRET
    delete process.env.CURRENT_USER_NAME
    vi.clearAllMocks()
  })

  it('returns 400 when clientId is missing', async () => {
    const { clientId: _, ...body } = VALID_CASE_BODY
    const res = await casesPOST(makeCasesPost(body))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing required/i)
  })

  it('returns 400 when title is missing', async () => {
    const { title: _, ...body } = VALID_CASE_BODY
    const res = await casesPOST(makeCasesPost(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    const { description: _, ...body } = VALID_CASE_BODY
    const res = await casesPOST(makeCasesPost(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 when dateIdentified is missing', async () => {
    const { dateIdentified: _, ...body } = VALID_CASE_BODY
    const res = await casesPOST(makeCasesPost(body))
    expect(res.status).toBe(400)
  })

  it('succeeds with all required fields — createdBy derived server-side', async () => {
    const res = await casesPOST(makeCasesPost(VALID_CASE_BODY))
    expect(res.status).toBe(201)
  })

  it('ignores client-provided createdBy and uses server value instead', async () => {
    process.env.CURRENT_USER_NAME = 'ServerUser'
    const { prisma } = await import('@/lib/prisma')
    const res = await casesPOST(
      makeCasesPost({ ...VALID_CASE_BODY, createdBy: 'MaliciousClient' })
    )
    expect(res.status).toBe(201)
    // Verify prisma.rHCase.create was called with the server value, not the client value
    expect(prisma.rHCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdBy: 'ServerUser' }),
      })
    )
  })

  it('uses CURRENT_USER_NAME env var for createdBy when set', async () => {
    process.env.CURRENT_USER_NAME = 'TestUser'
    const { prisma } = await import('@/lib/prisma')
    await casesPOST(makeCasesPost(VALID_CASE_BODY))
    expect(prisma.rHCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdBy: 'TestUser' }),
      })
    )
  })

  it('defaults createdBy to "Rose" when CURRENT_USER_NAME is not set', async () => {
    delete process.env.CURRENT_USER_NAME
    const { prisma } = await import('@/lib/prisma')
    await casesPOST(makeCasesPost(VALID_CASE_BODY))
    expect(prisma.rHCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdBy: 'Rose' }),
      })
    )
  })
})
