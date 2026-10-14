import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { SeverityBadge } from '@/components/rh/SeverityBadge'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const STATUSES = [
  'NEW', 'AWAITING_ASSESSMENT', 'UNDER_INVESTIGATION', 'COACHING_IN_PROGRESS',
  'RECOVERY_PLAN_ACTIVE', 'MONITORING', 'AWAITING_CLIENT_INPUT', 'AWAITING_VA_ACTION',
  'ESCALATED', 'RESTAFFING_UNDER_REVIEW', 'RESOLVED', 'CLOSED', 'REOPENED',
]

const SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

interface PageProps {
  searchParams: { status?: string; severity?: string; search?: string }
}

async function getCases(filters: { status?: string; severity?: string; search?: string }) {
  const where: Record<string, unknown> = {}

  if (filters.status && STATUSES.includes(filters.status)) {
    where.status = filters.status
  }
  if (filters.severity && SEVERITIES.includes(filters.severity)) {
    where.severity = filters.severity
  }
  if (filters.search) {
    where.OR = [
      { caseNumber: { contains: filters.search } },
      { title: { contains: filters.search } },
      { client: { name: { contains: filters.search } } },
      { va: { name: { contains: filters.search } } },
    ]
  }

  return prisma.rHCase.findMany({
    where,
    include: {
      client: { select: { name: true } },
      va: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  })
}

export default async function CasesPage({ searchParams }: PageProps) {
  const cases = await getCases(searchParams)

  return (
    <div>
      <TopBar title="Cases" subtitle="All Relationship Health Cases" />

      <div className="p-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterBar searchParams={searchParams} />
          <Link
            href="/relationship-health/cases/new"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> New Case
          </Link>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Case #', 'Client', 'VA', 'Primary Issue', 'Severity', 'Status', 'Assigned AM', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      No cases found. {Object.keys(searchParams).length > 0 ? 'Try clearing the filters.' : 'Create your first case.'}
                    </td>
                  </tr>
                ) : (
                  cases.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-amber-700">{c.caseNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.client.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.va?.name ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-slate-700" title={c.title}>{c.title}</p>
                      </td>
                      <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{c.assignedAm}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/relationship-health/cases/${c.id}`}
                          className="text-xs font-medium text-slate-500 hover:text-amber-700"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterBar({ searchParams }: { searchParams: { status?: string; severity?: string; search?: string } }) {
  return (
    <form method="GET" className="flex flex-wrap gap-3">
      <input
        name="search"
        defaultValue={searchParams.search ?? ''}
        placeholder="Search cases, clients, VAs..."
        className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-56"
      />
      <select
        name="status"
        defaultValue={searchParams.status ?? ''}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="">All Statuses</option>
        {STATUSES.map(s => (
          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
        ))}
      </select>
      <select
        name="severity"
        defaultValue={searchParams.severity ?? ''}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="">All Severities</option>
        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button
        type="submit"
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Filter
      </button>
      {(searchParams.status || searchParams.severity || searchParams.search) && (
        <Link href="/relationship-health/cases" className="rounded-md px-3 py-2 text-sm text-slate-500 hover:text-slate-900">
          Clear
        </Link>
      )}
    </form>
  )
}
