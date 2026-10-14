import { cn } from '@/lib/utils'

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  MODERATE: { label: 'Moderate', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
}

interface SeverityBadgeProps {
  severity: string
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] ?? { label: severity, className: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      config.className,
      className
    )}>
      {config.label}
    </span>
  )
}
