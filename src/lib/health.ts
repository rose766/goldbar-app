import type { ClientHealth } from '@/types'
import { differenceInDays } from 'date-fns'

interface HealthInput {
  overdueCount: number
  blockedCount: number
  missingDeadlineCount: number
  staleItemCount: number
  waitingOnClientDays: number // max days waiting on client across all items
  unresolvedClientIssues: number
  performanceFlagCount: number
  repeatedMissedCommitments: number
  pendingReviewCount: number
  lastSlackSync: Date | null
}

interface HealthResult {
  health: ClientHealth
  reasons: string[]
  score: number // internal score for tie-breaking
}

export function calculateClientHealth(input: HealthInput): HealthResult {
  const reasons: string[] = []
  let score = 0

  // Overdue items — strong signal
  if (input.overdueCount >= 3) {
    score += 40
    reasons.push(`${input.overdueCount} overdue items`)
  } else if (input.overdueCount === 2) {
    score += 25
    reasons.push(`${input.overdueCount} overdue items`)
  } else if (input.overdueCount === 1) {
    score += 15
    reasons.push(`1 overdue item`)
  }

  // Blocked items
  if (input.blockedCount >= 2) {
    score += 20
    reasons.push(`${input.blockedCount} blocked items`)
  } else if (input.blockedCount === 1) {
    score += 10
    reasons.push(`1 blocked item`)
  }

  // Missing deadlines on open items
  if (input.missingDeadlineCount >= 3) {
    score += 15
    reasons.push(`${input.missingDeadlineCount} items missing deadlines`)
  } else if (input.missingDeadlineCount >= 1) {
    score += 8
    reasons.push(`${input.missingDeadlineCount} item${input.missingDeadlineCount > 1 ? 's' : ''} missing deadlines`)
  }

  // Stale items (no update past threshold)
  if (input.staleItemCount >= 2) {
    score += 15
    reasons.push(`${input.staleItemCount} stale items with no recent update`)
  } else if (input.staleItemCount === 1) {
    score += 8
    reasons.push(`1 stale item with no recent update`)
  }

  // Client not responding
  if (input.waitingOnClientDays >= 7) {
    score += 25
    reasons.push(`Waiting on client for ${input.waitingOnClientDays} days`)
  } else if (input.waitingOnClientDays >= 4) {
    score += 12
    reasons.push(`Waiting on client for ${input.waitingOnClientDays} days`)
  }

  // Unresolved client issues
  if (input.unresolvedClientIssues >= 2) {
    score += 20
    reasons.push(`${input.unresolvedClientIssues} unresolved client issues`)
  } else if (input.unresolvedClientIssues === 1) {
    score += 10
    reasons.push(`1 unresolved client issue`)
  }

  // Performance flags on VAs
  if (input.performanceFlagCount >= 2) {
    score += 20
    reasons.push(`${input.performanceFlagCount} VA performance concerns`)
  } else if (input.performanceFlagCount === 1) {
    score += 10
    reasons.push(`VA performance concern noted`)
  }

  // Repeated missed commitments
  if (input.repeatedMissedCommitments >= 2) {
    score += 25
    reasons.push(`${input.repeatedMissedCommitments} repeated missed commitments`)
  }

  // Pending review items (AI flagged)
  if (input.pendingReviewCount >= 3) {
    score += 5
    reasons.push(`${input.pendingReviewCount} items pending review`)
  }

  // Stale sync
  if (input.lastSlackSync) {
    const daysSinceSync = differenceInDays(new Date(), input.lastSlackSync)
    if (daysSinceSync >= 3) {
      score += 5
      reasons.push(`Slack data is ${daysSinceSync} days old`)
    }
  }

  let health: ClientHealth
  if (score >= 35) {
    health = 'AT_RISK'
  } else if (score >= 12) {
    health = 'NEEDS_ATTENTION'
  } else {
    health = 'ON_TRACK'
  }

  return { health, reasons, score }
}

export function computeItemFlags(item: {
  deadline: Date | null
  status: string
  lastConfirmed: Date | null
  staleThresholdDays?: number
  owner: string | null
  nextStep: string | null
}) {
  const today = new Date()
  const staleThreshold = item.staleThresholdDays ?? 5

  const isOverdue =
    !!item.deadline &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED' &&
    item.deadline < today

  const isDueSoon =
    !!item.deadline &&
    !isOverdue &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED' &&
    differenceInDays(item.deadline, today) <= 3

  const isStale =
    !!item.lastConfirmed &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED' &&
    differenceInDays(today, item.lastConfirmed) >= staleThreshold

  const isMissingDeadline =
    !item.deadline &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED'

  const isMissingOwner = !item.owner || item.owner === 'UNASSIGNED'

  const isMissingNextStep =
    !item.nextStep &&
    item.status !== 'COMPLETED' &&
    item.status !== 'CANCELLED'

  return { isOverdue, isDueSoon, isStale, isMissingDeadline, isMissingOwner, isMissingNextStep }
}
