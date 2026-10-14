import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FollowUpsPage() {
  const followUps = await prisma.rHFollowUp.findMany({
    where: { status: 'PENDING' },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  const overdue = followUps.filter(f => new Date(f.dueDate) < new Date())

  return (
    <div>
      <TopBar title="Pending Follow-ups" subtitle={`${followUps.length} pending · ${overdue.length} overdue`} />

      <div className="p-6">
        {followUps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">No pending follow-ups. All clear!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Due Date', 'Case', 'Purpose', 'Type', 'Assigned To', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map(f => {
                  const isOverdue = new Date(f.dueDate) < new Date()
                  return (
                    <tr key={f.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className={`px-4 py-3 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatDate(f.dueDate)}{isOverdue && ' ⚠️'}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/relationship-health/cases/${f.case.id}?tab=follow-ups`} className="font-mono text-xs text-amber-700 hover:underline">
                          {f.case.caseNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{f.case.client.name}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-slate-700 truncate">{f.purpose}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{f.checkType ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{f.assignedTo}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
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
