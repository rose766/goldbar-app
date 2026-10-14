'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, User, CheckCircle } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'

interface ActionCardProps {
  action: {
    id: string
    actionNumber: string
    title: string
    description: string | null
    assignedRole: string
    assignedTo: string | null
    dueDate: Date | null
    priority: string
    status: string
    expectedResult: string | null
  }
  caseId: string
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-blue-600 bg-blue-50 border-blue-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  CRITICAL: 'text-red-600 bg-red-50 border-red-200',
}

export function ActionCard({ action, caseId }: ActionCardProps) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function markComplete() {
    try {
      await fetch(`/api/rh/actions/${action.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', updatedBy: 'Rose' }),
      })
      startTransition(() => router.refresh())
    } catch {
      alert('Failed to update action.')
    }
  }

  const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && action.status !== 'COMPLETED' && action.status !== 'CANCELLED'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">{action.actionNumber}</span>
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[action.priority] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>
              {action.priority}
            </span>
            <StatusBadge status={action.status} />
          </div>
          <p className="mt-1.5 text-sm font-medium text-slate-900">{action.title}</p>
          {action.description && (
            <p className="mt-1 text-xs text-slate-500">{action.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {action.assignedTo ?? action.assignedRole}
            </span>
            {action.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'font-semibold text-red-600' : ''}`}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? 'OVERDUE · ' : ''}{formatDate(action.dueDate)}
              </span>
            )}
          </div>
          {action.expectedResult && (
            <p className="mt-2 text-xs text-slate-400 italic">Expected: {action.expectedResult}</p>
          )}
        </div>
        {action.status !== 'COMPLETED' && action.status !== 'CANCELLED' && (
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
