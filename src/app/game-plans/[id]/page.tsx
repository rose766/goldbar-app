import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { ItemRow } from '@/components/dashboard/item-row'
import { formatDate, formatRelative, cn } from '@/lib/utils'
import Link from 'next/link'
import { FileText, GitBranch, CheckCircle, ChevronRight, Users, ExternalLink } from 'lucide-react'
import type { Priority, ItemStatus, OwnerType } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GamePlanDetailPage({ params }: { params: { id: string } }) {
  const plan = await prisma.gamePlan.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      previousVersion: { select: { id: true, title: true, version: true, date: true } },
      laterVersions: { select: { id: true, title: true, version: true, date: true, status: true }, take: 3 },
      objectives: {
        include: {
          milestones: { include: { va: { select: { name: true } } } },
          openItems: {
            include: { client: { select: { name: true } }, va: { select: { name: true } } },
          },
        },
        orderBy: { order: 'asc' },
      },
      openItems: {
        where: { objectiveId: null },
        include: { client: { select: { name: true } }, va: { select: { name: true } } },
      },
    },
  })

  if (!plan) notFound()

  const objectiveStatusColor: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    ON_HOLD: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500',
  }

  const milestoneStatusIcon: Record<string, string> = {
    NOT_STARTED: '○',
    IN_PROGRESS: '◐',
    COMPLETED: '●',
    BLOCKED: '✗',
    CANCELLED: '—',
  }

  return (
    <div>
      <TopBar title={plan.title} subtitle={`${plan.client.name} · Version ${plan.version} · ${plan.status}`} />

      <div className="p-6 space-y-6 max-w-5xl">

        {/* Version history notice */}
        {(plan.previousVersion || plan.laterVersions.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Version History</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {plan.previousVersion && (
                <Link href={`/game-plans/${plan.previousVersion.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400">
                  ← v{plan.previousVersion.version}: {plan.previousVersion.title} ({formatDate(plan.previousVersion.date)})
                </Link>
              )}
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                v{plan.version} (current)
              </span>
              {plan.laterVersions.map(v => (
                <Link key={v.id} href={`/game-plans/${v.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                  v{v.version}: {v.title} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Plan overview */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">Plan Overview</h2>
            {plan.summary && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{plan.summary}</p>
              </div>
            )}
            {plan.keyObjectives && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Key Objectives</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{plan.keyObjectives}</p>
              </div>
            )}
            {plan.keyCommitments && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Key Commitments</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{plan.keyCommitments}</p>
              </div>
            )}
            {plan.nextSteps && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/20 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Next Steps</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{plan.nextSteps}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Client</p>
                  <Link href={`/clients/${plan.clientId}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {plan.client.name}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Date</p>
                  <p className="text-slate-900 dark:text-slate-50">{formatDate(plan.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <p className="text-slate-900 dark:text-slate-50">{plan.status}</p>
                </div>
                {plan.lastReviewed && (
                  <div>
                    <p className="text-xs text-slate-400">Last Reviewed</p>
                    <p className="text-slate-900 dark:text-slate-50">{formatRelative(plan.lastReviewed)}</p>
                  </div>
                )}
                {plan.sourceLink && (
                  <div>
                    <p className="text-xs text-slate-400">Source</p>
                    <a href={plan.sourceLink} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block max-w-xs">
                      View source
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Objectives + Milestones */}
        {plan.objectives.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <GitBranch className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Objectives & Milestones</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {plan.objectives.map((obj, i) => (
                <div key={obj.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50">{obj.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {obj.dueDate && (
                        <span className="text-xs text-slate-500">{formatDate(obj.dueDate)}</span>
                      )}
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', objectiveStatusColor[obj.status])}>
                        {obj.status}
                      </span>
                    </div>
                  </div>
                  {obj.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{obj.description}</p>}

                  {obj.milestones.length > 0 && (
                    <div className="ml-4 space-y-1.5 mb-3">
                      {obj.milestones.map(ms => (
                        <div key={ms.id} className="flex items-center gap-2 text-sm">
                          <span className={cn('text-sm', ms.status === 'COMPLETED' ? 'text-emerald-500' : ms.status === 'BLOCKED' ? 'text-red-500' : 'text-slate-400')}>
                            {milestoneStatusIcon[ms.status] ?? '○'}
                          </span>
                          <span className={cn(ms.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300')}>
                            {ms.title}
                          </span>
                          {ms.va && <span className="text-xs text-slate-400">— {ms.va.name}</span>}
                          {ms.deadline && <span className="text-xs text-slate-400">{formatDate(ms.deadline)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {obj.openItems.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {obj.openItems.map(item => (
                        <ItemRow
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          clientName={item.client.name}
                          vaName={item.va?.name}
                          owner={item.owner}
                          ownerType={item.ownerType as OwnerType}
                          status={item.status as ItemStatus}
                          priority={item.priority as Priority}
                          deadline={item.deadline}
                          isOverdue={item.isOverdue}
                          isDueSoon={item.isDueSoon}
                          isStale={item.isStale}
                          isMissingDeadline={item.isMissingDeadline}
                          isMissingOwner={item.isMissingOwner}
                          amFollowUp={item.amFollowUp}
                          waitingSince={item.waitingSince}
                          nextStep={item.nextStep}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unlinked items */}
        {plan.openItems.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Additional Items (Not Under an Objective)</h2>
            </div>
            <div className="p-4 space-y-2">
              {plan.openItems.map(item => (
                <ItemRow
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  clientName={item.client.name}
                  vaName={item.va?.name}
                  owner={item.owner}
                  ownerType={item.ownerType as OwnerType}
                  status={item.status as ItemStatus}
                  priority={item.priority as Priority}
                  deadline={item.deadline}
                  isOverdue={item.isOverdue}
                  isDueSoon={item.isDueSoon}
                  amFollowUp={item.amFollowUp}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
