import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import {
  formatDate, formatRelative, statusLabel, statusBadge, priorityBadge, priorityLabel,
  ownerTypeLabel, daysOverdue, daysWaiting, parseJsonArray, cn
} from '@/lib/utils'
import Link from 'next/link'
import {
  AlertCircle, Clock, User, Users, Calendar, ExternalLink,
  History, FileText, GitBranch, CheckCircle, AlertTriangle, Info, Star
} from 'lucide-react'
import type { Priority, ItemStatus, OwnerType, Confidence, DeadlineStatus } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function FieldRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-900 dark:text-slate-50">{value || <span className="text-slate-400">—</span>}</span>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const map: Record<string, string> = {
    HIGH: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    NEEDS_REVIEW: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium border', map[confidence] ?? map.NEEDS_REVIEW)}>
      {confidence === 'HIGH' ? '✓ High Confidence' : confidence === 'MEDIUM' ? '⚠ Medium Confidence' : '⚠ Needs Review'}
    </span>
  )
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.openItem.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      va: true,
      gamePlan: true,
      objective: true,
      milestone: true,
      history: { orderBy: { changedAt: 'desc' } },
      reviewItems: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!item) notFound()

  const dOver = item.isOverdue && item.deadline ? daysOverdue(new Date(item.deadline)) : 0
  const dWait = item.waitingSince ? daysWaiting(new Date(item.waitingSince)) : 0

  const fieldLabels: Record<string, string> = {
    status: 'Status', deadline: 'Deadline', owner: 'Owner', ownerType: 'Owner Type',
    priority: 'Priority', nextStep: 'Next Step', amFollowUp: 'AM Follow-Up',
    amFollowUpDate: 'AM Follow-Up Date', title: 'Title', description: 'Description',
    blockerDescription: 'Blocker', waitingSince: 'Waiting Since', lastConfirmed: 'Last Confirmed',
    completedDate: 'Completed Date', completionEvidence: 'Completion Evidence',
  }

  return (
    <div>
      <TopBar title={item.title} subtitle={`${item.client.name}${item.va ? ` / ${item.va.name}` : ''}`} />

      <div className="p-6 space-y-6 max-w-5xl">

        {/* ── Alert flags ── */}
        <div className="flex flex-wrap gap-2">
          {item.isOverdue && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4" /> {dOver} day{dOver !== 1 ? 's' : ''} overdue
            </span>
          )}
          {item.isDueSoon && !item.isOverdue && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="h-4 w-4" /> Due soon
            </span>
          )}
          {item.isStale && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              ⚠️ Stale item — no update past threshold
            </span>
          )}
          {item.isMissingDeadline && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
              📅 No deadline confirmed
            </span>
          )}
          {item.isMissingOwner && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-medium text-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
              👤 Owner unassigned
            </span>
          )}
          {item.status === 'BLOCKED' && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-300">
              🚫 Blocked
            </span>
          )}
          {item.amFollowUp && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="h-4 w-4" /> My Follow-Up
              {item.amFollowUpDate ? ` — ${formatDate(item.amFollowUpDate)}` : ''}
            </span>
          )}
          <ConfidenceBadge confidence={item.confidenceLevel} />
        </div>

        {/* ── Core info grid ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: Main details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Item Details
              </h2>
              <div className="space-y-4">
                <FieldRow label="Description" value={item.description} />
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/20 dark:border-amber-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Next Step</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200">{item.nextStep || <span className="text-slate-400">No next step defined</span>}</p>
                </div>
                {item.blockerDescription && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-950/20 dark:border-red-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400 mb-1">🚫 Blocker</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{item.blockerDescription}</p>
                    {item.dependency && <p className="text-xs text-slate-500 mt-1">Dependency: {item.dependency}</p>}
                  </div>
                )}
                {item.notes && <FieldRow label="Notes" value={item.notes} />}
              </div>
            </div>

            {/* Ownership */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" /> Ownership & Follow-Up
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 dark:bg-slate-900 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Task Owner</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.owner || 'UNASSIGNED'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ownerTypeLabel(item.ownerType as OwnerType)}</p>
                </div>
                <div className={cn(
                  'rounded-lg border p-3',
                  item.amFollowUp
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">AM Follow-Up (Rose)</p>
                  <p className={cn('text-sm font-semibold', item.amFollowUp ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500')}>
                    {item.amFollowUp ? '★ Yes' : 'No'}
                  </p>
                  {item.amFollowUpDate && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Follow-up: {formatDate(item.amFollowUpDate)}
                    </p>
                  )}
                  {item.amFollowUpNotes && <p className="text-xs text-slate-500 mt-0.5">{item.amFollowUpNotes}</p>}
                </div>
              </div>
              {(item.waitingSince || item.waitingFor) && (
                <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3 dark:bg-violet-950/20 dark:border-violet-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400 mb-1">Waiting</p>
                  {item.waitingFor && <p className="text-sm text-slate-800 dark:text-slate-200">{item.waitingFor}</p>}
                  {item.waitingSince && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                      Since {formatDate(item.waitingSince)} ({dWait} day{dWait !== 1 ? 's' : ''})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Source traceability */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-slate-400" /> Source Traceability
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <FieldRow label="Source" value={item.source} />
                <FieldRow label="Channel" value={item.sourceChannel} />
                <FieldRow label="Source Date" value={item.sourceDate ? formatDate(item.sourceDate) : null} />
                <FieldRow label="Source Timestamp" value={item.sourceTimestamp} />
              </div>
              {item.sourceMessage && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 dark:bg-slate-900 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Original Message</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{item.sourceMessage}"</p>
                </div>
              )}
              {item.sourceLink && (
                <a href={item.sourceLink} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                  <ExternalLink className="h-3 w-3" /> View original Slack message
                </a>
              )}
            </div>
          </div>

          {/* Right: Status sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">Status</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={statusBadge(item.status as ItemStatus)}>{statusLabel(item.status as ItemStatus)}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Priority</p>
                  <span className={cn(priorityBadge(item.priority as Priority))}>{priorityLabel(item.priority as Priority)}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Deadline</p>
                  <p className={cn('text-sm font-medium', item.isOverdue ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-slate-50')}>
                    {item.deadline ? formatDate(item.deadline) : <span className="text-orange-500">⚠ Missing</span>}
                  </p>
                  {item.deadlineStatus && <p className="text-xs text-slate-400">{item.deadlineStatus}</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Last Confirmed</p>
                  <p className="text-sm text-slate-900 dark:text-slate-50">
                    {item.lastConfirmed ? formatDate(item.lastConfirmed) : <span className="text-slate-400">Never</span>}
                  </p>
                  {item.lastConfirmedSource && <p className="text-xs text-slate-400">{item.lastConfirmedSource}</p>}
                </div>
                {item.status === 'COMPLETED' && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/20 dark:border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">✅ Completed</p>
                    {item.completedDate && <p className="text-xs text-slate-600 dark:text-slate-400">{formatDate(item.completedDate)}</p>}
                    {item.completionEvidence && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.completionEvidence}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Linked To</h2>
              <div className="space-y-2 text-sm">
                <Link href={`/clients/${item.clientId}`} className="flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400">
                  <Users className="h-3.5 w-3.5" /> {item.client.name}
                </Link>
                {item.va && (
                  <Link href={`/va/${item.vaId}`} className="flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400">
                    <User className="h-3.5 w-3.5" /> {item.va.name}
                  </Link>
                )}
                {item.gamePlan && (
                  <Link href={`/game-plans/${item.gamePlanId}`} className="flex items-center gap-1.5 text-blue-600 hover:underline dark:text-blue-400">
                    <FileText className="h-3.5 w-3.5" /> {item.gamePlan.title}
                  </Link>
                )}
                {item.objective && (
                  <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <GitBranch className="h-3.5 w-3.5" /> Obj: {item.objective.title}
                  </p>
                )}
                {item.milestone && (
                  <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <CheckCircle className="h-3.5 w-3.5" /> {item.milestone.title}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-50">Timestamps</h2>
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between"><span>Created</span><span>{formatDate(item.createdAt)}</span></div>
                <div className="flex justify-between"><span>Updated</span><span>{formatRelative(item.updatedAt)}</span></div>
                {item.isClientLevel && (
                  <div className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    Client-level item (no specific VA)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── History ── */}
        {item.history.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Change History</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {item.history.length}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {item.history.map(h => (
                <div key={h.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-slate-50">
                        <span className="font-medium">{fieldLabels[h.field] ?? h.field}</span> changed
                        {h.previousValue && (
                          <span className="text-slate-500"> from <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{h.previousValue.length > 60 ? h.previousValue.slice(0, 60) + '…' : h.previousValue}</span></span>
                        )}
                        {h.newValue && (
                          <span className="text-slate-500"> to <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{h.newValue.length > 60 ? h.newValue.slice(0, 60) + '…' : h.newValue}</span></span>
                        )}
                      </p>
                      {h.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {h.reason}</p>}
                      {h.source && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Source: {h.source}
                          {h.sourceLink && <a href={h.sourceLink} className="ml-1 text-blue-500 hover:underline">→ link</a>}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400">{formatRelative(h.changedAt)}</p>
                      <p className="text-xs text-slate-400">{h.changedBy ?? 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
