'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const CHECK_TYPES = [
  { value: 'VA_CHECKIN', label: 'VA Check-In' },
  { value: 'CLIENT_CHECKIN', label: 'Client Check-In' },
  { value: 'PLAN_REVIEW', label: 'Plan Review' },
  { value: 'EVIDENCE', label: 'Evidence Collection' },
  { value: 'ESCALATION', label: 'Escalation Follow-up' },
  { value: 'REASSESSMENT', label: 'Reassessment' },
  { value: 'OTHER', label: 'Other' },
]

interface AddFollowUpFormProps {
  caseId: string
}

export function AddFollowUpForm({ caseId }: AddFollowUpFormProps) {
  const [open, setOpen] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [assignedTo, setAssignedTo] = useState('Rose')
  const [dueDate, setDueDate] = useState('')
  const [checkType, setCheckType] = useState('VA_CHECKIN')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function reset() {
    setPurpose('')
    setAssignedTo('Rose')
    setDueDate('')
    setCheckType('VA_CHECKIN')
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch(`/api/rh/cases/${caseId}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, assignedTo, dueDate, checkType, notes, createdBy: 'Rose' }),
      })
      if (!res.ok) throw new Error('Failed to add follow-up')
      reset()
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      alert('Failed to add follow-up. Please try again.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        <Plus className="h-4 w-4" /> Add Follow-up
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Schedule Follow-up</h3>
        <button onClick={() => { reset(); setOpen(false) }} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Purpose *</label>
          <input
            required
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="What is this follow-up for?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Type</label>
            <select
              value={checkType}
              onChange={e => setCheckType(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {CHECK_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Assigned To *</label>
            <input
              required
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Due Date *</label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            {pending ? 'Saving...' : 'Schedule Follow-up'}
          </button>
          <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
