import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  AWAITING_ASSESSMENT: { label: 'Awaiting Assessment', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  COACHING_IN_PROGRESS: { label: 'Coaching in Progress', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  RECOVERY_PLAN_ACTIVE: { label: 'Recovery Plan Active', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  MONITORING: { label: 'Monitoring', className: 'bg-teal-100 text-teal-700 border-teal-200' },
  AWAITING_CLIENT_INPUT: { label: 'Awaiting Client Input', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  AWAITING_VA_ACTION: { label: 'Awaiting VA Action', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  ESCALATED: { label: 'Escalated', className: 'bg-red-100 text-red-700 border-red-200' },
  RESTAFFING_UNDER_REVIEW: { label: 'Restaffing Under Review', className: 'bg-red-100 text-red-800 border-red-200' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  REOPENED: { label: 'Reopened', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  // Follow-up / action statuses
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  SKIPPED: { label: 'Skipped', className: 'bg-slate-100 text-slate-400 border-slate-200' },
  NOT_STARTED: { label: 'Not Started', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  BLOCKED: { label: 'Blocked', className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-400 border-slate-200' },
  // Escalation statuses
  REVIEWED: { label: 'Reviewed', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  DECIDED: { label: 'Decided', className: 'bg-purple-100 text-purple-700 border-purple-200' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
