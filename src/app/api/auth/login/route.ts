import { NextRequest, NextResponse } from 'next/server'

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

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
