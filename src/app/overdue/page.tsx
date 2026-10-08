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
  ownerTypeLabel,
  cn,
} from '@/lib/utils'
import Link from 'next/link'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { Priority, ItemStatus, OwnerType } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOverdueItems() {
  const items = await prisma.openItem.findMany({
    where: {
      isOverdue: true,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    include: {
      client: { select: { name: true } },
      va: { select: { name: true } },
    },
  })

  // Sort: most overdue first, then priority asc
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  return items.sort((a, b) => {
    const daysA = a.deadline ? daysOverdue(new Date(a.deadline)) : 0
    const daysB = b.deadline ? daysOverdue(new Date(b.deadline)) : 0
    if (daysA !== daysB) return daysB - daysA
    return (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
  })
}

function severityClass(days: number) {
  if (days >= 8) return 'bg-red-50/80 hover:bg-red-50 dark:bg-red-950/15 dark:hover:bg-red-950/25'
  if (days >= 4) return 'bg-orange-50/80 hover:bg-orange-50 dark:bg-orange-950/15 dark:hover:bg-orange-950/25'
  return 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
}

function severityBadge(days: number) {
  if (days >= 8)
    return 'inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300'
  if (days >= 4)
    return 'inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
  return 'inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
}

export default async function OverduePage() {
  const items = await getOverdueItems()

  const criticalCount = items.filter(i => i.priority === 'CRITICAL').length
  const highCount = items.filter(i => i.priority === 'HIGH').length

  return (
    <div>
      <TopBar title="Overdue Items" subtitle={`${items.length} items past their deadline`} />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Overdue</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-400">{items.length}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-950/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Critical</span>
            <span className="text-lg font-bold text-red-700 dark:text-red-300">{criticalCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 dark:border-orange-800 dark:bg-orange-950/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">High</span>
            <span className="text-lg font-bold text-orange-700 dark:text-orange-300">{highCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400 gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              0–3 days
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              4–7 days
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              8+ days
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Item', 'Client / VA', 'Owner', 'Priority', 'Original Deadline', 'Days Overdue', 'Status', 'Last Confirmed', 'Next Step'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      No overdue items. 🎉
                    </td>
                  </tr>
                ) : (
                  items.map(item => {
                    const days = item.deadline ? daysOverdue(new Date(item.deadline)) : 0

                    return (
                      <tr key={item.id} className={cn('transition-colors', severityClass(days))}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/items/${item.id}`}
                            className="font-medium text-slate-900 hover:text-red-700 dark:text-slate-50 dark:hover:text-red-300 hover:underline transition-colors"
                          >
                            {item.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.client.name}</div>
                          {item.va && <div className="text-xs text-slate-500">{item.va.name}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.owner || <span className="text-slate-400 italic">Unassigned</span>}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">
                            {ownerTypeLabel(item.ownerType as OwnerType)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={priorityBadge(item.priority as Priority)}>
                            {priorityLabel(item.priority as Priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {formatDate(item.deadline)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={severityBadge(days)}>
                            <AlertTriangle className="h-3 w-3" />
                            {days}d
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(item.status as ItemStatus)}>
                            {statusLabel(item.status as ItemStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {item.lastConfirmed ? formatRelative(item.lastConfirmed) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {item.nextStep || <span className="text-slate-400">—</span>}
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
