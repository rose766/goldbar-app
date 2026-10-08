import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { formatDate, formatRelative, cn } from '@/lib/utils'
import Link from 'next/link'
import { ExternalLink, CheckCircle, XCircle, Edit, EyeOff } from 'lucide-react'
import type { ReviewType, Confidence } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const REVIEW_TYPE_LABELS: Record<string, string> = {
  POSSIBLE_DUPLICATE: '🔁 Possible Duplicate',
  MISSING_DEADLINE: '📅 Missing Deadline',
  UNCLEAR_OWNER: '👤 Unclear Owner',
  UNCLEAR_CLIENT: '🏢 Unclear Client',
  UNCLEAR_VA: '👥 Unclear VA',
  POSSIBLE_COMPLETION: '✅ Possible Completion',
  POSSIBLE_DEADLINE_CHANGE: '📅 Deadline Change',
  MEDIUM_CONFIDENCE_EXTRACTION: '⚠️ Medium Confidence',
  CONFLICTING_INFORMATION: '⚡ Conflicting Information',
  NEW_GAME_PLAN: '📋 New Game Plan',
  PRIORITY_CHANGE: '🔺 Priority Change',
}

const REVIEW_TYPE_COLORS: Record<string, string> = {
  POSSIBLE_DUPLICATE: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  MISSING_DEADLINE: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  UNCLEAR_OWNER: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  UNCLEAR_CLIENT: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  UNCLEAR_VA: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  POSSIBLE_COMPLETION: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  POSSIBLE_DEADLINE_CHANGE: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  MEDIUM_CONFIDENCE_EXTRACTION: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  CONFLICTING_INFORMATION: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  NEW_GAME_PLAN: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  PRIORITY_CHANGE: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
}

const CONFIDENCE_CONFIG: Record<string, { label: string; cls: string }> = {
  HIGH: {
    label: 'High Confidence',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  MEDIUM: {
    label: 'Medium Confidence',
    cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  NEEDS_REVIEW: {
    label: 'Needs Review',
    cls: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  },
}

function parseProposedData(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function ProposedDataView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-semibold text-slate-500 dark:text-slate-400 capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}:
          </dt>
          <dd className="text-slate-800 dark:text-slate-200">{String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

async function getPendingReviews() {
  return prisma.reviewItem.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      openItem: {
        select: {
          id: true,
          title: true,
          client: { select: { name: true } },
          va: { select: { name: true } },
        },
      },
      analysisRun: {
        select: { id: true, runDate: true, channelName: true, status: true },
      },
    },
  })
}

type ReviewItemWithRelations = Awaited<ReturnType<typeof getPendingReviews>>[number]

export default async function ReviewPage() {
  const reviews = await getPendingReviews()

  return (
    <div>
      <TopBar title="AI Review Queue" subtitle={`${reviews.length} item${reviews.length !== 1 ? 's' : ''} pending review`} />

      <div className="p-6 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Review queue is clear</p>
            <p className="text-sm text-slate-400 mt-1">All AI-generated items have been reviewed.</p>
          </div>
        ) : (
          reviews.map((review: ReviewItemWithRelations) => {
            const typeLabel = REVIEW_TYPE_LABELS[review.reviewType] ?? review.reviewType
            const typeColor = REVIEW_TYPE_COLORS[review.reviewType] ?? REVIEW_TYPE_COLORS.NEW_GAME_PLAN
            const confidence = CONFIDENCE_CONFIG[review.aiConfidence] ?? CONFIDENCE_CONFIG.NEEDS_REVIEW
            const proposedData = parseProposedData(review.proposedData)

            return (
              <div
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden"
              >
                {/* Card header */}
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', typeColor)}>
                    {typeLabel}
                  </span>
                  <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', confidence.cls)}>
                    {confidence.label}
                  </span>
                  {review.openItem && (
                    <Link
                      href={`/items/${review.openItem.id}`}
                      className="flex items-center gap-1 text-xs text-slate-600 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                    >
                      <span className="font-medium">{review.openItem.title}</span>
                      <span className="text-slate-400">—</span>
                      <span>{review.openItem.client.name}</span>
                      {review.openItem.va && <span className="text-slate-400">/ {review.openItem.va.name}</span>}
                    </Link>
                  )}
                  <span className="ml-auto text-xs text-slate-400">{formatRelative(review.createdAt)}</span>
                </div>

                <div className="p-5 grid gap-4 md:grid-cols-2">
                  {/* Left column */}
                  <div className="space-y-4">
                    {/* AI Interpretation */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                        What AI thinks
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {review.aiInterpretation}
                      </p>
                    </div>

                    {/* Proposed action */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                        Proposed action
                      </h3>
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {review.proposedAction}
                        </p>
                        <ProposedDataView data={proposedData} />
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Original Slack message */}
                    {review.sourceMessage && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                          Original message
                        </h3>
                        <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-3 text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed line-clamp-6">
                          {review.sourceMessage}
                        </blockquote>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                          {review.sourceTimestamp && (
                            <span className="flex items-center gap-1">
                              <span>{formatDate(new Date(parseFloat(review.sourceTimestamp) * 1000))}</span>
                            </span>
                          )}
                          {review.sourceLink && (
                            <a
                              href={review.sourceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View in Slack
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analysis run info */}
                    {review.analysisRun && (
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                        Analysis run {formatDate(review.analysisRun.runDate)}
                        {review.analysisRun.channelName && ` · #${review.analysisRun.channelName}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Action:</span>
                  <form action={`/api/review/${review.id}`} method="POST" className="contents">
                    <input type="hidden" name="action" value="approve" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                  </form>
                  <form action={`/api/review/${review.id}`} method="POST" className="contents">
                    <input type="hidden" name="action" value="edit_and_approve" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                    >
                      <Edit className="h-4 w-4" />
                      Edit &amp; Approve
                    </button>
                  </form>
                  <form action={`/api/review/${review.id}`} method="POST" className="contents">
                    <input type="hidden" name="action" value="reject" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors dark:border-red-700 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </form>
                  <form action={`/api/review/${review.id}`} method="POST" className="contents">
                    <input type="hidden" name="action" value="ignore" />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <EyeOff className="h-4 w-4" />
                      Ignore
                    </button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
