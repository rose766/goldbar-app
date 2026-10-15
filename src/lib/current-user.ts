/**
 * Returns the display name of the authenticated user.
 *
 * The app uses a single shared credential (SESSION_SECRET). The owner's
 * display name is configured via CURRENT_USER_NAME so that attribution on
 * cases, assessments, actions, and follow-ups is set server-side and never
 * accepted from the client body.
 */
export function getCurrentUser(): string {
  return process.env.CURRENT_USER_NAME ?? 'Rose'
}
