import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, isPast, isWithinInterval, addDays, format, formatDistanceToNow } from 'date-fns'
import type { ClientHealth, Priority, ItemStatus, OwnerType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isOverdue(deadline: Date | null, status: string): boolean {
  if (!deadline) return false
  if (status === 'COMPLETED' || status === 'CANCELLED') return false
  return isPast(deadline)
}

export function isDueSoon(deadline: Date | null, status: string, days = 3): boolean {
  if (!deadline) return false
  if (status === 'COMPLETED' || status === 'CANCELLED') return false
  if (isPast(deadline)) return false
  return isWithinInterval(deadline, { start: new Date(), end: addDays(new Date(), days) })
}

export function isStale(lastConfirmed: Date | null, thresholdDays = 5): boolean {
  if (!lastConfirmed) return false
  return differenceInDays(new Date(), lastConfirmed) >= thresholdDays
}

export function daysOverdue(deadline: Date | null): number {
  if (!deadline) return 0
  const diff = differenceInDays(new Date(), deadline)
  return diff > 0 ? diff : 0
}

export function daysWaiting(waitingSince: Date | null): number {
  if (!waitingSince) return 0
  return differenceInDays(new Date(), waitingSince)
}

export function healthColor(health: ClientHealth) {
  return {
    ON_TRACK: 'text-emerald-600 dark:text-emerald-400',
    NEEDS_ATTENTION: 'text-amber-600 dark:text-amber-400',
    AT_RISK: 'text-red-600 dark:text-red-400',
  }[health]
}

export function healthBg(health: ClientHealth) {
  return {
    ON_TRACK: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    NEEDS_ATTENTION: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    AT_RISK: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  }[health]
}

export function healthLabel(health: ClientHealth) {
  return { ON_TRACK: '🟢 On Track', NEEDS_ATTENTION: '🟡 Needs Attention', AT_RISK: '🔴 At Risk' }[health]
}

export function healthEmoji(health: ClientHealth) {
  return { ON_TRACK: '🟢', NEEDS_ATTENTION: '🟡', AT_RISK: '🔴' }[health]
}

export function priorityColor(priority: Priority) {
  return {
    CRITICAL: 'text-red-600 dark:text-red-400',
    HIGH: 'text-orange-600 dark:text-orange-400',
    MEDIUM: 'text-amber-600 dark:text-amber-400',
    LOW: 'text-emerald-600 dark:text-emerald-400',
  }[priority]
}

export function priorityBadge(priority: Priority) {
  return {
    CRITICAL: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    LOW: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  }[priority]
}

export function priorityLabel(priority: Priority) {
  return { CRITICAL: '🔴 Critical', HIGH: '🟠 High', MEDIUM: '🟡 Medium', LOW: '🟢 Low' }[priority]
}

export function statusLabel(status: ItemStatus) {
  return {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    WAITING_ON_CLIENT: 'Waiting on Client',
    WAITING_ON_VA: 'Waiting on VA',
    WAITING_ON_GOLDBAR: 'Waiting on Goldbar',
    BLOCKED: 'Blocked',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NEEDS_CLARIFICATION: 'Needs Clarification',
  }[status] ?? status
}

export function statusBadge(status: ItemStatus) {
  const base = 'border text-xs font-medium px-2 py-0.5 rounded-full'
  const map: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    WAITING_ON_CLIENT: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    WAITING_ON_VA: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    WAITING_ON_GOLDBAR: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    BLOCKED: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    NEEDS_CLARIFICATION: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  }
  return `${base} ${map[status] ?? map.NOT_STARTED}`
}

export function ownerTypeLabel(type: OwnerType) {
  return {
    CLIENT: 'Client',
    VA: 'VA',
    ACCOUNT_MANAGER: 'Account Manager',
    GOLDBAR: 'Goldbar',
    OTHER: 'Other',
    UNASSIGNED: 'Unassigned',
  }[type]
}

export function formatDate(date: Date | string | null | undefined, fmt = 'MMM d, yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt)
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function parseJsonArray(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toJsonArray(arr: string[]): string {
  return JSON.stringify(arr)
}
