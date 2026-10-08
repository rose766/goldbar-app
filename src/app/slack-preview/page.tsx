'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProposedData {
  title?: string
  description?: string
  nextStep?: string
  owner?: string
  ownerType?: string
  deadline?: string | null
  status?: string
  priority?: string
  blockerDescription?: string
  completionEvidence?: string
  openItemId?: string
  clientId?: string
  clientName?: string
  vaId?: string
  vaName?: string
}

interface Proposal {
  id: string
  reviewType: string
  status: string
  aiConfidence: 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'
  proposedAction: string
  aiInterpretation: string
  proposedData: ProposedData
  sourceMessage: string
  sourceTimestamp: string
  sourceLink: string | null
  linkedItem: {
    id: string
    title: string
    status: string
    client: { name: string }
    va: { name: string } | null
  } | null
  createdAt: string
}

interface LastRun {
  id: string
  runDate: string
  status: string
  channelName: string | null
  messagesAnalyzed: number
  messagesSkipped: number
  newItemsDetected: number
  updatesDetected: number
  completionsDetected: number
  itemsFlaggedForReview: number
  errorLog: string | null
  completedAt: string | null
}

interface Config {
  channelId: string | null
  channelName: string | null
  cursor: string | null
  lastSyncAt: string | null
  isEnabled: boolean
}

interface PreviewData {
  lastRun: LastRun | null
  proposals: Proposal[]
  reviewedCounts: Record<string, number>
  config: Config
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confidenceBadge(c: string) {
  if (c === 'HIGH') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-900 text-emerald-300">HIGH</span>
  if (c === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900 text-amber-300">MEDIUM</span>
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">NEEDS REVIEW</span>
}

function actionBadge(a: string) {
  const map: Record<string, string> = {
    CREATE_ITEM: 'bg-blue-900 text-blue-300',
    UPDATE_ITEM: 'bg-purple-900 text-purple-300',
    COMPLETE_ITEM: 'bg-emerald-900 text-emerald-300',
    DEADLINE_CHANGE: 'bg-amber-900 text-amber-300',
    OWNER_CHANGE: 'bg-indigo-900 text-indigo-300',
    FLAG_BLOCKER: 'bg-red-900 text-red-300',
    NEEDS_REVIEW: 'bg-zinc-700 text-zinc-300',
    INFORMATIONAL: 'bg-zinc-800 text-zinc-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[a] ?? 'bg-zinc-700 text-zinc-300'}`}>
      {a.replace(/_/g, ' ')}
    </span>
  )
}

function formatTs(ts: string | null | undefined) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  proposal,
  onClose,
  onSubmit,
}: {
  proposal: Proposal
  onClose: () => void
  onSubmit: (id: string, finalValue: string) => Promise<void>
}) {
  const [value, setValue] = useState(JSON.stringify(proposal.proposedData, null, 2))
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      JSON.parse(value) // validate
      await onSubmit(proposal.id, value)
      onClose()
    } catch {
      alert('Invalid JSON. Please fix before submitting.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl">
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Edit Proposed Data</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-4">
          <p className="text-sm text-zinc-400 mb-3">Edit the JSON below. Only valid JSON will be accepted.</p>
          <textarea
            className="w-full h-64 bg-zinc-800 border border-zinc-600 rounded-lg p-3 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500 resize-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="p-4 border-t border-zinc-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Approve with Edits'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onAction,
}: {
  proposal: Proposal
  onAction: (id: string, action: 'APPROVE' | 'REJECT' | 'IGNORE', extra?: string) => Promise<void>
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const act = async (action: 'APPROVE' | 'REJECT' | 'IGNORE') => {
    setLoading(action)
    await onAction(proposal.id, action)
    setLoading(null)
  }

  const pd = proposal.proposedData

  return (
    <>
      {editing && (
        <EditModal
          proposal={proposal}
          onClose={() => setEditing(false)}
          onSubmit={async (id, finalValue) => {
            await onAction(id, 'APPROVE', finalValue)
            setEditing(false)
          }}
        />
      )}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {actionBadge(proposal.proposedAction)}
            {confidenceBadge(proposal.aiConfidence)}
            <span className="text-xs text-zinc-500">{proposal.reviewType.replace(/_/g, ' ')}</span>
          </div>
          <span className="text-xs text-zinc-500">{formatTs(proposal.createdAt)}</span>
        </div>

        {/* AI interpretation */}
        <div className="bg-zinc-800 rounded-lg p-3">
          <p className="text-xs text-zinc-400 font-medium mb-1">AI Interpretation</p>
          <p className="text-sm text-zinc-200">{proposal.aiInterpretation}</p>
        </div>

        {/* Proposed fields */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {pd.clientName && <div><span className="text-zinc-500">Client</span><span className="ml-2 text-zinc-200">{pd.clientName}</span></div>}
          {pd.vaName && <div><span className="text-zinc-500">VA</span><span className="ml-2 text-zinc-200">{pd.vaName}</span></div>}
          {pd.title && <div className="col-span-2"><span className="text-zinc-500">Title</span><span className="ml-2 text-zinc-200 font-medium">{pd.title}</span></div>}
          {pd.status && <div><span className="text-zinc-500">Status</span><span className="ml-2 text-zinc-200">{pd.status}</span></div>}
          {pd.priority && <div><span className="text-zinc-500">Priority</span><span className="ml-2 text-zinc-200">{pd.priority}</span></div>}
          {pd.owner && <div><span className="text-zinc-500">Owner</span><span className="ml-2 text-zinc-200">{pd.owner}</span></div>}
          {pd.deadline !== undefined && (
            <div><span className="text-zinc-500">Deadline</span><span className="ml-2 text-zinc-200">{pd.deadline ?? '— (not specified)'}</span></div>
          )}
          {pd.nextStep && <div className="col-span-2"><span className="text-zinc-500">Next Step</span><span className="ml-2 text-zinc-200">{pd.nextStep}</span></div>}
          {pd.blockerDescription && <div className="col-span-2"><span className="text-zinc-500">Blocker</span><span className="ml-2 text-red-400">{pd.blockerDescription}</span></div>}
          {pd.completionEvidence && <div className="col-span-2"><span className="text-zinc-500">Completion Evidence</span><span className="ml-2 text-emerald-400">{pd.completionEvidence}</span></div>}
        </div>

        {/* Linked existing item */}
        {proposal.linkedItem && (
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 text-sm">
            <p className="text-zinc-500 text-xs mb-1">Linked Existing Item</p>
            <p className="text-zinc-200 font-medium">{proposal.linkedItem.title}</p>
            <p className="text-zinc-400 text-xs">{proposal.linkedItem.client.name}{proposal.linkedItem.va ? ` · ${proposal.linkedItem.va.name}` : ''} · {proposal.linkedItem.status}</p>
          </div>
        )}

        {/* Original Slack message */}
        <div className="bg-zinc-800/40 border-l-2 border-zinc-600 pl-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 font-medium">Original Slack Message</p>
            {proposal.sourceLink && (
              <a
                href={proposal.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-500 hover:text-amber-400 underline"
              >
                Open in Slack ↗
              </a>
            )}
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{proposal.sourceMessage}</p>
          <p className="text-xs text-zinc-500 mt-1">{proposal.sourceTimestamp}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => act('APPROVE')}
            disabled={loading !== null}
            className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading === 'APPROVE' ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={() => setEditing(true)}
            disabled={loading !== null}
            className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            ✎ Edit &amp; Approve
          </button>
          <button
            onClick={() => act('REJECT')}
            disabled={loading !== null}
            className="flex-1 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading === 'REJECT' ? '…' : '✕ Reject'}
          </button>
          <button
            onClick={() => act('IGNORE')}
            disabled={loading !== null}
            className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-400 hover:text-zinc-200 text-sm disabled:opacity-50 transition-colors"
          >
            {loading === 'IGNORE' ? '…' : 'Ignore'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SlackPreviewPage() {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'NEEDS_REVIEW'>('ALL')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/slack/preview')
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/slack/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDryRun: true }) })
      const json = await res.json()
      if (json.error) {
        setSyncResult(`Error: ${json.error}`)
      } else {
        setSyncResult(`Sync complete: ${json.messagesAnalyzed} messages analyzed, ${json.newItemsDetected} new items, ${json.updatesDetected} updates, ${json.completionsDetected} completions, ${json.itemsFlaggedForReview} flagged for review.`)
        await load()
      }
    } catch (e) {
      setSyncResult(`Sync failed: ${e}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleAction(id: string, action: 'APPROVE' | 'REJECT' | 'IGNORE', finalValue?: string) {
    const body: Record<string, string> = { action }
    if (action === 'APPROVE' && finalValue) {
      body.action = 'EDIT_AND_APPROVE'
      body.finalValue = finalValue
    }
    body.reviewedBy = 'Rose'

    await fetch(`/api/review/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setDismissed((prev) => { const s = new Set(prev); s.add(id); return s })
  }

  const proposals = (data?.proposals ?? []).filter((p) => !dismissed.has(p.id))
  const filtered = filter === 'ALL' ? proposals : proposals.filter((p) => p.aiConfidence === filter)

  const lr = data?.lastRun

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Slack Dry Run Preview</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Review AI-proposed changes before they reach production. No changes apply until you approve.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm"
          >
            Refresh
          </button>
          <button
            onClick={runSync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Run Dry Run'}
          </button>
        </div>
      </div>

      {/* Env warning */}
      {!loading && (!data?.config?.channelId) && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-amber-300 text-sm">
          <strong>Configuration required:</strong> Set <code className="font-mono bg-amber-900/50 px-1 rounded">SLACK_CHANNEL_ID</code>, <code className="font-mono bg-amber-900/50 px-1 rounded">SLACK_BOT_TOKEN</code>, and <code className="font-mono bg-amber-900/50 px-1 rounded">ANTHROPIC_API_KEY</code> in your <code className="font-mono bg-amber-900/50 px-1 rounded">.env</code> file to enable Slack sync.
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className={`rounded-xl p-4 text-sm ${syncResult.startsWith('Error') ? 'bg-red-900/30 border border-red-700 text-red-300' : 'bg-emerald-900/30 border border-emerald-700 text-emerald-300'}`}>
          {syncResult}
        </div>
      )}

      {/* Sync stats */}
      {lr && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-white">Last Sync Results</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${lr.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-300' : lr.status === 'FAILED' ? 'bg-red-900 text-red-300' : 'bg-amber-900 text-amber-300'}`}>
                {lr.status}
              </span>
              <span className="text-xs text-zinc-500">{lr.channelName ?? 'unknown channel'} · {formatTs(lr.runDate)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Messages Analyzed', value: lr.messagesAnalyzed },
              { label: 'Messages Skipped', value: lr.messagesSkipped },
              { label: 'New Items Detected', value: lr.newItemsDetected },
              { label: 'Updates Detected', value: lr.updatesDetected },
              { label: 'Completions Detected', value: lr.completionsDetected },
              { label: 'Flagged for Review', value: lr.itemsFlaggedForReview },
              { label: 'Approved', value: data?.reviewedCounts['APPROVED'] ?? 0 },
              { label: 'Rejected', value: data?.reviewedCounts['REJECTED'] ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-400 text-xs">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
          {lr.errorLog && (
            <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg p-3 text-xs text-red-300 font-mono">
              {lr.errorLog}
            </div>
          )}
        </div>
      )}

      {/* Config info */}
      {data?.config && (
        <div className="text-xs text-zinc-500 flex gap-4 flex-wrap">
          <span>Channel: <code className="font-mono text-zinc-400">{data.config.channelName ?? data.config.channelId ?? 'not set'}</code></span>
          <span>Cursor: <code className="font-mono text-zinc-400">{data.config.cursor ?? 'initial (full history)'}</code></span>
          <span>Last sync: <code className="font-mono text-zinc-400">{data.config.lastSyncAt ? formatTs(data.config.lastSyncAt) : 'never'}</code></span>
        </div>
      )}

      {/* Proposals */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-white">
            Pending Proposals <span className="text-zinc-400 font-normal">({proposals.length})</span>
          </h2>
          <div className="flex gap-2">
            {(['ALL', 'HIGH', 'MEDIUM', 'NEEDS_REVIEW'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'border border-zinc-600 text-zinc-400 hover:bg-zinc-800'}`}
              >
                {f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-12 text-center">
            <p className="text-zinc-400 text-lg">No pending proposals</p>
            <p className="text-zinc-500 text-sm mt-2">
              {proposals.length === 0
                ? 'Run a dry run to analyze your Slack channel.'
                : 'All proposals have been reviewed for this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
              <ProposalCard key={p.id} proposal={p} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
