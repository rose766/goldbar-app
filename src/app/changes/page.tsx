import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { formatDate, formatRelative, cn } from '@/lib/utils'
import Link from 'next/link'
import { ExternalLink, Clock } from 'lucide-react'
import { subDays, isToday, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Map DB field names to human-readable labels
const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  deadline: 'Deadline',
  owner: 'Owner',
  ownerType: 'Owner Type',
  priority: 'Priority',
  nextStep: 'Next Step',
  amFollowUp: 'AM Follow-Up',
  amFollowUpDate: 'Follow-Up Date',
  amFollowUpNotes: 'Follow-Up Notes',
  title: 'Title',
  description: 'Description',
  waitingSince: 'Waiting Since',
  waitingFor: 'Waiting For',
  lastConfirmed: 'Last Confirmed',
  isOverdue: 'Overdue',
  isDueSoon: 'Due Soon',
  isStale: 'Stale',
  isMissingDeadline: 'Missing Deadline',
  isMissingOwner: 'Missing Owner',
  isMissingNextStep: 'Missing Next Step',
  blockerDescription: 'Blocker',
  dependency: 'Dependency',
  completionEvidence: 'Completion Evidence',
  completedDate: 'Completed Date',
  notes: 'Notes',
}

function formatFieldValue(field: string, value: string | null): string {
  if (value === null || value === undefined) return '—'
  // Boolean fields
  if (value === 'true') return 'Yes'
  if (value === 'false') return 'No'
  // Date-looking fields
  if (field.toLowerCase().includes('date') || field.toLowerCase().includes('since') || field === 'deadline') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return formatDate(d)
  }
  return value
}

function sourceBadge(source: string | null) {
  const map: Record<string, string> = {
    SLACK: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    MANUAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    SYSTEM: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    AI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  }
  if (!source) return null
  const cls = map[source.toUpperCase()] ?? map.MANUAL
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', cls)}>
      {source}
    </span>
  )
}

function groupLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  if (isWithinInterval(date, { start: weekStart, end: weekEnd })) return 'Earlier This Week'
  const lastWeekStart = subDays(weekStart, 7)
  const lastWeekEnd = subDays(weekStart, 1)
  if (isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd })) return 'Last Week'
  return formatDate(date, 'MMMM d, yyyy')
}

async function getChanges(days: number) {
  const since = subDays(new Date(), days)
  const history = await prisma.openItemHistory.findMany({
    where: { changedAt: { gte: since } },
    orderBy: { changedAt: 'desc' },
    take: 100,
    include: {
      openItem: {
        select: {
          id: true,
          title: true,
          client: { select: { name: true } },
          va: { select: { name: true } },
        },
      },
    },
  })
  return history
}

interface SearchParams {
  days?: string
}

export default async function ChangesPage({ searchParams }: { searchParams: SearchParams }) {
  const days = parseInt(searchParams?.days ?? '7', 10)
  const validDays = [1, 3, 7, 30].includes(days) ? days : 7
  const changes = await getChanges(validDays)

  // Group by day label
  const groups: Record<string, typeof changes> = {}
  for (const entry of changes) {
    const label = groupLabel(entry.changedAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(entry)
  }
  const groupOrder = Object.keys(groups)

  const filterButtons = [
    { label: 'Today', value: 1 },
    { label: 'Last 3 days', value: 3 },
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 30 days', value: 30 },
  ]

  return (
    <div>
      <TopBar title="What Changed" subtitle={`${changes.length} changes in the last ${validDays} day${validDays === 1 ? '' : 's'}`} />

      <div className="p-6 space-y-6">
        {/* Date filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Show:</span>
          {filterButtons.map(btn => (
            <Link
              key={btn.value}
              href={`/changes?days=${btn.value}`}
              className={cn(
                'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                validDays === btn.value
                  ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600'
              )}
            >
              {btn.label}
            </Link>
          ))}
        </div>

        {changes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
            No changes found in this time range.
          </div>
        ) : (
          groupOrder.map(groupName => (
            <div key={groupName}>
              {/* Group header */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{groupName}</span>
                <span className="text-xs text-slate-400">{groups[groupName].length} change{groups[groupName].length !== 1 ? 's' : ''}</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              </div>

              {/* Change entries */}
              <div className="space-y-2">
                {groups[groupName].map(entry => {
                  const fieldLabel = FIELD_LABELS[entry.field] ?? entry.field
                  const prevFormatted = formatFieldValue(entry.field, entry.previousValue)
                  const newFormatted = formatFieldValue(entry.field, entry.newValue)

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        {/* Left: item + change detail */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Link
                              href={`/items/${entry.openItem.id}`}
                              className="font-semibold text-slate-900 hover:text-amber-700 dark:text-slate-50 dark:hover:text-amber-400 hover:underline transition-colors text-sm"
                            >
                              {entry.openItem.title}
                            </Link>
                            <span className="text-slate-400 text-xs">{entry.openItem.client.name}</span>
                            {entry.openItem.va && (
                              <span className="text-slate-400 text-xs">/ {entry.openItem.va.name}</span>
                            )}
                          </div>

                          {/* Field change */}
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-slate-600 dark:text-slate-400">{fieldLabel}</span>
                            <span className="text-slate-400">changed</span>
                            {entry.previousValue !== null && (
                              <>
                                <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs line-through text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                  {prevFormatted}
                                </span>
                                <span className="text-slate-400">→</span>
                              </>
                            )}
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              {newFormatted}
                            </span>
                          </div>

                          {/* Reason */}
                          {entry.reason && (
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
                              {entry.reason}
                            </p>
                          )}
                        </div>

                        {/* Right: meta */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {entry.changedBy && (
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                entry.changedBy === 'AI'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              )}>
                                {entry.changedBy === 'AI' ? '🤖 AI' : entry.changedBy}
                              </span>
                            )}
                            {sourceBadge(entry.source)}
                            {entry.sourceLink && (
                              <a
                                href={entry.sourceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Source
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatRelative(entry.changedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
