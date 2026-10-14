import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { SeverityBadge } from '@/components/rh/SeverityBadge'
import { formatDate, formatRelative } from '@/lib/utils'
import Link from 'next/link'
import { Plus, AlertTriangle, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalActive,
    needsAttention,
    openActions,
    overdueActions,
    followUpsToday,
    awaitingLeadership,
    priorityCases,
    upcomingFollowUps,
    recentActivity,
  ] = await Promise.all([
    // Total active cases (not closed/resolved)
    prisma.rHCase.count({
      where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
    }),
    // Needs attention: NEW, ESCALATED, AWAITING_CLIENT_INPUT, AWAITING_VA_ACTION
    prisma.rHCase.count({
      where: { status: { in: ['NEW', 'ESCALATED', 'AWAITING_CLIENT_INPUT', 'AWAITING_VA_ACTION'] } },
    }),
    // Open actions
    prisma.rHAction.count({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    // Overdue actions
    prisma.rHAction.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: new Date() },
      },
    }),
    // Follow-ups today
    prisma.rHFollowUp.count({
      where: {
        status: 'PENDING',
        dueDate: { gte: today, lt: tomorrow },
      },
    }),
    // Awaiting leadership (ESCALATED cases)
    prisma.rHCase.count({
      where: { status: { in: ['ESCALATED', 'RESTAFFING_UNDER_REVIEW'] } },
    }),
    // Priority queue: top open cases
    prisma.rHCase.findMany({
      where: { status: { notIn: ['CLOSED', 'RESOLVED'] } },
      include: {
        client: { select: { name: true } },
        va: { select: { name: true } },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 10,
    }),
    // Upcoming follow-ups
    prisma.rHFollowUp.findMany({
      where: { status: 'PENDING' },
      include: {
        case: {
          select: { caseNumber: true, client: { select: { name: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
    // Recent activity (audit logs)
    prisma.rHAuditLog.findMany({
      include: {
        case: { select: { caseNumber: true, client: { select: { name: true } } } },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    totalActive,
    needsAttention,
    openActions,
    overdueActions,
    followUpsToday,
    awaitingLeadership,
    priorityCases,
    upcomingFollowUps,
    recentActivity,
  }
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW']

export default async function RHOverviewPage() {
  const data = await getDashboardData()

  // Sort priority cases: CRITICAL first, then HIGH, MODERATE, LOW
  const sortedCases = [...data.priorityCases].sort((a, b) => {
    return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  })

  return (
    <div>
      <TopBar
        title="Relationship Health"
        subtitle="VA–Client Relationship Management"
      />

      <div className="p-6 space-y-8">

        {/* ── Metric Row ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Overview</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <MetricCard label="Total Active Cases" value={data.totalActive} color="blue" />
            <MetricCard label="Needs Attention" value={data.needsAttention} color={data.needsAttention > 0 ? 'red' : 'slate'} />
            <MetricCard label="Open Actions" value={data.openActions} color={data.openActions > 0 ? 'amber' : 'slate'} />
            <MetricCard label="Overdue Actions" value={data.overdueActions} color={data.overdueActions > 0 ? 'red' : 'slate'} />
            <MetricCard label="Follow-ups Today" value={data.followUpsToday} color={data.followUpsToday > 0 ? 'amber' : 'slate'} />
            <MetricCard label="Awaiting Leadership" value={data.awaitingLeadership} color={data.awaitingLeadership > 0 ? 'orange' : 'slate'} />
          </div>
        </section>

        {/* ── Priority Queue ──────────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-900">Priority Queue</h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                {sortedCases.length}
              </span>
            </div>
            <Link
              href="/relationship-health/cases/new"
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> New Case
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Case #', 'Client', 'VA', 'Primary Issue', 'Severity', 'Status', 'Assigned AM', 'Next Review'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                      No active cases. Great work!
                    </td>
                  </tr>
                ) : (
                  sortedCases.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/relationship-health/cases/${c.id}`} className="font-mono text-xs font-medium text-amber-700 hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.client.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.va?.name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-slate-700" title={c.title}>{c.title}</p>
                      </td>
                      <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{c.assignedAm}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {c.nextReviewDate ? formatDate(c.nextReviewDate) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Upcoming Follow-ups ──────────────────────────────────── */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Upcoming Follow-ups</h2>
              <Link href="/relationship-health/follow-ups" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Due Date', 'Case', 'Purpose', 'Assigned To', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.upcomingFollowUps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        No pending follow-ups
                      </td>
                    </tr>
                  ) : (
                    data.upcomingFollowUps.map(f => {
                      const isOverdue = new Date(f.dueDate) < new Date()
                      return (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className={`px-4 py-2.5 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                            {formatDate(f.dueDate)}
                          </td>
                          <td className="px-4 py-2.5">
                            <Link href={`/relationship-health/cases/${f.caseId}`} className="font-mono text-xs text-amber-700 hover:underline">
                              {f.case.caseNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 max-w-[160px]">
                            <p className="truncate text-xs text-slate-700">{f.purpose}</p>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{f.assignedTo}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={f.status} /></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Recent Activity ──────────────────────────────────────── */}
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No recent activity</div>
              ) : (
                data.recentActivity.map(log => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900">
                          <span className="text-slate-500">{log.changedBy}</span>
                          {' '}{log.action.toLowerCase().replace('_', ' ')}{' '}
                          <span className="text-slate-500">{log.entityType.toLowerCase()}</span>
                          {log.case && (
                            <>
                              {' in '}
                              <Link href={`/relationship-health/cases/${log.caseId}`} className="font-mono text-amber-700 hover:underline">
                                {log.case.caseNumber}
                              </Link>
                              {' — '}{log.case.client.name}
                            </>
                          )}
                        </p>
                        {log.field && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {log.field}: {log.oldValue ?? '—'} → {log.newValue ?? '—'}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{formatRelative(log.changedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-700 bg-blue-50',
    red: 'text-red-700 bg-red-50',
    amber: 'text-amber-700 bg-amber-50',
    orange: 'text-orange-700 bg-orange-50',
    slate: 'text-slate-700 bg-white',
  }
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${color === 'slate' ? 'bg-white' : ''}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorMap[color]?.split(' ')[0] ?? 'text-slate-700'}`}>{value}</p>
    </div>
  )
}
