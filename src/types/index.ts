// ─── Enums (string literals matching schema) ──────────────────────────────────

export type ClientStatus = 'ACTIVE' | 'ON_HOLD' | 'CHURNED' | 'ONBOARDING'
export type ClientHealth = 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK'

export type VAStatus = 'ACTIVE' | 'ON_LEAVE' | 'TRANSITIONING' | 'INACTIVE'

export type GamePlanStatus = 'ACTIVE' | 'SUPERSEDED' | 'COMPLETED' | 'ARCHIVED'

export type ObjectiveStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED'

export type ItemStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_CLIENT'
  | 'WAITING_ON_VA'
  | 'WAITING_ON_GOLDBAR'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NEEDS_CLARIFICATION'

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type OwnerType = 'CLIENT' | 'VA' | 'ACCOUNT_MANAGER' | 'GOLDBAR' | 'OTHER' | 'UNASSIGNED'

export type DeadlineStatus = 'CONFIRMED' | 'MISSING' | 'IMPLIED'

export type ItemSource = 'SLACK' | 'MANUAL' | 'GAME_PLAN'

export type Confidence = 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'

export type ReviewType =
  | 'POSSIBLE_DUPLICATE'
  | 'MISSING_DEADLINE'
  | 'UNCLEAR_OWNER'
  | 'UNCLEAR_CLIENT'
  | 'UNCLEAR_VA'
  | 'POSSIBLE_COMPLETION'
  | 'POSSIBLE_DEADLINE_CHANGE'
  | 'CONFLICTING_INFORMATION'
  | 'MEDIUM_CONFIDENCE_EXTRACTION'
  | 'NEW_GAME_PLAN'
  | 'PRIORITY_CHANGE'

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'EDITED_AND_APPROVED' | 'REJECTED' | 'IGNORED'

export type AnalysisStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'

export type MessageClassification =
  | 'NEW_ITEM'
  | 'GAME_PLAN'
  | 'UPDATE'
  | 'COMPLETION'
  | 'DEADLINE_CHANGE'
  | 'OWNER_CHANGE'
  | 'BLOCKER'
  | 'INFORMATIONAL'
  | 'DUPLICATE'
  | 'NEEDS_REVIEW'
  | 'UNCLEAR'

// ─── Dashboard summary types ──────────────────────────────────────────────────

export interface DashboardMetrics {
  totalClients: number
  totalVAs: number
  openItems: number
  overdueItems: number
  dueSoonItems: number
  blockedItems: number
  missingDeadlines: number
  missingOwners: number
  myFollowUps: number
  atRiskClients: number
  needsAttentionClients: number
  pendingReviews: number
  staleItems: number
  lastSync: Date | null
  syncStatus: 'ok' | 'stale' | 'failed' | 'never'
}

export interface ClientSummary {
  id: string
  name: string
  status: ClientStatus
  health: ClientHealth
  healthReasons: string[]
  vaCount: number
  openItemCount: number
  overdueCount: number
  blockedCount: number
  missingDeadlineCount: number
  amAttentionCount: number
  nextCheckIn: Date | null
  lastActivity: Date | null
  lastSlackSync: Date | null
  accountManager: string
}

export interface FollowUpItem {
  id: string
  clientName: string
  vaName: string | null
  title: string
  owner: string | null
  ownerType: OwnerType
  deadline: Date | null
  amFollowUpDate: Date | null
  status: ItemStatus
  priority: Priority
  lastConfirmed: Date | null
  isOverdue: boolean
  isDueSoon: boolean
  waitingSince: Date | null
  waitingFor: string | null
}

export interface ChangeLogEntry {
  id: string
  openItemId: string
  itemTitle: string
  clientName: string
  vaName: string | null
  changedAt: Date
  field: string
  previousValue: string | null
  newValue: string | null
  reason: string | null
  source: string | null
  sourceLink: string | null
  changedBy: string | null
}
