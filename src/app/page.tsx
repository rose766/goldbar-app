import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { MetricCard } from '@/components/dashboard/metric-card'
import { ClientHealthChip } from '@/components/dashboard/client-health-chip'
import {
  AlertCircle, Clock, Users, UserCheck, ClipboardList,
  AlertTriangle, Star, Bell, TrendingDown, Calendar, GitBranch, Zap
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatRelative, statusLabel, priorityLabel, daysOverdue, daysWaiting, parseJsonArray } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { ClientHealth, Priority, ItemStatus } from '@/types'

async function getDashboardData() {
  const today = new Date()
  const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)

  const [
    clients, totalVAs, openItems, overdueItems, dueSoonItems, blockedItems,
    missingDeadlines, missingOwners, myFollowUps, pendingReviews,
    staleItems, latestRun, dailySummary
  ] = await Promise.all([
    prisma.client.findMany({ where: { status: 'ACTIVE' }, include: { vas: true, openItems: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } } } }),
    prisma.vA.count({ where: { status: 'ACTIVE' } }),
    prisma.openItem.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isOverdue: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isDueSoon: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { status: 'BLOCKED' } }),
    prisma.openItem.count({ where: { isMissingDeadline: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { isMissingOwner: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.openItem.count({ where: { amFollowUp: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.reviewItem.count({ where: { status: 'PENDING' } }),
    prisma.openItem.count({ where: { isStale: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.slackAnalysisRun.findFirst({ orderBy: { runDate: 'desc' } }),
    prisma.dailySummary.findFirst({ where: { date: { gte: new Date(today.toDateString()) } } }),
  ])

  // Sync status
  let syncStatus: 'ok' | 'stale' | 'failed' | 'never' = 'never'
  if (latestRun) {
    if (latestRun.status === 'FAILED') syncStatus = 'failed'
    else if (differenceInDays(today, latestRun.runDate) >= 2) syncStatus = 'stale'
    else syncStatus = 'ok'
  }

  // Client summaries
  const atRiskClients = clients.filter(c => c.health === 'AT_RISK')
  const needsAttentionClients = clients.filter(c => c.health === 'NEEDS_ATTENTION')

  // Top overdue items
  const topOverdue = await prisma.openItem.findMany({
    where: { isOverdue: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    include: { client: { select: { name: true } }, va: { select: { name: true } } },
    orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
    take: 5,
  })

  // Top follow-ups
  const topFollowUps = await prisma.openItem.findMany({
    where: { amFollowUp: true, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    include: { client: { select: { name: true } }, va: { select: { name: true } } },
    orderBy: [{ isOverdue: 'desc' }, { priority: 'asc' }, { amFollowUpDate: 'asc' }],
    take: 5,
  })

  return {
    totalClients: clients.length,
    totalVAs,
    openItems,
    overdueItems,
    dueSoonItems,
    blockedItems,
    missingDeadlines,
    missingOwners,
    myFollowUps,
    pendingReviews,
    staleItems,
    atRiskClients,
    needsAttentionClients,
    topOverdue,
    topFollowUps,
    syncStatus,
    lastSync: latestRun?.runDate ?? null,
    dailySummary,
    allClients: clients,
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const data = await getDashboardData()
  const today = new Date()

  return (
    <div>
      <TopBar
        title="Command Center"
        subtitle={`Today — ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
        lastSync={data.lastSync}
        syncStatus={data.syncStatus}
      />

      <div className="p-6 space-y-8">

        {/* ── At-Risk Alert Banner ───────────────────────────────────────── */}
        {data.atRiskClients.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  🔴 {data.atRiskClients.length} Client{data.atRiskClients.length > 1 ? 's' : ''} At Risk — Requires Immediate Attention
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.atRiskClients.map(c => (
                    <Link key={c.id} href={`/clients/${c.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300">
                      {c.name}
                      <span className="opacity-60">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Metric Grid ────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Overview</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Open Items" value={data.openItems} icon={ClipboardList} color="blue" />
            <MetricCard label="Overdue" value={data.overdueItems} icon={AlertCircle} color={data.overdueItems > 0 ? 'red' : 'slate'} />
            <MetricCard label="Due Soon" value={data.dueSoonItems} icon={Clock} color={data.dueSoonItems > 0 ? 'amber' : 'slate'} />
            <MetricCard label="My Follow-Ups" value={data.myFollowUps} icon={Star} color={data.myFollowUps > 0 ? 'amber' : 'slate'} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Blocked" value={data.blockedItems} icon={AlertTriangle} color={data.blockedItems > 0 ? 'orange' : 'slate'} />
            <MetricCard label="Missing Deadlines" value={data.missingDeadlines} icon={Calendar} color={data.missingDeadlines > 0 ? 'orange' : 'slate'} />
            <MetricCard label="Missing Owners" value={data.missingOwners} icon={UserCheck} color={data.missingOwners > 0 ? 'violet' : 'slate'} />
            <MetricCard label="Review Queue" value={data.pendingReviews} icon={Bell} color={data.pendingReviews > 0 ? 'violet' : 'slate'} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total Clients" value={data.totalClients} icon={Users} color="slate" />
            <MetricCard label="Active VAs" value={data.totalVAs} icon={UserCheck} color="slate" />
            <MetricCard label="Stale Items" value={data.staleItems} icon={TrendingDown} color={data.staleItems > 0 ? 'amber' : 'slate'} subtitle="No update past threshold" />
            <MetricCard label="At Risk Clients" value={data.atRiskClients.length} icon={AlertCircle} color={data.atRiskClients.length > 0 ? 'red' : 'slate'} />
          </div>
        </section>

        {/* ── Two Column: Overdue + Follow-Ups ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Overdue Items */}
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Overdue Items</h2>
                {data.overdueItems > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {data.overdueItems}
                  </span>
                )}
              </div>
              <Link href="/overdue" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.topOverdue.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                  ✅ No overdue items
                </div>
              ) : (
                data.topOverdue.map(item => {
                  const dOver = item.deadline ? daysOverdue(new Date(item.deadline)) : 0
                  return (
                    <Link key={item.id} href={`/items/${item.id}`} className="block px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-red-800 dark:text-red-300 truncate">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.client.name}{item.va ? ` / ${item.va.name}` : ''}
                            {item.owner ? ` · ${item.owner}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-red-600 dark:text-red-400">
                          {dOver}d overdue
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>

          {/* My Follow-Ups */}
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">My Follow-Ups</h2>
                {data.myFollowUps > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {data.myFollowUps}
                  </span>
                )}
              </div>
              <Link href="/follow-ups" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.topFollowUps.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                  ✅ No follow-ups needed
                </div>
              ) : (
                data.topFollowUps.map(item => (
                  <Link key={item.id} href={`/items/${item.id}`} className="block px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.client.name}{item.va ? ` / ${item.va.name}` : ''}
                          {item.owner ? ` · ${item.owner}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {item.amFollowUpDate && (
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            {formatDate(item.amFollowUpDate)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400">{item.priority}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── Client Table ──────────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">All Clients</h2>
            </div>
            <Link href="/clients" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
              Manage clients →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Client', 'Health', 'VAs', 'Open', 'Overdue', 'Blocked', 'Next Check-In', 'Last Activity', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.allClients.map(client => {
                  const openCount = client.openItems.length
                  const overdueCount = client.openItems.filter(i => i.isOverdue).length
                  const blockedCount = client.openItems.filter(i => i.status === 'BLOCKED').length
                  const amAttentionCount = client.openItems.filter(i => i.amFollowUp).length
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 dark:text-slate-50 hover:text-amber-700 dark:hover:text-amber-400">
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <ClientHealthChip health={client.health as ClientHealth} reasons={client.healthReasons} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{client.vas.length}</td>
                      <td className="px-4 py-3">
                        <span className={openCount > 0 ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-slate-400'}>{openCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        {overdueCount > 0 ? (
                          <span className="font-semibold text-red-700 dark:text-red-400">{overdueCount}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {blockedCount > 0 ? (
                          <span className="font-semibold text-orange-700 dark:text-orange-400">{blockedCount}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {client.nextCheckIn ? formatDate(client.nextCheckIn) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {client.lastActivity ? formatRelative(client.lastActivity) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {amAttentionCount > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            ★ {amAttentionCount}
                          </span>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Daily Summary Snapshot ────────────────────────────────────── */}
        {data.dailySummary?.fullSummaryJson && (() => {
          try {
            const summary = JSON.parse(data.dailySummary.fullSummaryJson)
            return (
              <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Today's Summary</h2>
                  </div>
                  <Link href="/daily-summary" className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-50">
                    Full summary →
                  </Link>
                </div>
                <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {summary.immediateAttention?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">🔴 Immediate Attention</p>
                      <ul className="space-y-1">
                        {summary.immediateAttention.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5">
                            <span className="shrink-0 text-red-400">•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.completedToday?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">✅ Completed Today</p>
                      <ul className="space-y-1">
                        {summary.completedToday.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5">
                            <span className="shrink-0 text-emerald-400">✓</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )
          } catch { return null }
        })()}

      </div>
    </div>
  )
}
