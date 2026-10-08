import Link from 'next/link'
import { cn, statusBadge, priorityBadge, priorityLabel, statusLabel, formatDate, daysOverdue, daysWaiting } from '@/lib/utils'
import { Clock, AlertCircle, AlertTriangle, User, Calendar, Users } from 'lucide-react'
import type { Priority, ItemStatus, OwnerType } from '@/types'

interface ItemRowProps {
  id: string
  title: string
  clientName: string
  vaName?: string | null
  owner?: string | null
  ownerType: OwnerType
  status: ItemStatus
  priority: Priority
  deadline?: Date | string | null
  amFollowUpDate?: Date | string | null
  isOverdue?: boolean
  isDueSoon?: boolean
  isStale?: boolean
  isMissingDeadline?: boolean
  isMissingOwner?: boolean
  amFollowUp?: boolean
  waitingSince?: Date | string | null
  nextStep?: string | null
  compact?: boolean
}

export function ItemRow({
  id, title, clientName, vaName, owner, ownerType, status, priority,
  deadline, isOverdue, isDueSoon, isStale, isMissingDeadline, isMissingOwner,
  amFollowUp, waitingSince, nextStep, compact = false
}: ItemRowProps) {
  const daysOver = isOverdue && deadline ? daysOverdue(new Date(deadline)) : 0
  const daysWait = waitingSince ? daysWaiting(new Date(waitingSince)) : 0

  return (
    <Link
      href={`/items/${id}`}
      className={cn(
        'block rounded-lg border transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600',
        isOverdue
          ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/10'
          : isDueSoon
          ? 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + flags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={cn('text-sm font-semibold', compact ? 'text-xs' : '', isOverdue ? 'text-red-800 dark:text-red-300' : 'text-slate-900 dark:text-slate-50')}>
              {title}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-3 w-3" />
                {daysOver}d overdue
              </span>
            )}
            {isDueSoon && !isOverdue && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Clock className="h-3 w-3" />
                Due soon
              </span>
            )}
            {isStale && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                ⚠️ Stale
              </span>
            )}
            {isMissingDeadline && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                No deadline
              </span>
            )}
            {isMissingOwner && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                Unassigned
              </span>
            )}
            {amFollowUp && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                ★ My Follow-Up
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {clientName}
              {vaName && <span className="text-slate-400 dark:text-slate-600">/ {vaName}</span>}
            </span>
            {owner && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {owner}
              </span>
            )}
            {deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(deadline)}
              </span>
            )}
            {waitingSince && daysWait > 0 && (
              <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <AlertTriangle className="h-3 w-3" />
                Waiting {daysWait}d
              </span>
            )}
          </div>

          {/* Next step */}
          {!compact && nextStep && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
              <span className="font-medium">Next:</span> {nextStep}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={cn(priorityBadge(priority))}>{priorityLabel(priority)}</span>
          <span className={cn(statusBadge(status))}>{statusLabel(status)}</span>
        </div>
      </div>
    </Link>
  )
}
