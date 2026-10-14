'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, AlertCircle,
  Clock, FileText, GitBranch, Star,
  BarChart3,
  ChevronRight, Bell, Upload,
  Activity, FolderOpen, BookOpen, CheckSquare, Calendar, AlertTriangle, BarChart2,
} from 'lucide-react'

const navItems = [
  { label: 'Command Center', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'My Follow-Ups', href: '/follow-ups', icon: Star },
  { label: 'Overdue', href: '/overdue', icon: AlertCircle },
  { label: 'Missing Info', href: '/missing-info', icon: Clock },
  { label: 'What Changed', href: '/changes', icon: GitBranch },
  { label: 'Review Queue', href: '/review', icon: Bell },
  { label: 'Daily Summary', href: '/daily-summary', icon: BarChart3 },
  { label: 'Game Plans', href: '/game-plans', icon: FileText },
  { label: 'Documents', href: '/documents', icon: Upload },
]

const rhNavItems = [
  { label: 'RH Overview', href: '/relationship-health', icon: Activity },
  { label: 'Cases', href: '/relationship-health/cases', icon: FolderOpen },
  { label: 'Scenarios', href: '/relationship-health/scenarios', icon: BookOpen },
  { label: 'Actions', href: '/relationship-health/actions', icon: CheckSquare },
  { label: 'Follow-ups', href: '/relationship-health/follow-ups', icon: Calendar },
  { label: 'Escalations', href: '/relationship-health/escalations', icon: AlertTriangle },
  { label: 'Reports', href: '/relationship-health/reports', icon: BarChart2 },
]

export function Sidebar({ pendingReviews = 0 }: { pendingReviews?: number }) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
          <span className="text-sm font-bold">G</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Goldbar</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Command Center</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isReview = href === '/review'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isReview && pendingReviews > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {pendingReviews > 9 ? '9+' : pendingReviews}
                </span>
              )}
              {active && !isReview && (
                <ChevronRight className="h-3 w-3 opacity-50" />
              )}
            </Link>
          )
        })}

        {/* Relationship Health section */}
        <div className="mt-4 mb-1 flex items-center gap-2 px-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Relationship Health
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {rhNavItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/relationship-health'
            ? pathname === '/relationship-health'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — user */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold dark:bg-amber-950 dark:text-amber-400">
            R
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate dark:text-slate-50">Rose</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account Manager</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
