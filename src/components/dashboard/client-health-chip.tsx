'use client'

import { useState } from 'react'
import { cn, healthLabel, parseJsonArray } from '@/lib/utils'
import type { ClientHealth } from '@/types'
import { Info } from 'lucide-react'

interface ClientHealthChipProps {
  health: ClientHealth
  reasons?: string | string[] | null
  showReasons?: boolean
}

export function ClientHealthChip({ health, reasons, showReasons = true }: ClientHealthChipProps) {
  const [open, setOpen] = useState(false)
  const reasonList = Array.isArray(reasons) ? reasons : parseJsonArray(reasons as string)

  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
    {
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300': health === 'ON_TRACK',
      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300': health === 'NEEDS_ATTENTION',
      'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300': health === 'AT_RISK',
    }
  )

  return (
    <div className="relative inline-block">
      <button
        className={cn(base, showReasons && reasonList.length > 0 ? 'cursor-pointer' : 'cursor-default')}
        onClick={() => showReasons && reasonList.length > 0 && setOpen(!open)}
        onBlur={() => setOpen(false)}
      >
        {healthLabel(health)}
        {showReasons && reasonList.length > 0 && (
          <Info className="h-3 w-3 opacity-60" />
        )}
      </button>

      {open && reasonList.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">Health Reasons:</p>
          <ul className="space-y-1">
            {reasonList.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <span className="mt-0.5 shrink-0 text-slate-400">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
