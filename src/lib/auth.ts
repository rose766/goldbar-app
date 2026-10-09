// Shared auth helpers used by layout (server component) and tests.
// Pure functions only — no Node.js-specific imports so this is safe in any runtime.

export function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function isValidSessionToken(token: string): boolean {
  const secret = process.env.SESSION_SECRET
  if (!secret || !token) return false
  return constantTimeEqual(token, secret)
}
