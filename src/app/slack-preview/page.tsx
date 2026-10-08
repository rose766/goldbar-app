'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  allChannels: number
  accessibleChannels: number
  excludedChannels: number
  ingestionEnabled: number
  analysisEnabled: number
  errorChannels: number
  totalMessages: number
  pendingProposals: number
}

interface WorkspaceData {
  configured: boolean
  liveSyncEnabled: boolean
  workspace: {
    teamId: string
    teamName: string | null
    teamDomain: string | null
    totalChannels: number
    accessibleChannels: number
    lastDiscoveredAt: string | null
    lastSyncAt: string | null
  } | null
  stats: WorkspaceStats
  lastRun: {
    id: string
    runDate: string
    status: string
    channelName: string | null
    messagesAnalyzed: number
    itemsFlaggedForReview: number
  } | null
  channelsWithErrors: Array<{
    slackChannelId: string
    channelName: string | null
    lastError: string | null
    lastSyncAt: string | null
  }>
}

interface Channel {
  id: string
  slackChannelId: string
  channelName: string | null
  channelType: string
  isPrivate: boolean
  isArchived: boolean
  isMember: boolean
  isAccessible: boolean
  enabled: boolean
  ingestionEnabled: boolean
  analysisEnabled: boolean
  classification: string
  cursor: string | null
  lastSyncAt: string | null
  lastSuccessfulSyncAt: string | null
  lastError: string | null
  messagesAnalyzed: number
  totalMessages: number
  updatedAt: string
}

interface ProposedData {
  title?: string
  description?: string
  nextStep?: string
  owner?: string
  status?: string
  priority?: string
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rel(d: string | null) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function classificationColor(c: string) {
  const map: Record<string, string> = {
    CLIENT: 'bg-blue-900 text-blue-300',
    INTERNAL: 'bg-slate-700 text-slate-300',
    OPERATIONS: 'bg-violet-900 text-violet-300',
    STAFFING: 'bg-cyan-900 text-cyan-300',
    HR: 'bg-pink-900 text-pink-300',
    LEADERSHIP: 'bg-amber-900 text-amber-300',
    TRAINING: 'bg-green-900 text-green-300',
    SOCIAL: 'bg-rose-900 text-rose-300',
    OTHER: 'bg-slate-700 text-slate-400',
    EXCLUDED: 'bg-red-950 text-red-400',
  }
  return map[c] ?? 'bg-slate-700 text-slate-400'
}

function confidenceBadge(c: string) {
  if (c === 'HIGH') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-900 text-emerald-300">HIGH</span>
  if (c === 'MEDIUM') return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900 text-amber-300">MEDIUM</span>
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">NEEDS REVIEW</span>
}

const CLASSIFICATIONS = ['ALL', 'CLIENT', 'INTERNAL', 'OPERATIONS', 'STAFFING', 'HR', 'LEADERSHIP', 'TRAINING', 'SOCIAL', 'OTHER', 'EXCLUDED']
const BACKFILL_PRESETS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'Full history', value: 'full' },
]

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SlackControlCenter() {
  const [tab, setTab] = useState<'workspace' | 'channels' | 'proposals'>('workspace')
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [reviewedCounts, setReviewedCounts] = useState<Record<string, number>>({})
  const [classFilter, setClassFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [backfillChannel, setBackfillChannel] = useState<string | null>(null)
  const [backfillPreset, setBackfillPreset] = useState('30d')

  const loadWorkspace = useCallback(async () => {
    const r = await fetch('/api/slack/workspace')
    if (r.ok) setWorkspace(await r.json())
  }, [])

  const loadChannels = useCallback(async () => {
    const q = classFilter !== 'ALL' ? `?classification=${classFilter}` : ''
    const r = await fetch(`/api/slack/channels${q}`)
    if (r.ok) {
      const d = await r.json()
      setChannels(d.channels ?? [])
    }
  }, [classFilter])

  const loadProposals = useCallback(async () => {
    const r = await fetch('/api/slack/preview')
    if (r.ok) {
      const d = await r.json()
      setProposals(d.proposals ?? [])
      setReviewedCounts(d.reviewedCounts ?? {})
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadWorkspace(), loadChannels(), loadProposals()]).finally(() => setLoading(false))
  }, [loadWorkspace, loadChannels, loadProposals])

  useEffect(() => {
    if (tab === 'channels') loadChannels()
  }, [classFilter, tab, loadChannels])

  async function discover() {
    setBusy(true); setActionMsg('')
    try {
      const r = await fetch('/api/slack/workspace/discover', { method: 'POST' })
      const d = await r.json()
      if (r.ok) {
        setActionMsg(`Discovered ${d.channelsDiscovered} channels (${d.channelsAccessible} accessible)`)
        await loadWorkspace(); await loadChannels()
      } else {
        setActionMsg(`Error: ${d.error}`)
      }
    } finally { setBusy(false) }
  }

  async function runSync() {
    setBusy(true); setActionMsg('')
    try {
      const r = await fetch('/api/slack/workspace/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDryRun: true }) })
      const d = await r.json()
      if (r.ok) {
        setActionMsg(`Sync complete — ${d.ingestion?.totalMessagesIngested ?? 0} new messages, ${d.analysis?.proposalsCreated ?? 0} proposals`)
        await loadWorkspace(); await loadProposals()
      } else {
        setActionMsg(`Error: ${d.error}`)
      }
    } finally { setBusy(false) }
  }

  async function patchChannel(id: string, patch: Record<string, unknown>) {
    const r = await fetch(`/api/slack/channels/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (r.ok) await loadChannels()
    return r.ok
  }

  async function runChannelSync(id: string) {
    setBusy(true); setActionMsg('')
    try {
      const r = await fetch(`/api/slack/channels/${id}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDryRun: true }) })
      const d = await r.json()
      if (r.ok) {
        setActionMsg(`Channel sync — ${d.ingestion?.messagesIngested ?? 0} new messages, ${d.analysis?.proposalsCreated ?? 0} proposals`)
        await loadChannels(); await loadProposals()
      } else {
        setActionMsg(`Error: ${d.error}`)
      }
    } finally { setBusy(false) }
  }

  async function runBackfill(channelId: string) {
    setBusy(true); setActionMsg('')
    try {
      const r = await fetch(`/api/slack/channels/${channelId}/backfill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sincePreset: backfillPreset }) })
      const d = await r.json()
      if (r.ok) {
        setActionMsg(`Backfill complete — ${d.totalMessagesIngested} messages ingested`)
        setBackfillChannel(null)
        await loadChannels()
      } else {
        setActionMsg(`Error: ${d.error}`)
      }
    } finally { setBusy(false) }
  }

  async function reviewProposal(id: string, action: 'approve' | 'reject') {
    setReviewingId(id)
    try {
      const r = await fetch(`/api/review/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action.toUpperCase() }) })
      if (r.ok) await loadProposals()
    } finally { setReviewingId(null) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-slate-400">Loading Slack Control Center...</div>
      </div>
    )
  }

  const ws = workspace

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 pt-8 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Slack Control Center</h1>
            <p className="text-sm text-slate-400 mt-1">
              {ws?.workspace?.teamName ?? 'No workspace connected'} — workspace-wide ingestion
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ws?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
              {ws?.configured ? 'Bot Connected' : 'Bot Not Configured'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800">
              DRY RUN MODE
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(['workspace', 'channels', 'proposals'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize rounded-t-lg transition-colors ${tab === t ? 'bg-slate-900 text-slate-50 border border-b-0 border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'proposals' ? `Proposals ${(ws?.stats.pendingProposals ?? 0) > 0 ? `(${ws?.stats.pendingProposals})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Action message */}
        {actionMsg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200">
            {actionMsg}
          </div>
        )}

        {/* ── Workspace Tab ─────────────────────────────────────────────────── */}
        {tab === 'workspace' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Channels', value: ws?.stats.allChannels ?? 0 },
                { label: 'Ingestion Enabled', value: ws?.stats.ingestionEnabled ?? 0 },
                { label: 'Messages Stored', value: ws?.stats.totalMessages ?? 0 },
                { label: 'Pending Proposals', value: ws?.stats.pendingProposals ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <p className="text-2xl font-bold text-slate-50">{value.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Workspace info + Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="font-semibold text-slate-200">Workspace</h2>
                {ws?.workspace ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Team</span><span className="text-slate-200">{ws.workspace.teamName ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Domain</span><span className="text-slate-200">{ws.workspace.teamDomain ? `${ws.workspace.teamDomain}.slack.com` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Channels found</span><span className="text-slate-200">{ws.workspace.totalChannels}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Accessible</span><span className="text-slate-200">{ws.workspace.accessibleChannels}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Last discovered</span><span className="text-slate-200">{rel(ws.workspace.lastDiscoveredAt)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Last sync</span><span className="text-slate-200">{rel(ws.workspace.lastSyncAt)}</span></div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No workspace discovered yet. Click &quot;Discover Channels&quot; to connect.</p>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h2 className="font-semibold text-slate-200">Actions</h2>
                <p className="text-xs text-slate-500">All sync operations run in DRY RUN mode — no production data is written until explicitly approved.</p>
                <div className="space-y-2">
                  <button
                    onClick={discover}
                    disabled={busy || !ws?.configured}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {busy ? 'Working...' : 'Discover Channels'}
                  </button>
                  <button
                    onClick={runSync}
                    disabled={busy || !ws?.configured || (ws?.stats.ingestionEnabled ?? 0) === 0}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-800 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-amber-100 transition-colors"
                  >
                    {busy ? 'Working...' : 'Run Workspace Sync (Dry Run)'}
                  </button>
                </div>
                {ws?.stats.errorChannels ? (
                  <p className="text-xs text-red-400">{ws.stats.errorChannels} channel(s) have errors — check the Channels tab.</p>
                ) : null}
              </div>
            </div>

            {/* Last run */}
            {ws?.lastRun && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="font-semibold text-slate-200 mb-3">Last Analysis Run</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ws.lastRun.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-300' : ws.lastRun.status === 'RUNNING' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'}`}>
                    {ws.lastRun.status}
                  </span>
                  <span className="text-slate-400">{rel(ws.lastRun.runDate)}</span>
                  <span className="text-slate-300">{ws.lastRun.messagesAnalyzed} messages analyzed</span>
                  <span className="text-slate-300">{ws.lastRun.itemsFlaggedForReview} proposals</span>
                  {ws.lastRun.channelName && <span className="text-slate-500">#{ws.lastRun.channelName}</span>}
                </div>
              </div>
            )}

            {/* Channels with errors */}
            {(ws?.channelsWithErrors.length ?? 0) > 0 && (
              <div className="bg-slate-900 border border-red-900/30 rounded-xl p-5">
                <h2 className="font-semibold text-red-400 mb-3">Channels with Errors</h2>
                <div className="space-y-2">
                  {ws!.channelsWithErrors.map((c) => (
                    <div key={c.slackChannelId} className="flex items-start justify-between text-sm">
                      <span className="text-slate-200">#{c.channelName ?? c.slackChannelId}</span>
                      <span className="text-red-400 text-xs max-w-xs text-right">{c.lastError}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Channels Tab ──────────────────────────────────────────────────── */}
        {tab === 'channels' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-400">Filter:</span>
              {CLASSIFICATIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setClassFilter(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${classFilter === c ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {c}
                </button>
              ))}
              <span className="text-sm text-slate-500 ml-auto">{channels.length} channels</span>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p>No channels found.</p>
                <p className="text-sm mt-1">Run &quot;Discover Channels&quot; from the Workspace tab first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div key={ch.id} className={`bg-slate-900 border rounded-xl overflow-hidden ${ch.lastError ? 'border-red-900/50' : 'border-slate-800'}`}>
                    {/* Channel row */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/50 transition-colors"
                      onClick={() => setExpandedChannel(expandedChannel === ch.id ? null : ch.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-medium text-sm">
                            {ch.isPrivate ? '🔒' : '#'}{ch.channelName ?? ch.slackChannelId}
                          </span>
                          {ch.isArchived && <span className="text-xs text-slate-500">(archived)</span>}
                          {!ch.isAccessible && <span className="text-xs text-red-400">(no access)</span>}
                          {ch.lastError && <span className="text-xs text-red-400">⚠ error</span>}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${classificationColor(ch.classification)}`}>
                        {ch.classification}
                      </span>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span title="Ingestion">
                          Ingest: <span className={ch.ingestionEnabled ? 'text-emerald-400' : 'text-slate-600'}>{ch.ingestionEnabled ? 'ON' : 'off'}</span>
                        </span>
                        <span title="AI Analysis">
                          AI: <span className={ch.analysisEnabled ? 'text-emerald-400' : 'text-slate-600'}>{ch.analysisEnabled ? 'ON' : 'off'}</span>
                        </span>
                        <span className="text-slate-500">{rel(ch.lastSyncAt)}</span>
                      </div>

                      <span className="text-slate-600 text-xs">{expandedChannel === ch.id ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded channel controls */}
                    {expandedChannel === ch.id && (
                      <div className="border-t border-slate-800 px-4 py-4 bg-slate-900/50 space-y-4">
                        {/* Classification selector */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-slate-400 w-28">Classification</label>
                          <select
                            value={ch.classification}
                            onChange={(e) => patchChannel(ch.id, { classification: e.target.value })}
                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1"
                          >
                            {CLASSIFICATIONS.filter((c) => c !== 'ALL').map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ch.ingestionEnabled}
                              onChange={(e) => patchChannel(ch.id, { ingestionEnabled: e.target.checked })}
                              className="accent-amber-500"
                            />
                            <span className="text-xs text-slate-300">Enable Ingestion</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ch.analysisEnabled}
                              disabled={ch.classification === 'EXCLUDED' || !ch.isAccessible}
                              onChange={(e) => patchChannel(ch.id, { analysisEnabled: e.target.checked })}
                              className="accent-amber-500 disabled:opacity-40"
                            />
                            <span className="text-xs text-slate-300">Enable AI Analysis</span>
                          </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {ch.ingestionEnabled && (
                            <button
                              onClick={() => runChannelSync(ch.id)}
                              disabled={busy}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 transition-colors"
                            >
                              Sync Channel
                            </button>
                          )}
                          <button
                            onClick={() => setBackfillChannel(backfillChannel === ch.id ? null : ch.id)}
                            disabled={busy}
                            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"
                          >
                            Backfill
                          </button>
                          {ch.cursor && (
                            <button
                              onClick={() => patchChannel(ch.id, { resetCursor: true })}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
                            >
                              Reset Cursor
                            </button>
                          )}
                          {ch.lastError && (
                            <button
                              onClick={() => patchChannel(ch.id, { clearError: true })}
                              className="px-3 py-1.5 rounded text-xs font-medium bg-red-900 hover:bg-red-800 transition-colors text-red-200"
                            >
                              Clear Error
                            </button>
                          )}
                        </div>

                        {/* Backfill controls */}
                        {backfillChannel === ch.id && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700">
                            <span className="text-xs text-slate-400">Backfill period:</span>
                            {BACKFILL_PRESETS.map((p) => (
                              <button
                                key={p.value}
                                onClick={() => setBackfillPreset(p.value)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${backfillPreset === p.value ? 'bg-amber-700 text-amber-100' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                              >
                                {p.label}
                              </button>
                            ))}
                            <button
                              onClick={() => runBackfill(ch.id)}
                              disabled={busy}
                              className="ml-2 px-3 py-1 rounded text-xs font-medium bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100"
                            >
                              {busy ? 'Running...' : 'Start Backfill'}
                            </button>
                          </div>
                        )}

                        {/* Error display */}
                        {ch.lastError && (
                          <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded p-2">
                            {ch.lastError}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Cursor: {ch.cursor ? 'set' : 'none'}</span>
                          <span>Last sync: {rel(ch.lastSyncAt)}</span>
                          <span>Last success: {rel(ch.lastSuccessfulSyncAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Proposals Tab ─────────────────────────────────────────────────── */}
        {tab === 'proposals' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-200 font-medium">{proposals.length} pending proposals</span>
              {Object.entries(reviewedCounts).map(([status, count]) => (
                <span key={status} className="text-slate-500">{count} {status.toLowerCase()}</span>
              ))}
            </div>

            {/* DRY RUN banner */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-950/40 border border-amber-700/40 text-amber-300 text-sm">
              <span className="font-semibold">PROPOSAL — NOT YET APPLIED</span>
              <span className="text-amber-400/70">All proposals are in dry-run mode. Approving writes to production.</span>
            </div>

            {proposals.length === 0 ? (
              <div className="text-center py-16 text-slate-500">No pending proposals. Run a sync to generate AI extractions.</div>
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <div key={p.id} className="bg-slate-900 border border-amber-700/40 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {confidenceBadge(p.aiConfidence)}
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">{p.proposedAction}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">{p.reviewType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reviewProposal(p.id, 'approve')}
                          disabled={reviewingId === p.id}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-emerald-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewProposal(p.id, 'reject')}
                          disabled={reviewingId === p.id}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-red-900 hover:bg-red-800 disabled:opacity-40 text-red-200 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200">{p.aiInterpretation}</p>

                    {p.linkedItem && (
                      <div className="text-xs text-slate-400">
                        Linked: <span className="text-slate-300">{p.linkedItem.title}</span>
                        {' '}— {p.linkedItem.client.name}{p.linkedItem.va ? ` / ${p.linkedItem.va.name}` : ''}
                      </div>
                    )}

                    {(p.proposedData.clientName || p.proposedData.vaName) && (
                      <div className="text-xs text-slate-400">
                        {p.proposedData.clientName && <span>Client: <span className="text-slate-300">{p.proposedData.clientName}</span> </span>}
                        {p.proposedData.vaName && <span>VA: <span className="text-slate-300">{p.proposedData.vaName}</span></span>}
                      </div>
                    )}

                    {p.sourceMessage && (
                      <div className="text-xs text-slate-500 bg-slate-800/60 rounded p-2 border-l-2 border-slate-700">
                        {p.sourceMessage.length > 200 ? p.sourceMessage.slice(0, 200) + '…' : p.sourceMessage}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{rel(p.createdAt)}</span>
                      {p.sourceLink && (
                        <a href={p.sourceLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          View in Slack ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
