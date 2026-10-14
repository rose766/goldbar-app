import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AssessmentWizard from './AssessmentWizard'

interface Props {
  params: { id: string; aid: string }
}

export default async function AssessmentPage({ params }: Props) {
  const [rhCase, assessment] = await Promise.all([
    prisma.rHCase.findUnique({
      where: { id: params.id },
      include: { client: true, va: true },
    }),
    prisma.rHAssessment.findUnique({
      where: { id: params.aid },
      include: { responses: true },
    }),
  ])

  if (!rhCase || !assessment || assessment.caseId !== params.id) {
    notFound()
  }

  const existingResponses: Record<string, {
    answer: string
    evidenceNote: string | null
    notes: string | null
    sourceType: string | null
  }> = {}

  for (const r of assessment.responses) {
    existingResponses[r.questionKey] = {
      answer: r.answer,
      evidenceNote: r.evidenceNote,
      notes: r.notes,
      sourceType: r.sourceType,
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-sm text-slate-500 mb-1">
          Case {rhCase.caseNumber} — {rhCase.client.name}{rhCase.va ? ` / ${rhCase.va.name}` : ''}
        </div>
        <h1 className="text-2xl font-semibold text-slate-800">
          Diagnostic Assessment
          {assessment.status === 'COMPLETED' && (
            <span className="ml-3 text-sm font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
          )}
        </h1>
        <p className="text-slate-500 mt-1">
          Version {assessment.version} · Assessed by {assessment.assessedBy}
        </p>
      </div>

      <AssessmentWizard
        caseId={params.id}
        assessmentId={params.aid}
        existingResponses={existingResponses}
        isCompleted={assessment.status === 'COMPLETED'}
        assessedBy={assessment.assessedBy}
      />
    </div>
  )
}
