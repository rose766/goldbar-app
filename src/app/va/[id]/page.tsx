import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { ItemRow } from '@/components/dashboard/item-row'
import { formatDate, formatRelative, parseJsonArray } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  User, Calendar, Clock, AlertTriangle, Star, Building2, Zap
} from 'lucide-react'
import type { ItemStatus, Priority, OwnerType } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getVA(id: string) {
  return prisma.vA.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, health: true } },
      openItems: {
        orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
        include: {
          client: { select: { name: true } },
        },
      },
    },
  })
}

export default async function VADetailPage({ params }: { params: { id: string } }) {
  const va = await getVA(params.id)

  if (!va) notFound()

  const performanceFlags = parseJsonArray(va.performanceFlags)
  const priorities = va.currentPriorities
    ? va.currentPriorities.split(/\n|•/).map(s => s.trim()).filter(Boolean)
    : []

  const openItems = va.openItems.filter(i => !['COMPLETED', 'CANCELLED'].includes(i.status))
  const completedItems = va.openItems.filter(i => i.status === 'COMPLETED')

  const overdueItems = openItems.filter(i => i.isOverdue)
  const inProgressItems = openItems.filter(i => i.status === 'IN_PROGRESS')
  const waitingItems = openItems.filter(i =>
    ['WAITING_ON_CLIENT', 'WAITING_ON_VA', 'WAITING_ON_GOLDBAR'].includes(i.status)
  )
  const blockedItems = openItems.filter(i => i.status === 'BLOCKED')

  const statusBadgeMap: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    ON_LEAVE: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    TRANSITIONING: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
    INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div>
      <TopBar
        title={va.name}
        subtitle={va.role ?? 'Virtual Assistant'}
      />

      <div className="p-6 space-y-8">

        {/* ── VA Info Card ───────────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="p-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {/* Client */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                <Link
                  href={`/clients/${va.client.id}`}
                  className="text-sm font-medium text-slate-900 dark:text-slate-50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                >
                  {va.client.name}
                </Link>
              </div>
            </div>

            {/* Role */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Role</p>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {va.role ?? '—'}
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeMap[va.status] ?? statusBadgeMap.INACTIVE}`}>
                {va.status.replace('_', ' ')}
              </span>
            </div>

            {/* Start Date */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Start Date</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {va.startDate ? formatDate(va.startDate) : '—'}
                </span>
              </div>
            </div>

            {/* Last Update */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Last Update</p>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {va.lastUpdate ? formatRelative(va.lastUpdate) : '—'}
                </span>
              </div>
            </div>

            {/* Last Client Feedback */}
            {va.lastClientFeedback && (
              <div className="lg:col-span-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Last Client Feedback</p>
                <div className="flex items-start gap-1.5">
                  <Star className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">{va.lastClientFeedback}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Performance Flags ─────────────────────────────────────────── */}
        {performanceFlags.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Performance Flags</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {performanceFlags.map((flag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {flag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Current Priorities ────────────────────────────────────────── */}
        {priorities.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Current Priorities</h2>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{p}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Open Items ────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Open Items</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {openItems.length}
            </span>
          </div>

          {/* Count summary */}
          {openItems.length > 0 && (
            <div className="flex flex-wrap gap-4 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              {overdueItems.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overdueItems.length} Overdue
                </span>
              )}
              {inProgressItems.length > 0 && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {inProgressItems.length} In Progress
                </span>
              )}
              {waitingItems.length > 0 && (
                <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  {waitingItems.length} Waiting
                </span>
              )}
              {blockedItems.length > 0 && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {blockedItems.length} Blocked
                </span>
              )}
              {completedItems.length > 0 && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {completedItems.length} Completed
                </span>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            {openItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                ✅ No open items
              </div>
            ) : (
              openItems.map(item => (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  clientName={item.client.name}
                  vaName={va.name}
                  owner={item.owner}
                  ownerType={item.ownerType as OwnerType}
                  status={item.status as ItemStatus}
                  priority={item.priority as Priority}
                  deadline={item.deadline}
                  isOverdue={item.isOverdue}
                  isDueSoon={item.isDueSoon}
                  isStale={item.isStale}
                  isMissingDeadline={item.isMissingDeadline}
                  isMissingOwner={item.isMissingOwner}
                  amFollowUp={item.amFollowUp}
                  waitingSince={item.waitingSince}
                  nextStep={item.nextStep}
                />
              ))
            )}
          </div>

          {/* Completed items (collapsed summary) */}
          {completedItems.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                + {completedItems.length} completed item{completedItems.length !== 1 ? 's' : ''} not shown
              </p>
            </div>
          )}
        </section>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {va.notes && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notes</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{va.notes}</p>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
