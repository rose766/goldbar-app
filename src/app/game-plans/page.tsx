import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { formatDate, formatRelative } from '@/lib/utils'
import Link from 'next/link'
import { FileText, ChevronRight, GitBranch } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GamePlansPage() {
  const gamePlans = await prisma.gamePlan.findMany({
    include: {
      client: { select: { name: true } },
      objectives: {
        include: { _count: { select: { milestones: true } } },
      },
      _count: { select: { openItems: true } },
    },
    orderBy: [{ status: 'asc' }, { date: 'desc' }],
  })

  const activeCount = gamePlans.filter(g => g.status === 'ACTIVE').length
  const supersededCount = gamePlans.filter(g => g.status === 'SUPERSEDED').length

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      SUPERSEDED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
      ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500',
    }
    return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? map.ACTIVE}`
  }

  return (
    <div>
      <TopBar title="Game Plans" subtitle="Client presentations, plans, and objectives" />
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="flex gap-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Active Plans</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Total Plans</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{gamePlans.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500">Superseded</p>
            <p className="text-2xl font-bold text-slate-500">{supersededCount}</p>
          </div>
        </div>

        {/* Game Plans Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {gamePlans.map(plan => (
            <Link key={plan.id} href={`/game-plans/${plan.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50 group-hover:text-amber-700 dark:group-hover:text-amber-400 line-clamp-2">
                    {plan.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">v{plan.version}</span>
                  <span className={statusBadge(plan.status)}>{plan.status}</span>
                </div>
              </div>

              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                {plan.client.name}
              </p>

              {plan.summary && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{plan.summary}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {plan.objectives.length} objective{plan.objectives.length !== 1 ? 's' : ''}
                </span>
                <span>{plan._count.openItems} item{plan._count.openItems !== 1 ? 's' : ''}</span>
                <span>{formatDate(plan.date)}</span>
                {plan.lastReviewed && (
                  <span>Reviewed {formatRelative(plan.lastReviewed)}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
