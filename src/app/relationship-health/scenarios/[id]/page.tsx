import { prisma } from '@/lib/prisma'
import { TopBar } from '@/components/layout/top-bar'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default async function ScenarioDetailPage({ params }: { params: { id: string } }) {
  const scenario = await prisma.rHScenario.findUnique({
    where: { id: params.id },
    include: {
      caseLinks: {
        include: { case: { include: { client: { select: { name: true } } } } },
        take: 10,
      },
    },
  })

  if (!scenario) notFound()

  const sections = [
    { label: 'Warning Signs', content: scenario.warningSigns },
    { label: 'Potential Root Causes', content: scenario.potentialRootCauses },
    { label: 'Evidence to Collect', content: scenario.evidenceToCollect },
    { label: 'Corrective Actions', content: scenario.correctiveActions },
    { label: 'Escalation Criteria', content: scenario.escalationCriteria },
    { label: 'Success Measures', content: scenario.successMeasures },
    { label: 'VA Script', content: scenario.vaScript },
    { label: 'Client Script', content: scenario.clientScript },
  ]

  return (
    <div>
      <TopBar
        title={scenario.title}
        subtitle={`Scenario #${scenario.scenarioNumber} · ${scenario.category ?? 'Uncategorized'}`}
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="font-mono text-xs text-slate-400">#{scenario.scenarioNumber}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[scenario.defaultSeverity]}`}>
              {scenario.defaultSeverity}
            </span>
          </div>
          {scenario.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{scenario.description}</p>
          )}
        </div>

        {/* Content sections */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sections.filter(s => s.content && s.content !== '[]').map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{s.label}</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>

        {/* Cases using this scenario */}
        {scenario.caseLinks.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              Cases using this scenario ({scenario.caseLinks.length})
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Case #', 'Client', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenario.caseLinks.map(link => (
                    <tr key={link.caseId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <a href={`/relationship-health/cases/${link.caseId}`} className="font-mono text-xs text-amber-700 hover:underline">
                          {link.case.caseNumber}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">{link.case.client.name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{link.case.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
