import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { ClientHealthChip } from '@/components/dashboard/client-health-chip'
import { formatDate, formatRelative } from '@/lib/utils'
import Link from 'next/link'
import type { ClientHealth } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getClients() {
  const clients = await prisma.client.findMany({
    include: {
      vas: true,
      openItems: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: {
          id: true,
          isOverdue: true,
          isMissingDeadline: true,
          amFollowUp: true,
          status: true,
        },
      },
    },
  })

  // Sort: AT_RISK first, then NEEDS_ATTENTION, then ON_TRACK
  const healthOrder: Record<string, number> = { AT_RISK: 0, NEEDS_ATTENTION: 1, ON_TRACK: 2 }
  return clients.sort((a, b) => {
    const aOrder = healthOrder[a.health] ?? 3
    const bOrder = healthOrder[b.health] ?? 3
    return aOrder - bOrder
  })
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div>
      <TopBar title="All Clients" />

      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Client', 'Health', 'VAs', 'Open', 'Overdue', 'Missing Deadline', 'AM Follow-Ups', 'Next Check-In', 'Last Activity'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                      No clients found.
                    </td>
                  </tr>
                ) : (
                  clients.map(client => {
                    const openCount = client.openItems.length
                    const overdueCount = client.openItems.filter(i => i.isOverdue).length
                    const missingDeadlineCount = client.openItems.filter(i => i.isMissingDeadline).length
                    const amFollowUpCount = client.openItems.filter(i => i.amFollowUp).length

                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-medium text-slate-900 dark:text-slate-50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
                          >
                            {client.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <ClientHealthChip
                            health={client.health as ClientHealth}
                            reasons={client.healthReasons}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {client.vas.length}
                        </td>
                        <td className="px-4 py-3">
                          <span className={openCount > 0 ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-slate-400'}>
                            {openCount}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {overdueCount > 0 ? (
                            <span className="font-semibold text-red-700 dark:text-red-400">{overdueCount}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {missingDeadlineCount > 0 ? (
                            <span className="font-semibold text-orange-700 dark:text-orange-400">{missingDeadlineCount}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {amFollowUpCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              ★ {amFollowUpCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {client.nextCheckIn ? formatDate(client.nextCheckIn) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                          {client.lastActivity ? formatRelative(client.lastActivity) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
