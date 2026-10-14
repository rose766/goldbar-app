import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { SeverityBadge } from '@/components/rh/SeverityBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EscalationsPage() {
  const cases = await prisma.rHCase.findMany({
    where: { status: 'ESCALATED' },
    include: {
      client: { select: { name: true } },
      va: { select: { name: true } },
      _count: { select: { actions: true, followUps: true } },
    },
    orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
  })

  return (
    <div>
      <TopBar title="Escalated Cases" subtitle={`${cases.length} active escalation${cases.length !== 1 ? 's' : ''}`} />

      <div className="p-6">
        {cases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">No escalated cases. All clear!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Case #', 'Client', 'VA', 'Title', 'Severity', 'Actions', 'Follow-ups', 'AM', 'Last Updated'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/relationship-health/cases/${c.id}`} className="font-mono text-xs text-amber-700 hover:underline font-semibold">
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{c.client.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.va?.name ?? '—'}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <Link href={`/relationship-health/cases/${c.id}`} className="text-xs text-slate-900 hover:text-amber-700 truncate block font-medium">
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c._count.actions}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c._count.followUps}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.assignedAm}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
