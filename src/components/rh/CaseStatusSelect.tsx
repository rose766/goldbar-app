'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

const STATUSES = [
  'NEW',
  'AWAITING_ASSESSMENT',
  'UNDER_INVESTIGATION',
  'COACHING_IN_PROGRESS',
  'RECOVERY_PLAN_ACTIVE',
  'MONITORING',
  'AWAITING_CLIENT_INPUT',
  'AWAITING_VA_ACTION',
  'ESCALATED',
  'RESTAFFING_UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]

interface CaseStatusSelectProps {
  caseId: string
  currentStatus: string
}

export function CaseStatusSelect({ caseId, currentStatus }: CaseStatusSelectProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function changeStatus(newStatus: string) {
    if (newStatus === currentStatus) { setOpen(false); return }
    const reason = window.prompt(`Reason for changing status to ${newStatus}:`)
    if (reason === null) { setOpen(false); return }

    try {
      const res = await fetch(`/api/rh/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason, changedBy: 'Rose' }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e) {
      alert('Failed to update status. Please try again.')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        <StatusBadge status={currentStatus} />
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
              >
                <StatusBadge status={s} />
                {s === currentStatus && <span className="ml-auto text-xs text-slate-400">current</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
