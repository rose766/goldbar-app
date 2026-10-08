import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'red' | 'orange' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate'
  urgent?: boolean
  href?: string
  subtitle?: string
}

const colorMap = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    icon: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
    border: 'border-red-100 dark:border-red-900',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    icon: 'bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
    value: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-100 dark:border-orange-900',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/20',
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
    value: 'text-violet-700 dark:text-violet-400',
    border: 'border-violet-100 dark:border-violet-900',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    value: 'text-slate-900 dark:text-slate-50',
    border: 'border-slate-100 dark:border-slate-800',
  },
}

export function MetricCard({ label, value, icon: Icon, color = 'slate', subtitle }: MetricCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn('rounded-xl border p-5 transition-all hover:shadow-sm', c.bg, c.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className={cn('mt-1.5 text-3xl font-bold tabular-nums', c.value)}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
