'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, User, CheckCircle } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'

interface FollowUpCardProps {
  followUp: {
    id: string
    purpose: string
    assignedTo: string
    dueDate: Date
    checkType: string | null
    status: string
    notes: string | null
    outcome: string | null
  }
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  VA_CHECKIN: 'VA Check-In',
  CLIENT_CHECKIN: 'Client Check-In',
  PLAN_REVIEW: 'Plan Review',
  EVIDENCE: 'Evidence',
  ESCALATION: 'Escalation',
  REASSESSMENT: 'Reassessment',
  OTHER: 'Other',
}

export function FollowUpCard({ followUp }: FollowUpCardProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const isOverdue = new Date(followUp.dueDate) < new Date() && followUp.status === 'PENDING'

  async function markComplete() {
    const outcome = window.prompt('Outcome of this follow-up:')
    if (outcome === null) return
    try {
      await fetch(`/api/rh/follow-ups/${followUp.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      })
      startTransition(() => router.refresh())
    } catch {
      alert('Failed to update follow-up.')
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {followUp.checkType && (
              <span className="text-xs font-medium text-slate-500">
                {CHECK_TYPE_LABELS[followUp.checkType] ?? followUp.checkType}
              </span>
            )}
            <StatusBadge status={followUp.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">{followUp.purpose}</p>
          {followUp.notes && (
            <p className="mt-1 text-xs text-slate-500">{followUp.notes}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {followUp.assignedTo}
            </span>
            <span className={`flex items-center gap-1 ${isOverdue ? 'font-semibold text-red-600' : ''}`}>
              <Calendar className="h-3 w-3" />
              {isOverdue ? 'OVERDUE · ' : ''}{formatDate(followUp.dueDate)}
            </span>
          </div>
          {followUp.outcome && (
            <p className="mt-2 text-xs text-slate-400 italic">Outcome: {followUp.outcome}</p>
          )}
        </div>
        {followUp.status === 'PENDING' && (
          <button
            onClick={markComplete}
            disabled={pending}
            title="Mark complete"
            className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
