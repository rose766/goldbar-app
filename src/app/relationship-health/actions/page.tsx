import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default async function ActionsPage() {
  const actions = await prisma.rHAction.findMany({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    include: {
      case: {
        select: {
          caseNumber: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }],
  })

  const overdue = actions.filter(a => a.dueDate && new Date(a.dueDate) < new Date())

  return (
    <div>
      <TopBar title="Open Actions" subtitle={`${actions.length} open · ${overdue.length} overdue`} />

      <div className="p-6">
        {actions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">No open actions. All clear!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Action #', 'Title', 'Case', 'Assigned To', 'Priority', 'Due Date', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map(a => {
                  const isOverdue = a.dueDate && new Date(a.dueDate) < new Date()
                  return (
                    <tr key={a.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.actionNumber}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <Link href={`/relationship-health/cases/${a.caseId}?tab=actions`} className="text-slate-900 hover:text-amber-700 font-medium truncate block">
                          {a.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/relationship-health/cases/${a.caseId}`} className="font-mono text-xs text-amber-700 hover:underline">
                          {a.case.caseNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{a.case.client.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{a.assignedTo ?? a.assignedRole}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[a.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                          {a.priority}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                        {a.dueDate ? formatDate(a.dueDate) : '—'}
                        {isOverdue && ' ⚠️'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
