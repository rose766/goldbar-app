'use client'

import { useEffect, useState, useRef } from 'react'
import { FileText, Upload, AlertCircle, CheckCircle2, Clock, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Doc {
  id: string
  title: string
  fileName: string
  fileType: string
  sourceType: string
  googleDriveUrl?: string
  documentVersion?: string
  processingStatus: string
  processingError?: string
  proposalsCreated: number
  proposalsApproved: number
  proposalsRejected: number
  itemsCreated: number
  receivedAt: string
  lastProcessedAt?: string
  clientId?: string
  client?: { name: string }
  previousVersionId?: string
  _count: { reviewItems: number }
}

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700',
  EXTRACTING: 'bg-blue-100 text-blue-700',
  ANALYZING: 'bg-purple-100 text-purple-700',
  READY_FOR_REVIEW: 'bg-amber-100 text-amber-800',
  PROCESSED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pptx: 'bg-orange-100 text-orange-700',
  pdf: 'bg-red-100 text-red-700',
  docx: 'bg-blue-100 text-blue-700',
  txt: 'bg-slate-100 text-slate-600',
  md: 'bg-slate-100 text-slate-600',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'
  const icon =
    status === 'FAILED' ? <AlertCircle className="h-3 w-3" /> :
    status === 'PROCESSED' ? <CheckCircle2 className="h-3 w-3" /> :
    status === 'READY_FOR_REVIEW' ? <Clock className="h-3 w-3" /> :
    ['EXTRACTING', 'ANALYZING'].includes(status) ? <Loader2 className="h-3 w-3 animate-spin" /> :
    null

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {icon}
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/documents?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDocs(data.documents)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      await load()
    } else {
      setUploadError(data.error ?? 'Upload failed')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const pendingCount = docs.filter((d) => d.processingStatus === 'READY_FOR_REVIEW').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} document{total !== 1 ? 's' : ''} · {pendingCount} awaiting review
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Upload Document'}
            <input
              ref={fileRef}
              type="file"
              accept=".pptx,.pdf,.docx,.txt,.md"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950">
          {uploadError}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['', 'READY_FOR_REVIEW', 'PROCESSING', 'PROCESSED', 'FAILED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-amber-100 text-amber-800'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No documents yet</p>
            <p className="text-xs mt-1">Upload a game plan or connect Lindy to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Proposals</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3">
                    <Link href={`/documents/${doc.id}`} className="font-medium text-slate-900 hover:text-amber-600 dark:text-slate-100">
                      {doc.title}
                    </Link>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      {doc.fileName}
                      {doc.documentVersion && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">{doc.documentVersion}</span>
                      )}
                      {doc.previousVersionId && (
                        <span className="text-amber-600">new version</span>
                      )}
                      {doc.googleDriveUrl && (
                        <a href={doc.googleDriveUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {doc.client?.name ?? <span className="text-slate-400 italic">Unknown</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-mono uppercase ${FILE_TYPE_COLORS[doc.fileType] ?? 'bg-slate-100 text-slate-600'}`}>
                      {doc.fileType}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">{doc.sourceType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.processingStatus} />
                    {doc.processingError && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs" title={doc.processingError}>
                        {doc.processingError}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.proposalsCreated > 0 ? (
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{doc.proposalsCreated}</span> created
                        {doc.proposalsApproved > 0 && <span className="text-green-600"> · {doc.proposalsApproved} approved</span>}
                        {doc.proposalsRejected > 0 && <span className="text-red-500"> · {doc.proposalsRejected} rejected</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(doc.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
