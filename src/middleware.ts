import { NextRequest, NextResponse } from 'next/server'

// Paths that skip session auth entirely.
// /api/documents/intake is excluded here because it carries its own LINDY_INTAKE_SECRET check.
const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/',
  '/api/documents/intake',
  '/_next/',
  '/favicon.ico',
]

// Inlined here (not imported from @/lib/auth) so the middleware remains self-contained
// for the Next.js Edge runtime — avoids any potential module-resolution issues at the edge.
function isValidToken(token: string): boolean {
  const secret = process.env.SESSION_SECRET
  if (!secret || !token) return false
  const len = Math.max(token.length, secret.length)
  let diff = token.length ^ secret.length
  for (let i = 0; i < len; i++) {
    diff |= (token.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = request.cookies.get('session')?.value ?? ''

  if (!isValidToken(session)) {
    // API routes return JSON 401; page routes redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Match everything except static files and images that Next.js serves internally
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
