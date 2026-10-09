import { NextResponse } from 'next/server'

export async function POST() {
  const isSecure = process.env.COOKIE_SECURE !== 'false'
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 0,
    path: '/',
  })
  return response
}
