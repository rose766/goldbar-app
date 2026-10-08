import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { ClientHealthChip } from '@/components/dashboard/client-health-chip'
import { ItemRow } from '@/components/dashboard/item-row'
import { formatDate, formatRelative, parseJsonArray, statusLabel } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  User, Calendar, Clock, RefreshCw, Users, AlertCircle, FileText, History, GitBranch
} from 'lucide-react'
import type { ClientHealth, ItemStatus, Priority, OwnerType } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      vas: {
        include: {
          openItems: {
            where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      },
      openItems: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: {
          va: { select: { id: true, name: true } },
          gamePlan: { select: { id: true, title: true } },
        },
        orderBy: [{ isOverdue: 'desc' }, { priority: 'asc' }, { deadline: 'asc' }],
      },
      gamePlans: {
        orderBy: [{ date: 'desc' }],
      },
      healthHistory: {
        orderBy: { changedAt: 'desc' },
        take: 5,
      },
    },
  })
}

async function getRecentHistory(clientId: string) {
  return prisma.openItemHistory.findMany({
    where: { openItem: { clientId } },
    include: { openItem: { select: { title: true, vaId: true, va: { select: { name: true } } } } },
    orderBy: { changedAt: 'desc' },
    take: 10,
  })
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, recentHistory] = await Promise.all([
    getClient(params.id),
    getRecentHistory(params.id),
  ])

  if (!client) notFound()

  const healthReasons = parseJsonArray(client.healthReasons)

  // Client-level items (no VA)
  const clientLevelItems = client.openItems.filter(i => i.isClientLevel || !i.vaId)
  // Items grouped by VA
  const vaItems = client.vas.map(va => ({
    va,
    items: client.openItems.filter(i => i.vaId === va.id),
  }))

  // Game plan status labels
  const gamePlanStatusLabel: Record<string, string> = {
    ACTIVE: '🟢 Active',
    SUPERSEDED: '⚪ Superseded',
    COMPLETED: '✅ Completed',
    ARCHIVED: '📁 Archived',
  }

  return (
    <div>
      <TopBar
        title={client.name}
        subtitle={`${client.status} Client`}
      />

      <div className="p-6 space-y-8">

        {/* ── Section 1: Client Info Cards ───────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Client Overview</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Health */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Health</p>
              <ClientHealthChip health={client.health as ClientHealth} reasons={client.healthReasons} />
            </div>

            {/* Account Manager */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Account Manager</p>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{client.accountManager}</span>
              </div>
            </div>

            {/* Next Check-In */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Next Check-In</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {client.nextCheckIn ? formatDate(client.nextCheckIn) : '—'}
                </span>
              </div>
            </div>

            {/* Last Activity */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Last Activity</p>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {client.lastActivity ? formatRelative(client.lastActivity) : '—'}
                </span>
              </div>
            </div>

            {/* Last Slack Sync */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Last Slack Sync</p>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {client.lastSlackSync ? formatRelative(client.lastSlackSync) : '—'}
                </span>
              </div>
            </div>

            {/* VA Count */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">VAs</p>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{client.vas.length}</span>
              </div>
            </div>

            {/* Open Items */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Open Items</p>
              <span className={`text-lg font-bold ${client.openItems.length > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`}>
                {client.openItems.length}
              </span>
            </div>

            {/* Overdue */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Overdue</p>
              {(() => {
                const count = client.openItems.filter(i => i.isOverdue).length
                return (
                  <div className="flex items-center gap-1.5">
                    {count > 0 && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className={`text-lg font-bold ${count > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400'}`}>
                      {count}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        </section>

        {/* ── Section 2: Health Reasons ──────────────────────────────────── */}
        {healthReasons.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Health Explanation</h2>
              <ClientHealthChip health={client.health as ClientHealth} showReasons={false} />
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {healthReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 shrink-0 text-slate-400">•</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Section 3: VAs List ────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Virtual Assistants</h2>
          <div className="space-y-4">
            {client.vas.length === 0 ? (
              <p className="text-sm text-slate-400">No VAs assigned to this client.</p>
            ) : (
              client.vas.map(va => {
                const vaOpenItems = va.openItems
                const overdueCount = vaOpenItems.filter(i => i.isOverdue).length

                return (
                  <div key={va.id} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    {/* VA Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-slate-400" />
                        <div>
                          <Link
                            href={`/va/${va.id}`}
                            className="text-sm font-semibold text-slate-900 dark:text-slate-50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                          >
                            {va.name}
                          </Link>
                          {va.role && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{va.role}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          va.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : va.status === 'ON_LEAVE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {va.status.replace('_', ' ')}
                        </span>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium">{vaOpenItems.length}</span> open
                          {overdueCount > 0 && (
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              {overdueCount} overdue
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/va/${va.id}`}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
                        >
                          View →
                        </Link>
                      </div>
                    </div>

                    {/* VA Items */}
                    {vaOpenItems.length > 0 && (
                      <div className="p-4 space-y-2">
                        {vaOpenItems.map(item => (
                          <ItemRow
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            clientName={client.name}
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
                            compact
                          />
                        ))}
                      </div>
                    )}
                    {vaOpenItems.length === 0 && (
                      <div className="px-5 py-4 text-xs text-slate-400">No open items.</div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* ── Section 4: Client-Level Items ─────────────────────────────── */}
        {clientLevelItems.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <FileText className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Client-Level Items</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {clientLevelItems.length}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {clientLevelItems.map(item => (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  clientName={client.name}
                  vaName={item.va?.name}
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
              ))}
            </div>
          </section>
        )}

        {/* ── Section 5: All Open Items Grouped by VA ────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <AlertCircle className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">All Open Items</h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {client.openItems.length}
            </span>
          </div>

          <div className="p-4 space-y-6">
            {vaItems.map(({ va, items }) =>
              items.length > 0 ? (
                <div key={va.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <Link
                      href={`/va/${va.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
                    >
                      {va.name}
                    </Link>
                    <span className="text-xs text-slate-400">({items.length})</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(item => (
                      <ItemRow
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        clientName={client.name}
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
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : null
            )}
            {client.openItems.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No open items.</p>
            )}
          </div>
        </section>

        {/* ── Section 6: Game Plans ──────────────────────────────────────── */}
        {client.gamePlans.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <GitBranch className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Game Plans</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {client.gamePlans.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {client.gamePlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{plan.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      v{plan.version} · {formatDate(plan.date)}
                      {plan.sourceChannel && ` · #${plan.sourceChannel}`}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {gamePlanStatusLabel[plan.status] ?? plan.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 7: Recent Changes ──────────────────────────────────── */}
        {recentHistory.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <History className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Recent Changes</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentHistory.map(entry => (
                <div key={entry.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-50 truncate">
                        {entry.openItem.title}
                        {entry.openItem.va && (
                          <span className="ml-1.5 text-slate-400">/ {entry.openItem.va.name}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{entry.field}</span>
                        {entry.previousValue && (
                          <span> changed from <span className="line-through opacity-60">{entry.previousValue}</span></span>
                        )}
                        {entry.newValue && (
                          <span> to <span className="font-medium text-slate-700 dark:text-slate-200">{entry.newValue}</span></span>
                        )}
                      </p>
                      {entry.reason && (
                        <p className="mt-0.5 text-xs text-slate-400 italic">{entry.reason}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatRelative(entry.changedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
