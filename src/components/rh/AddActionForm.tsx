'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const ROLES = [
  { value: 'VA', label: 'VA' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'AM', label: 'Account Manager' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'LEADERSHIP', label: 'Leadership' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

interface AddActionFormProps {
  caseId: string
}

export function AddActionForm({ caseId }: AddActionFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedRole, setAssignedRole] = useState('VA')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [expectedResult, setExpectedResult] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function reset() {
    setTitle('')
    setDescription('')
    setAssignedRole('VA')
    setAssignedTo('')
    setDueDate('')
    setPriority('MEDIUM')
    setExpectedResult('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch(`/api/rh/cases/${caseId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, assignedRole, assignedTo, dueDate: dueDate || null, priority, expectedResult, createdBy: 'Rose' }),
      })
      if (!res.ok) throw new Error('Failed to add action')
      reset()
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      alert('Failed to add action. Please try again.')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
      >
        <Plus className="h-4 w-4" /> Add Action
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Add Action</h3>
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
            placeholder="What needs to be done?"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Assigned Role *</label>
            <select
              value={assignedRole}
              onChange={e => setAssignedRole(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Assigned To</label>
            <input
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Expected Result</label>
          <input
            value={expectedResult}
            onChange={e => setExpectedResult(e.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="What does success look like?"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Add Action'}
          </button>
          <button type="button" onClick={() => { reset(); setOpen(false) }} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
