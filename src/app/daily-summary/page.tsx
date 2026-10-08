import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { formatDate, formatRelative, cn } from '@/lib/utils'
import Link from 'next/link'
import { CalendarDays, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DailySummaryPage() {
  const [latestSummary, previousSummary, clients, recentHistory, pendingReview] = await Promise.all([
    prisma.dailySummary.findFirst({ orderBy: { date: 'desc' } }),
    prisma.dailySummary.findFirst({ orderBy: { date: 'desc' }, skip: 1 }),
    prisma.client.findMany({
      include: {
        vas: { select: { id: true } },
        openItems: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { isOverdue: true, isMissingDeadline: true, isMissingOwner: true, amFollowUp: true, priority: true },
        },
      },
      orderBy: [
        { health: 'asc' },
      ],
    }),
    prisma.openItemHistory.findMany({
      where: { changedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      include: {
        openItem: {
          include: {
            client: { select: { name: true } },
            va: { select: { name: true } },
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 20,
    }),
    prisma.reviewItem.count({ where: { status: 'PENDING' } }),
  ])

  const healthOrder = { AT_RISK: 0, NEEDS_ATTENTION: 1, ON_TRACK: 2 }
  const sortedClients = [...clients].sort((a, b) => (healthOrder[a.health as keyof typeof healthOrder] ?? 2) - (healthOrder[b.health as keyof typeof healthOrder] ?? 2))

  const totalOpen = clients.reduce((s, c) => s + c.openItems.length, 0)
  const totalOverdue = clients.reduce((s, c) => s + c.openItems.filter(i => i.isOverdue).length, 0)
  const totalMissingDeadline = clients.reduce((s, c) => s + c.openItems.filter(i => i.isMissingDeadline).length, 0)
  const totalMissingOwner = clients.reduce((s, c) => s + c.openItems.filter(i => i.isMissingOwner).length, 0)
  const totalFollowUps = clients.reduce((s, c) => s + c.openItems.filter(i => i.amFollowUp).length, 0)
  const atRiskCount = clients.filter(c => c.health === 'AT_RISK').length
  const needsAttentionCount = clients.filter(c => c.health === 'NEEDS_ATTENTION').length

  function trend(current: number, previous: number | undefined) {
    if (previous === undefined) return null
    if (current > previous) return 'up'
    if (current < previous) return 'down'
    return 'flat'
  }

  const healthBadge = (health: string) => {
    if (health === 'AT_RISK') return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
    if (health === 'NEEDS_ATTENTION') return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  }

  const healthLabel = (health: string) => {
    if (health === 'AT_RISK') return '🔴 At Risk'
    if (health === 'NEEDS_ATTENTION') return '🟡 Needs Attention'
    return '🟢 On Track'
  }

  const FIELD_LABELS: Record<string, string> = {
    status: 'Status',
    priority: 'Priority',
    deadline: 'Deadline',
    owner: 'Owner',
    amFollowUp: 'AM Follow-Up',
    nextStep: 'Next Step',
    title: 'Title',
    blockedReason: 'Blocked Reason',
    lastConfirmed: 'Last Confirmed',
  }

  return (
    <div>
      <TopBar
        title="Daily Summary"
        subtitle={latestSummary ? `Generated ${formatRelative(latestSummary.generatedAt)}` : 'No summary generated yet'}
      />

      <div className="p-6 space-y-6 max-w-4xl">

        {/* Today's date + pending review alert */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {formatDate(new Date(), 'EEEE, MMMM d, yyyy')}
            </h2>
          </div>
          {pendingReview > 0 && (
            <Link href="/review"
              className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-200 dark:bg-violet-950/40 dark:text-violet-300">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingReview} item{pendingReview !== 1 ? 's' : ''} in AI Review Queue
            </Link>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Open Items', value: totalOpen, color: 'text-slate-900 dark:text-slate-50', prev: undefined },
            { label: 'Overdue', value: totalOverdue, color: totalOverdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700', prev: latestSummary?.overdueItems },
            { label: 'Missing Deadlines', value: totalMissingDeadline, color: totalMissingDeadline > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-emerald-700', prev: latestSummary?.missingDeadlines },
            { label: 'Unassigned', value: totalMissingOwner, color: totalMissingOwner > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-emerald-700', prev: latestSummary?.missingOwners },
            { label: 'My Follow-Ups', value: totalFollowUps, color: 'text-amber-700 dark:text-amber-400', prev: undefined },
            { label: 'At Risk', value: atRiskCount, color: atRiskCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700', prev: latestSummary?.atRiskClients },
          ].map(m => {
            const t = trend(m.value, m.prev ?? undefined)
            return (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-950">
                <p className={cn('text-2xl font-bold', m.color)}>{m.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
                {t && (
                  <div className={cn('flex items-center justify-center gap-0.5 text-xs mt-1',
                    t === 'up' ? 'text-red-500' : t === 'down' ? 'text-emerald-500' : 'text-slate-400')}>
                    {t === 'up' ? <TrendingUp className="h-3 w-3" /> : t === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    <span>{t === 'up' ? '+' : t === 'down' ? '-' : ''}
                      {t !== 'flat' ? Math.abs(m.value - (m.prev ?? 0)) : 'no change'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Client health snapshot */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Client Health Snapshot</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {atRiskCount} at risk · {needsAttentionCount} needs attention · {clients.length - atRiskCount - needsAttentionCount} on track
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedClients.map(client => {
              const open = client.openItems.length
              const overdue = client.openItems.filter(i => i.isOverdue).length
              const followUps = client.openItems.filter(i => i.amFollowUp).length
              let reasons: string[] = []
              try { reasons = JSON.parse(client.healthReasons ?? '[]') } catch {}
              return (
                <div key={client.id} className="flex items-center gap-4 px-5 py-3">
                  <Link href={`/clients/${client.id}`} className="flex-1 min-w-0 font-medium text-sm text-slate-900 hover:text-amber-700 dark:text-slate-50 dark:hover:text-amber-400 truncate">
                    {client.name}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span>{open} open{overdue > 0 && <span className="text-red-600 dark:text-red-400"> · {overdue} overdue</span>}</span>
                    {followUps > 0 && <span className="text-amber-600 dark:text-amber-400">★ {followUps}</span>}
                    {client.vas.length > 0 && <span>{client.vas.length} VA{client.vas.length !== 1 ? 's' : ''}</span>}
                  </div>
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0', healthBadge(client.health))}>
                    {healthLabel(client.health)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent changes in last 24h */}
        {recentHistory.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Changes in Last 24 Hours</h2>
              <Link href="/changes" className="text-xs text-blue-600 hover:underline dark:text-blue-400">View all changes →</Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentHistory.slice(0, 10).map(h => (
                <div key={h.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <Link href={`/items/${h.openItemId}`} className="font-medium text-slate-900 hover:text-amber-700 dark:text-slate-50 dark:hover:text-amber-400">
                      {h.openItem.title}
                    </Link>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-xs text-slate-500">{h.openItem.client.name}</span>
                    <div className="mt-0.5 text-xs text-slate-500">
                      <span className="font-medium">{FIELD_LABELS[h.field] ?? h.field}</span>
                      {h.previousValue && (
                        <span className="ml-1 line-through text-slate-400">{h.previousValue.slice(0, 30)}</span>
                      )}
                      {h.newValue && (
                        <span className="ml-1 text-slate-700 dark:text-slate-300">{h.newValue.slice(0, 30)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {h.changedBy === 'AI' || h.changedBy === 'slack-ingestion' ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">🤖 AI</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">{h.changedBy}</span>
                    )}
                    <span className="text-xs text-slate-400">{formatRelative(h.changedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stored AI summary */}
        {latestSummary?.fullSummaryJson && (() => {
          let parsed: Record<string, unknown> | null = null
          try { parsed = JSON.parse(latestSummary.fullSummaryJson) } catch {}
          if (!parsed) return null
          return (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">AI Summary ({formatDate(latestSummary.date)})</h2>
              </div>
              <div className="p-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                {Object.entries(parsed).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{key}</p>
                    <p className="whitespace-pre-wrap">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* No summary yet — CTA */}
        {!latestSummary && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <CheckCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No daily summary generated yet</p>
            <p className="mt-1 text-xs text-slate-400">Run the Slack analysis to generate today&apos;s summary.</p>
          </div>
        )}
      </div>
    </div>
  )
}
