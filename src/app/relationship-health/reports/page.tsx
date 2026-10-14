import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReportsPage() {
  const [totalCases, bySeverity, byStatus, openActions, pendingFollowUps] = await Promise.all([
    prisma.rHCase.count(),
    prisma.rHCase.groupBy({ by: ['severity'], _count: { id: true } }),
    prisma.rHCase.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.rHAction.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.rHFollowUp.count({ where: { status: 'PENDING' } }),
  ])

  const overdueActions = await prisma.rHAction.count({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: new Date() } },
  })
  const overdueFollowUps = await prisma.rHFollowUp.count({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
  })

  const STATUS_LABELS: Record<string, string> = {
    NEW: 'New',
    AWAITING_ASSESSMENT: 'Awaiting Assessment',
    UNDER_INVESTIGATION: 'Under Investigation',
    ACTION_PLAN_CREATED: 'Action Plan Created',
    IN_PROGRESS: 'In Progress',
    ESCALATED: 'Escalated',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    REOPENED: 'Reopened',
  }

  const SEVERITY_COLORS: Record<string, string> = {
    LOW: 'bg-blue-500',
    MODERATE: 'bg-amber-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
  }

  const statCards = [
    { label: 'Total Cases', value: totalCases, sub: 'all time' },
    { label: 'Open Actions', value: openActions, sub: `${overdueActions} overdue`, alert: overdueActions > 0 },
    { label: 'Pending Follow-ups', value: pendingFollowUps, sub: `${overdueFollowUps} overdue`, alert: overdueFollowUps > 0 },
  ]

  return (
    <div>
      <TopBar title="Reports & Analytics" subtitle="Relationship health summary" />

      <div className="p-6 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {statCards.map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{s.value}</p>
              <p className={`mt-0.5 text-xs ${s.alert ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Cases by status */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Cases by Status</h2>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Count</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byStatus.map(row => (
                  <tr key={row.status} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-700">{STATUS_LABELS[row.status] ?? row.status}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-semibold text-slate-900">{row._count.id}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-slate-400">
                      {totalCases > 0 ? Math.round((row._count.id / totalCases) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cases by severity */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Cases by Severity</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(sev => {
              const row = bySeverity.find(r => r.severity === sev)
              const count = row?._count.id ?? 0
              return (
                <div key={sev} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[sev]}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sev}</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {totalCases > 0 ? Math.round((count / totalCases) * 100) : 0}% of total
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
