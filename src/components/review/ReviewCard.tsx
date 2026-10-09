'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Edit, EyeOff, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Constants (mirrored from review page) ────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

// Serialized review (Dates converted to ISO strings for client component props)
export interface SerializedReview {
  id: string
  reviewType: string
  aiConfidence: string
  aiInterpretation: string
  proposedAction: string
  proposedData: string
  sourceMessage: string | null
  sourceLink: string | null
  sourceTimestamp: string | null
  createdAtISO: string
  openItemId: string | null
  openItem: {
    id: string
    title: string
    client: { name: string }
    va: { name: string } | null
  } | null
  sourceDocument: {
    id: string
    title: string
    sourceType: string
  } | null
}

function parseProposedData(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function formatRelative(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function ProposedDataView({ data }: { data: Record<string, unknown> }) {
  const SKIP_KEYS = new Set(['clientId', 'vaId', 'openItemId'])
  const entries = Object.entries(data).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && v !== '' && v !== false
  )
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewCard({ review }: { review: SerializedReview }) {
  const router = useRouter()
  const [uiStatus, setUiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionLabel, setActionLabel] = useState<string>('')

  const proposedData = parseProposedData(review.proposedData)
  const typeLabel = REVIEW_TYPE_LABELS[review.reviewType] ?? review.reviewType
  const typeColor = REVIEW_TYPE_COLORS[review.reviewType] ?? REVIEW_TYPE_COLORS.NEW_GAME_PLAN
  const confidence = CONFIDENCE_CONFIG[review.aiConfidence] ?? CONFIDENCE_CONFIG.NEEDS_REVIEW

  // Client-not-found blocking: if no existing openItem linked AND no clientId in proposedData
  const clientNotFound = proposedData.clientNotFound === true
  const approvalBlocked = !review.openItemId && !proposedData.clientId

  async function submit(action: string, label: string) {
    setUiStatus('loading')
    setErrorMsg(null)
    setActionLabel(label)
    try {
      const res = await fetch(`/api/review/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        setUiStatus('done')
        // Refresh server component data after brief animation delay
        setTimeout(() => router.refresh(), 700)
      } else {
        let msg = 'Action failed — please try again'
        try {
          const data = await res.json()
          msg = data.error ?? msg
        } catch { /* ignore */ }
        setUiStatus('error')
        setErrorMsg(msg)
      }
    } catch {
      setUiStatus('error')
      setErrorMsg('Network error — please try again')
    }
  }

  // Success state: fade-out card
  if (uiStatus === 'done') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 px-5 py-4 flex items-center gap-3 animate-pulse">
        <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {actionLabel} — refreshing queue…
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">

      {/* Client-not-found warning banner */}
      {(clientNotFound || approvalBlocked) && (
        <div className="flex items-start gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Client not identified.</span>{' '}
            The AI could not match a client to this proposal. Direct approval is blocked — no Open Item
            will be created without a valid client. Use{' '}
            <span className="font-semibold">Edit &amp; Approve</span> to supply the client ID manually,
            or <span className="font-semibold">Reject</span> and re-ingest with a clearer client hint.
          </p>
        </div>
      )}

      {/* Error banner */}
      {uiStatus === 'error' && errorMsg && (
        <div className="flex items-start gap-3 px-5 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
        </div>
      )}

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
        <span className="ml-auto text-xs text-slate-400">{formatRelative(review.createdAtISO)}</span>
      </div>

      <div className="p-5 grid gap-4 md:grid-cols-2">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              What AI thinks
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {review.aiInterpretation}
            </p>
          </div>

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
          {review.sourceMessage && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                Source excerpt
              </h3>
              <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-3 text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed line-clamp-6">
                {review.sourceMessage}
              </blockquote>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                {review.sourceTimestamp && <span>{review.sourceTimestamp}</span>}
                {review.sourceLink && (
                  <a
                    href={review.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 dark:text-blue-400"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View source
                  </a>
                )}
              </div>
            </div>
          )}

          {review.sourceDocument && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              From:{' '}
              <Link
                href={`/documents/${review.sourceDocument.id}`}
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                {review.sourceDocument.title}
              </Link>
              <span className="ml-2 text-slate-400">{review.sourceDocument.sourceType}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Action:</span>

        <button
          onClick={() => submit('APPROVE', 'Approved')}
          disabled={uiStatus === 'loading' || approvalBlocked}
          title={
            approvalBlocked
              ? 'Client not identified — use Edit & Approve to supply a client ID'
              : undefined
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
            approvalBlocked
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
              : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50',
            uiStatus === 'loading' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <CheckCircle className="h-4 w-4" />
          Approve
        </button>

        <button
          onClick={() => submit('EDIT_AND_APPROVE', 'Edited & Approved')}
          disabled={uiStatus === 'loading'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50',
            uiStatus === 'loading' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <Edit className="h-4 w-4" />
          Edit &amp; Approve
        </button>

        <button
          onClick={() => submit('REJECT', 'Rejected')}
          disabled={uiStatus === 'loading'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors dark:border-red-700 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50',
            uiStatus === 'loading' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <XCircle className="h-4 w-4" />
          Reject
        </button>

        <button
          onClick={() => submit('IGNORE', 'Ignored')}
          disabled={uiStatus === 'loading'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
            uiStatus === 'loading' && 'opacity-60 cursor-not-allowed'
          )}
        >
          <EyeOff className="h-4 w-4" />
          Ignore
        </button>
      </div>
    </div>
  )
}
