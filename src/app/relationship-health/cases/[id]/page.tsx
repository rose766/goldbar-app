import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { StatusBadge } from '@/components/rh/StatusBadge'
import { SeverityBadge } from '@/components/rh/SeverityBadge'
import { ActionCard } from '@/components/rh/ActionCard'
import { FollowUpCard } from '@/components/rh/FollowUpCard'
import { AddEvidenceForm } from '@/components/rh/AddEvidenceForm'
import { AddActionForm } from '@/components/rh/AddActionForm'
import { AddFollowUpForm } from '@/components/rh/AddFollowUpForm'
import { CaseStatusSelect } from '@/components/rh/CaseStatusSelect'
import Link from 'next/link'
import { formatDate, formatRelative } from '@/lib/utils'
import { Plus, FileText, AlertTriangle, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { id: string }
  searchParams: { tab?: string }
}

async function getCase(id: string) {
  return prisma.rHCase.findUnique({
    where: { id },
    include: {
      client: true,
      va: true,
      scenarios: {
        include: { scenario: true },
        orderBy: { isPrimary: 'desc' },
      },
      assessments: {
        include: { responses: true },
        orderBy: { version: 'desc' },
      },
      evidence: { orderBy: { recordedAt: 'desc' } },
      rootCauses: { orderBy: { isPrimary: 'desc' } },
      coachingPlans: { orderBy: { version: 'desc' } },
      actions: { orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }] },
      followUps: { orderBy: { dueDate: 'asc' } },
      escalation: true,
      aiRecs: { orderBy: { createdAt: 'desc' }, take: 3 },
      statusHistory: { orderBy: { changedAt: 'desc' } },
    },
  })
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'actions', label: 'Actions' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'history', label: 'History' },
]

export default async function CaseDetailPage({ params, searchParams }: Props) {
  const rhCase = await getCase(params.id)
  if (!rhCase) notFound()

  const tab = searchParams.tab ?? 'overview'

  const openActions = rhCase.actions.filter(a => !['COMPLETED', 'CANCELLED'].includes(a.status))
  const completedActions = rhCase.actions.filter(a => a.status === 'COMPLETED')
  const pendingFollowUps = rhCase.followUps.filter(f => f.status === 'PENDING')
  const latestAssessment = rhCase.assessments[0]

  return (
    <div>
      <TopBar
        title={rhCase.caseNumber}
        subtitle={`${rhCase.client.name}${rhCase.va ? ` / ${rhCase.va.name}` : ''}`}
      />

      <div className="p-6">
        {/* Case header */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 mb-1">{rhCase.title}</h1>
              <div className="flex flex-wrap gap-2 items-center text-sm text-slate-500">
                <span>Assigned AM: <strong className="text-slate-700">{rhCase.assignedAm}</strong></span>
                <span>·</span>
                <span>Opened: {formatDate(rhCase.dateIdentified)}</span>
                {rhCase.nextReviewDate && (
                  <>
                    <span>·</span>
                    <span>Next review: <strong className="text-slate-700">{formatDate(rhCase.nextReviewDate)}</strong></span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SeverityBadge severity={rhCase.severity} />
              <CaseStatusSelect caseId={rhCase.id} currentStatus={rhCase.status} />
            </div>
          </div>

          {rhCase.description && (
            <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">{rhCase.description}</p>
          )}

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-4 gap-3 border-t border-slate-100 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{openActions.length}</p>
              <p className="text-xs text-slate-500">Open Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{pendingFollowUps.length}</p>
              <p className="text-xs text-slate-500">Pending Follow-ups</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{rhCase.evidence.length}</p>
              <p className="text-xs text-slate-500">Evidence Items</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{rhCase.assessments.length}</p>
              <p className="text-xs text-slate-500">Assessments</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex gap-0 -mb-px">
            {TABS.map(t => (
              <Link
                key={t.id}
                href={`/relationship-health/cases/${params.id}?tab=${t.id}`}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-amber-500 text-amber-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Scenarios */}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Identified Scenarios</h2>
                <Link
                  href="/relationship-health/scenarios"
                  className="text-xs text-amber-700 hover:underline"
                >
                  Browse library →
                </Link>
              </div>
              {rhCase.scenarios.length === 0 ? (
                <p className="text-sm text-slate-400">No scenarios assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {rhCase.scenarios.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      {s.isPrimary && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Primary</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {s.scenario.scenarioNumber}. {s.scenario.title}
                        </p>
                        <p className="text-xs text-slate-500">{s.scenario.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Feedback */}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Feedback on File</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Client</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {rhCase.clientFeedback || <span className="text-slate-400">No client feedback recorded</span>}
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">VA</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {rhCase.vaFeedback || <span className="text-slate-400">No VA feedback recorded</span>}
                  </p>
                </div>
              </div>
            </section>

            {/* AI Recommendations */}
            {rhCase.aiRecs.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-slate-900">AI Analysis</h2>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    DRAFT — Pending Human Review
                  </span>
                </div>
                {rhCase.aiRecs.filter(r => r.status === 'DRAFT').slice(0, 1).map(rec => (
                  <div key={rec.id} className="space-y-3 text-sm text-slate-700">
                    {rec.summaryText && (
                      <div>
                        <p className="font-medium text-slate-900 mb-1">Summary</p>
                        <p className="text-slate-600">{rec.summaryText}</p>
                      </div>
                    )}
                    {rec.primaryRootCause && (
                      <div>
                        <p className="font-medium text-slate-900 mb-1">Primary Root Cause</p>
                        <p className="text-slate-600">{rec.primaryRootCause}</p>
                      </div>
                    )}
                    {rec.escalationConcerns && rec.escalationConcerns !== 'None identified' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="font-medium text-red-700 mb-1">Escalation Concerns</p>
                        <p className="text-red-600 text-xs">{rec.escalationConcerns}</p>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* Tab: Assessment */}
        {tab === 'assessment' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Diagnostic Assessments</h2>
              <form action={`/api/rh/cases/${params.id}/assessments`} method="POST">
                <Link
                  href={`/relationship-health/cases/${params.id}/assessment/new`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  <Plus className="h-3.5 w-3.5" /> New Assessment
                </Link>
              </form>
            </div>

            {rhCase.assessments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No assessments yet</p>
                <p className="text-xs text-slate-400 mt-1">Start a diagnostic assessment to evaluate the relationship</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rhCase.assessments.map(a => {
                  const answered = a.responses.length
                  const yesCount = a.responses.filter(r => r.answer === 'YES').length
                  const noCount = a.responses.filter(r => r.answer === 'NO').length
                  return (
                    <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Version {a.version}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                              a.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>{a.status}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            By {a.assessedBy} · {formatRelative(a.assessmentDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{answered} answered · {yesCount} YES · {noCount} NO</span>
                          <Link
                            href={`/relationship-health/cases/${params.id}/assessment/${a.id}`}
                            className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                          >
                            {a.status === 'COMPLETED' ? 'View' : 'Continue'}
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Evidence */}
        {tab === 'evidence' && (
          <div className="space-y-6">
            <AddEvidenceForm caseId={params.id} />

            {rhCase.evidence.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm text-slate-400">No evidence recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rhCase.evidence.map(e => (
                  <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {e.sourceType}
                          </span>
                          {e.isConfirmed && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Confirmed</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900">{e.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{e.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-slate-400">{formatRelative(e.recordedAt)}</p>
                        <p className="text-xs text-slate-400">{e.recordedBy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Actions */}
        {tab === 'actions' && (
          <div className="space-y-6">
            <AddActionForm caseId={params.id} />

            {openActions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                  Open ({openActions.length})
                </h3>
                <div className="space-y-3">
                  {openActions.map(a => <ActionCard key={a.id} action={a} caseId={params.id} />)}
                </div>
              </div>
            )}

            {completedActions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                  Completed ({completedActions.length})
                </h3>
                <div className="space-y-3">
                  {completedActions.map(a => <ActionCard key={a.id} action={a} caseId={params.id} />)}
                </div>
              </div>
            )}

            {rhCase.actions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm text-slate-400">No actions yet</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Follow-ups */}
        {tab === 'follow-ups' && (
          <div className="space-y-6">
            <AddFollowUpForm caseId={params.id} />

            {rhCase.followUps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm text-slate-400">No follow-ups scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rhCase.followUps.map(f => <FollowUpCard key={f.id} followUp={f} />)}
              </div>
            )}
          </div>
        )}

        {/* Tab: History */}
        {tab === 'history' && (
          <div className="space-y-3">
            {rhCase.statusHistory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm text-slate-400">No status changes recorded</p>
              </div>
            ) : (
              rhCase.statusHistory.map(h => (
                <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <StatusBadge status={h.fromStatus} />
                        <span className="text-slate-400">→</span>
                        <StatusBadge status={h.toStatus} />
                      </div>
                      {h.reason && (
                        <p className="text-sm text-slate-600 mt-1">{h.reason}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">By {h.changedBy}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatRelative(h.changedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
