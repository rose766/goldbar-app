import { NextRequest, NextResponse } from 'next/server'

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Runs in Node.js runtime (not Edge), so module-level state persists across
// requests within the same server process. Resets on server restart — acceptable
// for a single-instance dev tool. Each IP is allowed MAX_FAILURES failed attempts
// within WINDOW_MS before receiving 429; a successful login resets that IP's count.

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface RateLimitRecord {
  failures: number
  resetAt: number
}

const loginAttempts = new Map<string, RateLimitRecord>()

function getClientIp(request: NextRequest): string {
  // Cloudflare sets CF-Connecting-IP; generic proxies set X-Forwarded-For
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const rec = loginAttempts.get(ip)

  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(ip, { failures: 0, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (rec.failures >= MAX_FAILURES) {
    return { allowed: false, retryAfterSeconds: Math.ceil((rec.resetAt - now) / 1000) }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

function recordFailure(ip: string): void {
  const now = Date.now()
  const rec = loginAttempts.get(ip) ?? { failures: 0, resetAt: now + WINDOW_MS }
  rec.failures++
  loginAttempts.set(ip, rec)
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// ─── Constant-time comparison ─────────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfterSeconds } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many failed login attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    )
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const { password } = body as { password?: unknown }

  const expected = process.env.DASHBOARD_PASSWORD
  const secret = process.env.SESSION_SECRET

  if (!expected || !secret) {
    return NextResponse.json(
      { error: 'Authentication is not configured on this server.' },
      { status: 500 }
    )
  }

  if (typeof password !== 'string' || !constantTimeEqual(password, expected)) {
    recordFailure(ip)
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  clearAttempts(ip)
  const isSecure = process.env.COOKIE_SECURE !== 'false'
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', secret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
  return response
}
