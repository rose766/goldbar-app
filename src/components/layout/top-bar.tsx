'use client'

import { RefreshCw, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  subtitle?: string
  lastSync?: Date | string | null
  syncStatus?: 'ok' | 'stale' | 'failed' | 'never'
}

export function TopBar({ title, subtitle, lastSync, syncStatus = 'never' }: TopBarProps) {
  const syncColors = {
    ok: 'text-emerald-600 dark:text-emerald-400',
    stale: 'text-amber-600 dark:text-amber-400',
    failed: 'text-red-600 dark:text-red-400',
    never: 'text-slate-400',
  }

  const syncMessages = {
    ok: `Last synced: ${formatDate(lastSync, 'MMM d, yyyy')} at ${lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}`,
    stale: `⚠️ Sync data is stale — last: ${formatDate(lastSync)}`,
    failed: `🔴 Sync FAILED — data may be outdated`,
    never: 'No documents processed yet',
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>

      {syncStatus !== 'never' && (
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', syncColors[syncStatus])}>
          {syncStatus === 'failed' ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <RefreshCw className={cn('h-3.5 w-3.5', syncStatus === 'ok' && 'opacity-50')} />
          )}
          <span>{syncMessages[syncStatus]}</span>
        </div>
      )}
    </header>
  )
}
