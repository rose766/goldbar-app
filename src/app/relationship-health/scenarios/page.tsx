import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORY_LABELS: Record<string, string> = {
  INITIATIVE: 'Initiative',
  COMMUNICATION: 'Communication',
  CLIENT_ENGAGEMENT: 'Client Engagement',
  DELEGATION: 'Delegation',
  ACCESS: 'Access & Systems',
  CLIENT_BEHAVIOR: 'Client Behavior',
  PERFORMANCE: 'Performance',
  SKILL_GAP: 'Skill Gap',
  PERSONAL_CIRCUMSTANCES: 'Personal Circumstances',
  ENGAGEMENT: 'Engagement',
  BURNOUT: 'Burnout',
  CONFLICT: 'Conflict',
  OTHER: 'Other',
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default async function ScenariosPage() {
  const scenarios = await prisma.rHScenario.findMany({
    orderBy: { scenarioNumber: 'asc' },
    include: { _count: { select: { caseLinks: true } } },
  })

  const byCategory = scenarios.reduce<Record<string, typeof scenarios>>((acc, s) => {
    const cat = s.category || 'OTHER'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div>
      <TopBar title="Scenario Library" subtitle="24 relationship issue patterns with guidance" />

      <div className="p-6">
        {Object.keys(byCategory).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">No scenarios seeded yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Run: <code className="bg-slate-100 px-1 py-0.5 rounded">npx tsx prisma/seed-scenarios.ts</code>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(byCategory).map(([cat, items]) => (
              <section key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                  {CATEGORY_LABELS[cat] ?? cat} ({items.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(s => (
                    <Link
                      key={s.id}
                      href={`/relationship-health/scenarios/${s.id}`}
                      className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-mono text-slate-400">#{s.scenarioNumber}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[s.defaultSeverity ?? 'MODERATE']}`}>
                          {s.defaultSeverity ?? 'MODERATE'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                        {s.title}
                      </p>
                      {s.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Used in {s._count.caseLinks} case{s._count.caseLinks !== 1 ? 's' : ''}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
