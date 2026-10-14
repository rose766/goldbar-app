'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const SOURCE_TYPES = [
  { value: 'OBSERVED', label: 'Observed' },
  { value: 'VA_STATEMENT', label: 'VA Statement' },
  { value: 'CLIENT_STATEMENT', label: 'Client Statement' },
  { value: 'AM_INTERPRETATION', label: 'AM Interpretation' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'OTHER', label: 'Other' },
]

interface AddEvidenceFormProps {
  caseId: string
}

export function AddEvidenceForm({ caseId }: AddEvidenceFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState('OBSERVED')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function reset() {
    setTitle('')
    setDescription('')
    setSourceType('OBSERVED')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch(`/api/rh/cases/${caseId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sourceType, notes, recordedBy: 'Rose' }),
      })
      if (!res.ok) throw new Error('Failed to add evidence')
      reset()
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      alert('Failed to add evidence. Please try again.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        <Plus className="h-4 w-4" /> Add Evidence
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Add Evidence</h3>
        <button onClick={() => { reset(); setOpen(false) }} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Title *</label>
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Brief title for this evidence"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Source Type *</label>
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {SOURCE_TYPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Description *</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="What was observed or stated?"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Add Evidence'}
          </button>
          <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
