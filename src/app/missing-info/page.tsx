import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import {
  formatDate,
  statusLabel,
  statusBadge,
  priorityLabel,
  priorityBadge,
  ownerTypeLabel,
  cn,
} from '@/lib/utils'
import Link from 'next/link'
import type { Priority, ItemStatus, OwnerType } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EXCLUDED = ['COMPLETED', 'CANCELLED']

async function getMissingInfoData() {
  const [missingDeadline, missingOwner, missingNextStep, needsClarification] = await Promise.all([
    prisma.openItem.findMany({
      where: { isMissingDeadline: true, status: { notIn: EXCLUDED } },
      include: { client: { select: { name: true } }, va: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.openItem.findMany({
      where: { isMissingOwner: true, status: { notIn: EXCLUDED } },
      include: { client: { select: { name: true } }, va: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.openItem.findMany({
      where: { isMissingNextStep: true, status: { notIn: EXCLUDED } },
      include: { client: { select: { name: true } }, va: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.openItem.findMany({
      where: { status: 'NEEDS_CLARIFICATION' },
      include: { client: { select: { name: true } }, va: { select: { name: true } } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  return { missingDeadline, missingOwner, missingNextStep, needsClarification }
}

interface ItemTableProps {
  items: Array<{
    id: string
    title: string
    client: { name: string }
    va: { name: string } | null
    owner: string | null
    ownerType: string
    status: string
    priority: string
    createdAt: Date
  }>
  emptyMessage: string
}

function ItemTable({ items, emptyMessage }: ItemTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Item', 'Client', 'VA', 'Owner', 'Status', 'Priority', 'Created'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/items/${item.id}`}
                    className="font-medium text-slate-900 hover:text-amber-700 dark:text-slate-50 dark:hover:text-amber-400 hover:underline transition-colors"
                  >
                    {item.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.client.name}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.va?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-700 dark:text-slate-300">
                    {item.owner || <span className="text-slate-400 italic">Unassigned</span>}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {ownerTypeLabel(item.ownerType as OwnerType)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={statusBadge(item.status as ItemStatus)}>
                    {statusLabel(item.status as ItemStatus)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={priorityBadge(item.priority as Priority)}>
                    {priorityLabel(item.priority as Priority)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(item.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

interface SectionProps {
  title: string
  icon: string
  count: number
  color: string
  children: React.ReactNode
}

function Section({ title, icon, count, color, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className={cn('flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800', color)}>
        <span className="text-lg">{icon}</span>
        <h2 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        <span className={cn(
          'ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
          count > 0
            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        )}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

export default async function MissingInfoPage() {
  const { missingDeadline, missingOwner, missingNextStep, needsClarification } = await getMissingInfoData()
  const total = missingDeadline.length + missingOwner.length + missingNextStep.length + needsClarification.length

  return (
    <div>
      <TopBar title="Missing Information" subtitle={`${total} items need attention`} />

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Missing Deadline', count: missingDeadline.length, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Missing Owner', count: missingOwner.length, color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Missing Next Step', count: missingNextStep.length, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Needs Clarification', count: needsClarification.length, color: 'text-amber-600 dark:text-amber-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
              <span className={cn('text-lg font-bold', color)}>{count}</span>
            </div>
          ))}
        </div>

        {/* Section: Missing Deadline */}
        <Section title="Missing Deadline" icon="📅" count={missingDeadline.length} color="">
          <ItemTable items={missingDeadline} emptyMessage="No items missing a deadline." />
        </Section>

        {/* Section: Missing Owner */}
        <Section title="Missing Owner" icon="👤" count={missingOwner.length} color="">
          <ItemTable items={missingOwner} emptyMessage="No items missing an owner." />
        </Section>

        {/* Section: Missing Next Step */}
        <Section title="Missing Next Step" icon="➡️" count={missingNextStep.length} color="">
          <ItemTable items={missingNextStep} emptyMessage="No items missing a next step." />
        </Section>

        {/* Section: Needs Clarification */}
        <Section title="Needs Clarification" icon="❓" count={needsClarification.length} color="">
          <ItemTable items={needsClarification} emptyMessage="No items need clarification." />
        </Section>
      </div>
    </div>
  )
}
