import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import {
  formatDate,
  formatRelative,
  statusLabel,
  statusBadge,
  priorityLabel,
  priorityBadge,
  daysOverdue,
  daysWaiting,
  ownerTypeLabel,
  cn,
} from '@/lib/utils'
import Link from 'next/link'
import { AlertCircle, Clock, AlertTriangle, Star } from 'lucide-react'
import type { Priority, ItemStatus, OwnerType } from '@/types'
import { isWithinInterval, addDays, isPast, startOfWeek, endOfWeek } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getFollowUps() {
  const items = await prisma.openItem.findMany({
    where: {
      amFollowUp: true,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    include: {
      client: { select: { name: true } },
      va: { select: { name: true } },
    },
  })

  // Sort: isOverdue desc, priority asc (CRITICAL first), amFollowUpDate asc
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  return items.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    const pa = priorityOrder[a.priority] ?? 4
    const pb = priorityOrder[b.priority] ?? 4
    if (pa !== pb) return pa - pb
    const da = a.amFollowUpDate?.getTime() ?? Infinity
    const db = b.amFollowUpDate?.getTime() ?? Infinity
    return da - db
  })
}

export default async function FollowUpsPage() {
  const items = await getFollowUps()
  const now = new Date()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const todayEnd = addDays(new Date(now.toDateString()), 1)

  const todayCount = items.filter(i =>
    i.amFollowUpDate && i.amFollowUpDate >= new Date(now.toDateString()) && i.amFollowUpDate < todayEnd
  ).length
  const thisWeekCount = items.filter(i =>
    i.amFollowUpDate && i.amFollowUpDate >= new Date(now.toDateString()) && i.amFollowUpDate <= weekEnd
  ).length
  const overdueCount = items.filter(i => i.isOverdue).length
  const highPriorityCount = items.filter(i => i.priority === 'CRITICAL' || i.priority === 'HIGH').length

  return (
    <div>
      <TopBar title="My Follow-Ups" subtitle={`${items.length} active follow-ups`} />

      <div className="p-6 space-y-6">
        {/* Count badges */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-950/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Today</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{todayCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-800 dark:bg-violet-950/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">This Week</span>
            <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{thisWeekCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-950/30">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Overdue</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-300">{overdueCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-800 dark:bg-orange-950/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">High Priority</span>
            <span className="text-lg font-bold text-orange-700 dark:text-orange-300">{highPriorityCount}</span>
          </div>
        </div>

        {/* Explanation banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-amber-800 dark:text-amber-300">
            <Star className="inline h-4 w-4 mr-1 -mt-0.5" />
            <strong>AM Follow-Up</strong> means <em>you</em> (the Account Manager) need to follow up on this item.
            The <strong>Task Owner</strong> is who owns the work itself — this may be different.
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {[
                    'Item',
                    'Client / VA',
                    'Task Owner',
                    'Deadline',
                    'Follow-Up Date',
                    'Status',
                    'Priority',
                    'Days Waiting',
                    'Last Confirmed',
                  ].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      No follow-ups found.
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const isOverdue = item.isOverdue
                    const isDueSoon =
                      item.amFollowUpDate &&
                      !isPast(item.amFollowUpDate) &&
                      isWithinInterval(item.amFollowUpDate, { start: now, end: addDays(now, 3) })
                    const daysOver = isOverdue && item.deadline ? daysOverdue(new Date(item.deadline)) : 0
                    const daysWait = item.waitingSince ? daysWaiting(new Date(item.waitingSince)) : 0

                    const rowBg = isOverdue
                      ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20'
                      : isDueSoon
                      ? 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'

                    return (
                      <tr key={item.id} className={cn('transition-colors', rowBg)}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/items/${item.id}`}
                            className={cn(
                              'font-medium hover:underline transition-colors',
                              isOverdue
                                ? 'text-red-800 hover:text-red-900 dark:text-red-300 dark:hover:text-red-200'
                                : 'text-slate-900 hover:text-amber-700 dark:text-slate-50 dark:hover:text-amber-400'
                            )}
                          >
                            {item.title}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {isOverdue && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                <AlertCircle className="h-3 w-3" />
                                {daysOver}d overdue
                              </span>
                            )}
                            {isDueSoon && !isOverdue && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                <Clock className="h-3 w-3" />
                                Due soon
                              </span>
                            )}
                            {item.isStale && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                ⚠️ Stale
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.client.name}</div>
                          {item.va && <div className="text-xs text-slate-500 dark:text-slate-500">{item.va.name}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.owner || <span className="text-slate-400 italic">Unassigned</span>}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {ownerTypeLabel(item.ownerType as OwnerType)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {formatDate(item.deadline)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.amFollowUpDate ? (
                            <span
                              className={cn(
                                'font-medium',
                                isPast(item.amFollowUpDate)
                                  ? 'text-red-600 dark:text-red-400'
                                  : isDueSoon
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              )}
                            >
                              {formatDate(item.amFollowUpDate)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(item.status as ItemStatus)}>
                            {statusLabel(item.status as ItemStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={priorityBadge(item.priority as Priority)}>
                            {priorityLabel(item.priority as Priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {daysWait > 0 ? (
                            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {daysWait}d
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {item.lastConfirmed ? formatRelative(item.lastConfirmed) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
