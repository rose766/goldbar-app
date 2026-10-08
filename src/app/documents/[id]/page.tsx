'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, ExternalLink, ArrowLeft, Loader2, AlertCircle,
  CheckCircle2, Clock, RefreshCw, ChevronRight
} from 'lucide-react'

interface ReviewItem {
  id: string
  reviewType: string
  status: string
  aiInterpretation: string
  aiConfidence: string
  proposedAction: string
  proposedData: string
  sourceMessage?: string
  sourceLink?: string
  openItem?: { id: string; title: string; status: string; owner?: string; deadline?: string } | null
  createdAt: string
}

interface VersionDoc {
  id: string
  title: string
  documentVersion?: string
  receivedAt: string
}

interface Doc {
  id: string
  title: string
  fileName: string
  fileType: string
  sourceType: string
  googleDriveFileId?: string
  googleDriveUrl?: string
  documentVersion?: string
  processingStatus: string
  processingError?: string
  extractedText?: string
  summary?: string
  proposalsCreated: number
  proposalsApproved: number
  proposalsRejected: number
  itemsCreated: number
  receivedAt: string
  lastProcessedAt?: string
  client?: { id: string; name: string; health: string } | null
  reviewItems: ReviewItem[]
  gamePlans: { id: string; title: string; status: string; date: string; version: number }[]
  openItems: { id: string; title: string; status: string; owner?: string; deadline?: string; priority: string }[]
  previousVersion?: VersionDoc | null
  laterVersions: VersionDoc[]
}

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: 'text-green-600',
  MEDIUM: 'text-amber-600',
  NEEDS_REVIEW: 'text-red-500',
}

const STATUS_BG: Record<string, string> = {
  PENDING: 'bg-amber-50 border-amber-200',
  APPROVED: 'bg-green-50 border-green-200',
  REJECTED: 'bg-slate-50 border-slate-200',
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [loading, setLoading] = useState(true)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [showText, setShowText] = useState(false)
  const [activeTab, setActiveTab] = useState<'proposals' | 'items' | 'text'>('proposals')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/documents/${id}`)
    if (res.ok) {
      const data = await res.json()
      setDoc(data.document)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function reanalyze() {
    setReanalyzing(true)
    await fetch(`/api/documents/${id}/analyze`, { method: 'POST' })
    await load()
    setReanalyzing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center py-20 text-slate-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Document not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-amber-600 hover:underline">Go back</button>
      </div>
    )
  }

  const pendingProposals = doc.reviewItems.filter((r) => r.status === 'PENDING')
  const approvedProposals = doc.reviewItems.filter((r) => r.status === 'APPROVED')
  const rejectedProposals = doc.reviewItems.filter((r) => r.status === 'REJECTED')

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/documents" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
        <ArrowLeft className="h-4 w-4" />
        Documents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-amber-500 shrink-0" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{doc.title}</h1>
            {doc.documentVersion && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-mono dark:bg-slate-800">{doc.documentVersion}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
            <span>{doc.fileName}</span>
            <span className="uppercase font-mono text-xs">{doc.fileType}</span>
            <span>{doc.sourceType}</span>
            {doc.client && (
              <Link href={`/clients/${doc.client.id}`} className="text-amber-600 hover:underline">
                {doc.client.name}
              </Link>
            )}
            {doc.googleDriveUrl && (
              <a href={doc.googleDriveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Drive
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reanalyze}
            disabled={reanalyzing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700"
          >
            {reanalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Re-analyze
          </button>
          <Link
            href="/review"
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Review Queue
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Status', value: doc.processingStatus.replace(/_/g, ' ') },
          { label: 'Proposals', value: doc.proposalsCreated },
          { label: 'Pending', value: pendingProposals.length },
          { label: 'Approved', value: approvedProposals.length },
          { label: 'Rejected', value: rejectedProposals.length },
          { label: 'Items Created', value: doc.itemsCreated },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Processing error */}
      {doc.processingError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950">
          <strong>Processing error:</strong> {doc.processingError}
        </div>
      )}

      {/* Version history */}
      {(doc.previousVersion || doc.laterVersions.length > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">Version chain</p>
          <div className="flex items-center gap-2 text-sm text-amber-700 flex-wrap">
            {doc.previousVersion && (
              <>
                <Link href={`/documents/${doc.previousVersion.id}`} className="hover:underline">
                  {doc.previousVersion.documentVersion ?? 'v1'} ({new Date(doc.previousVersion.receivedAt).toLocaleDateString()})
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="font-semibold">{doc.documentVersion ?? 'Current'}</span>
            {doc.laterVersions.map((v) => (
              <>
                <ChevronRight key={`arrow-${v.id}`} className="h-4 w-4" />
                <Link key={v.id} href={`/documents/${v.id}`} className="hover:underline">
                  {v.documentVersion ?? 'next'} ({new Date(v.receivedAt).toLocaleDateString()})
                </Link>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-1">
          {([
            ['proposals', `Proposals (${doc.reviewItems.length})`],
            ['items', `Approved Items (${doc.openItems.length})`],
            ['text', 'Extracted Text'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'proposals' && (
        <div className="space-y-3">
          {doc.reviewItems.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No proposals yet</p>
          ) : (
            doc.reviewItems.map((item) => {
              let parsed: Record<string, unknown> = {}
              try { parsed = JSON.parse(item.proposedData) } catch { /* ignore */ }
              return (
                <div key={item.id} className={`rounded-lg border p-4 ${STATUS_BG[item.status] ?? 'bg-white border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono rounded bg-white/70 px-1.5 py-0.5 border border-slate-200">{item.reviewType}</span>
                        <span className={`text-xs font-medium ${CONFIDENCE_COLORS[item.aiConfidence] ?? ''}`}>{item.aiConfidence}</span>
                        <span className="text-xs text-slate-500">{item.proposedAction}</span>
                      </div>
                      <p className="mt-1.5 font-medium text-slate-900 dark:text-slate-100">{item.aiInterpretation}</p>
                      {item.sourceMessage && (
                        <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-xs text-slate-500 italic">
                          &ldquo;{item.sourceMessage.slice(0, 300)}{item.sourceMessage.length > 300 ? '…' : ''}&rdquo;
                        </blockquote>
                      )}
                      {!!parsed.title && (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {!!parsed.title && <span><strong>Title:</strong> {String(parsed.title)}</span>}
                          {!!parsed.owner && <span><strong>Owner:</strong> {String(parsed.owner)}</span>}
                          {!!parsed.deadline && <span><strong>Deadline:</strong> {String(parsed.deadline)}</span>}
                          {!!parsed.priority && <span><strong>Priority:</strong> {String(parsed.priority)}</span>}
                          {!!parsed.missingDeadline && <span className="text-amber-600">⚠ Missing deadline</span>}
                          {!!parsed.missingOwner && <span className="text-amber-600">⚠ Missing owner</span>}
                          {!!parsed.clientNotFound && <span className="text-red-500">⚠ Client not found</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'APPROVED' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {item.status === 'PENDING' && (
                        <Link
                          href="/review"
                          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                        >
                          Review
                        </Link>
                      )}
                      {item.openItem && (
                        <Link href={`/open-items/${item.openItem.id}`} className="text-xs text-blue-500 hover:underline">
                          View item
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="space-y-2">
          {doc.openItems.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No approved items from this document yet</p>
          ) : (
            doc.openItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    {item.owner && <span>Owner: {item.owner}</span>}
                    {item.deadline && <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>}
                    <span className="font-medium">{item.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>{item.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'text' && (
        <div>
          {doc.extractedText ? (
            <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 max-h-[60vh] overflow-auto">
              {doc.extractedText}
            </pre>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No extracted text available</p>
          )}
        </div>
      )}
    </div>
  )
}
