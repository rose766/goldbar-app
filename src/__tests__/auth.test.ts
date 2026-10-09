/**
 * Tests for dashboard authentication
 * Covers: token validation helper, middleware protection, login/logout routes.
 * No live services required — uses NextRequest/NextResponse from next/server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Imports (no vi.mock needed — auth modules use no external services) ─────

import { isValidSessionToken, constantTimeEqual } from '@/lib/auth'
import { middleware } from '@/middleware'
import { POST as loginPOST } from '@/app/api/auth/login/route'
import { POST as logoutPOST } from '@/app/api/auth/logout/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_SECRET = 'test-session-secret-32-chars-long!!'

function makePageRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'GET',
    headers: cookie ? { Cookie: `session=${cookie}` } : {},
  })
}

function makeApiRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'GET',
    headers: cookie ? { Cookie: `session=${cookie}` } : {},
  })
}

function makeLoginRequest(password: unknown, ip?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ip) headers['x-forwarded-for'] = ip
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ password }),
  })
}

let ipCounter = 0
function uniqueIp(): string {
  return `10.0.0.${++ipCounter}`
}

// ─── constantTimeEqual ────────────────────────────────────────────────────────

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('hello', 'hello')).toBe(true)
  })

  it('returns false for strings that differ in content', () => {
    expect(constantTimeEqual('hello', 'world')).toBe(false)
  })

  it('returns false for strings that differ in length', () => {
    expect(constantTimeEqual('short', 'longer-string')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })
})

// ─── isValidSessionToken ──────────────────────────────────────────────────────

describe('isValidSessionToken', () => {
  afterEach(() => {
    delete process.env.SESSION_SECRET
  })

  it('returns false when SESSION_SECRET is not configured', () => {
    delete process.env.SESSION_SECRET
    expect(isValidSessionToken(VALID_SECRET)).toBe(false)
  })

  it('returns false for an empty token', () => {
    process.env.SESSION_SECRET = VALID_SECRET
    expect(isValidSessionToken('')).toBe(false)
  })

  it('returns false for a wrong token', () => {
    process.env.SESSION_SECRET = VALID_SECRET
    expect(isValidSessionToken('completely-wrong-token')).toBe(false)
  })

  it('returns true when the token exactly matches SESSION_SECRET', () => {
    process.env.SESSION_SECRET = VALID_SECRET
    expect(isValidSessionToken(VALID_SECRET)).toBe(true)
  })
})

// ─── Middleware — page route protection ───────────────────────────────────────

describe('middleware — page requests', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = VALID_SECRET
  })
  afterEach(() => {
    delete process.env.SESSION_SECRET
  })

  it('redirects unauthenticated requests to /login', () => {
    const res = middleware(makePageRequest('/'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('includes the original path as ?from= in the redirect', () => {
    const res = middleware(makePageRequest('/clients'))
    expect(res.headers.get('location')).toContain('from=')
  })

  it('passes authenticated requests through', () => {
    const res = middleware(makePageRequest('/', VALID_SECRET))
    expect(res.status).toBe(200)
  })

  it('redirects requests with a wrong session cookie', () => {
    const res = middleware(makePageRequest('/', 'wrong-token'))
    expect(res.status).toBe(307)
  })

  // Exempt paths ──────────────────────────────────────────────────────────────

  it('does not redirect /login (exempt)', () => {
    const res = middleware(makePageRequest('/login'))
    expect(res.status).toBe(200)
  })
})

// ─── Middleware — API route protection ───────────────────────────────────────

describe('middleware — API requests', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = VALID_SECRET
  })
  afterEach(() => {
    delete process.env.SESSION_SECRET
  })

  it('returns 401 for unauthenticated requests to /api/clients', async () => {
    const res = middleware(makeApiRequest('/api/clients'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('returns 401 for unauthenticated requests to /api/review/:id (approve/reject)', () => {
    expect(middleware(makeApiRequest('/api/review/some-id')).status).toBe(401)
  })

  it('returns 401 for unauthenticated requests to /api/items', () => {
    expect(middleware(makeApiRequest('/api/items')).status).toBe(401)
  })

  it('returns 401 for unauthenticated requests to /api/documents/upload', () => {
    expect(middleware(makeApiRequest('/api/documents/upload')).status).toBe(401)
  })

  it('passes authenticated API requests through', () => {
    const res = middleware(makeApiRequest('/api/clients', VALID_SECRET))
    expect(res.status).toBe(200)
  })

  // Exempt API paths ──────────────────────────────────────────────────────────

  it('exempts /api/auth/login from session check', () => {
    const res = middleware(makeApiRequest('/api/auth/login'))
    expect(res.status).toBe(200)
  })

  it('exempts /api/auth/logout from session check', () => {
    const res = middleware(makeApiRequest('/api/auth/logout'))
    expect(res.status).toBe(200)
  })

  it('exempts /api/documents/intake (has its own LINDY_INTAKE_SECRET check)', () => {
    const res = middleware(makeApiRequest('/api/documents/intake'))
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/auth/login ────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.DASHBOARD_PASSWORD = 'correct-password'
    process.env.SESSION_SECRET = VALID_SECRET
    process.env.COOKIE_SECURE = 'false'
  })
  afterEach(() => {
    delete process.env.DASHBOARD_PASSWORD
    delete process.env.SESSION_SECRET
    delete process.env.COOKIE_SECURE
  })

  it('returns 401 for an incorrect password', async () => {
    const res = await loginPOST(makeLoginRequest('wrong-password'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/incorrect/i)
  })

  it('returns 401 when no password is provided', async () => {
    const res = await loginPOST(makeLoginRequest(undefined))
    expect(res.status).toBe(401)
  })

  it('returns 500 when DASHBOARD_PASSWORD is not configured', async () => {
    delete process.env.DASHBOARD_PASSWORD
    const res = await loginPOST(makeLoginRequest('anything'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when SESSION_SECRET is not configured', async () => {
    delete process.env.SESSION_SECRET
    const res = await loginPOST(makeLoginRequest('correct-password'))
    expect(res.status).toBe(500)
  })

  it('returns 200 and sets an HttpOnly session cookie on correct password', async () => {
    const res = await loginPOST(makeLoginRequest('correct-password'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('session=')
    expect(setCookie.toLowerCase()).toContain('httponly')
  })

  it('the session cookie set on login passes middleware validation', async () => {
    const loginRes = await loginPOST(makeLoginRequest('correct-password'))
    expect(loginRes.status).toBe(200)

    // Extract cookie value from Set-Cookie header
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const match = setCookie.match(/session=([^;]+)/)
    expect(match).not.toBeNull()
    const cookieValue = match![1]

    // The cookie value should pass middleware
    const apiRes = middleware(makeApiRequest('/api/clients', cookieValue))
    expect(apiRes.status).toBe(200)
  })
})

// ─── Rate limiting on POST /api/auth/login ───────────────────────────────────

describe('POST /api/auth/login — rate limiting', () => {
  beforeEach(() => {
    process.env.DASHBOARD_PASSWORD = 'correct-password'
    process.env.SESSION_SECRET = VALID_SECRET
    process.env.COOKIE_SECURE = 'false'
  })
  afterEach(() => {
    delete process.env.DASHBOARD_PASSWORD
    delete process.env.SESSION_SECRET
    delete process.env.COOKIE_SECURE
  })

  it('allows up to 5 failed attempts before blocking', async () => {
    const ip = uniqueIp()
    for (let i = 0; i < 5; i++) {
      const res = await loginPOST(makeLoginRequest('wrong', ip))
      expect(res.status).toBe(401)
    }
    // 6th attempt should be blocked
    const res = await loginPOST(makeLoginRequest('wrong', ip))
    expect(res.status).toBe(429)
  })

  it('returns 429 with Retry-After header when blocked', async () => {
    const ip = uniqueIp()
    for (let i = 0; i < 5; i++) {
      await loginPOST(makeLoginRequest('wrong', ip))
    }
    const res = await loginPOST(makeLoginRequest('wrong', ip))
    expect(res.status).toBe(429)
    const retryAfter = res.headers.get('retry-after')
    expect(retryAfter).not.toBeNull()
    expect(Number(retryAfter)).toBeGreaterThan(0)
  })

  it('does not count a successful login as a failure', async () => {
    const ip = uniqueIp()
    for (let i = 0; i < 4; i++) {
      await loginPOST(makeLoginRequest('wrong', ip))
    }
    // 5th attempt is correct — should succeed
    const res = await loginPOST(makeLoginRequest('correct-password', ip))
    expect(res.status).toBe(200)
  })

  it('clears the failure counter after a successful login', async () => {
    const ip = uniqueIp()
    for (let i = 0; i < 4; i++) {
      await loginPOST(makeLoginRequest('wrong', ip))
    }
    // Successful login resets counter
    await loginPOST(makeLoginRequest('correct-password', ip))
    // Now 5 more failures should be allowed, not a block
    for (let i = 0; i < 5; i++) {
      const res = await loginPOST(makeLoginRequest('wrong', ip))
      expect(res.status).toBe(401) // still allowed, not blocked yet
    }
  })

  it('tracks rate limits per IP independently', async () => {
    const ip1 = uniqueIp()
    const ip2 = uniqueIp()
    // Exhaust ip1
    for (let i = 0; i < 5; i++) {
      await loginPOST(makeLoginRequest('wrong', ip1))
    }
    // ip1 is blocked
    expect((await loginPOST(makeLoginRequest('wrong', ip1))).status).toBe(429)
    // ip2 is unaffected
    expect((await loginPOST(makeLoginRequest('wrong', ip2))).status).toBe(401)
  })

  it('uses cf-connecting-ip header when present (Cloudflare)', async () => {
    const cfIp = `10.1.${++ipCounter}.1`
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': cfIp,
        'x-forwarded-for': '1.2.3.4', // should be ignored in favor of cf header
      },
      body: JSON.stringify({ password: 'wrong' }),
    })
    // Exhaust cfIp via cf-connecting-ip
    for (let i = 0; i < 5; i++) {
      const r = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': cfIp },
        body: JSON.stringify({ password: 'wrong' }),
      })
      await loginPOST(r)
    }
    const blocked = await loginPOST(req)
    expect(blocked.status).toBe(429)
    // x-forwarded-for IP (1.2.3.4) should still be unblocked
    const xffReq = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ password: 'wrong' }),
    })
    expect((await loginPOST(xffReq)).status).toBe(401)
  })
})

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears the session cookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/logout', { method: 'POST' })
    const res = await logoutPOST()
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('session=')
    expect(setCookie).toMatch(/max-age=0/i)
  })
})
