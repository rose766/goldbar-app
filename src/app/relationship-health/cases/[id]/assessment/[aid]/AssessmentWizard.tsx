'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ASSESSMENT_SECTIONS,
  ASSESSMENT_QUESTIONS,
  ANSWER_OPTIONS,
  AnswerValue,
  getQuestionsBySection,
  getOverallCompletion,
} from '@/lib/rh/assessment-questions'
import { CheckCircle, ChevronLeft, ChevronRight, Save, Clock } from 'lucide-react'

interface Props {
  caseId: string
  assessmentId: string
  existingResponses: Record<string, {
    answer: string
    evidenceNote: string | null
    notes: string | null
    sourceType: string | null
  }>
  isCompleted: boolean
  assessedBy: string
}

type ResponseState = {
  answer?: AnswerValue
  evidenceNote: string
  notes: string
  sourceType: string
}

const SOURCE_TYPES = [
  { value: 'OBSERVED', label: 'Directly Observed' },
  { value: 'VA_STATEMENT', label: "VA's Statement" },
  { value: 'CLIENT_STATEMENT', label: "Client's Statement" },
  { value: 'AM_INTERPRETATION', label: 'AM Interpretation' },
]

export default function AssessmentWizard({ caseId, assessmentId, existingResponses, isCompleted, assessedBy }: Props) {
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize responses from existing data
  const [responses, setResponses] = useState<Record<string, ResponseState>>(() => {
    const init: Record<string, ResponseState> = {}
    for (const q of ASSESSMENT_QUESTIONS) {
      const existing = existingResponses[q.key]
      init[q.key] = {
        answer: existing?.answer as AnswerValue | undefined,
        evidenceNote: existing?.evidenceNote ?? '',
        notes: existing?.notes ?? '',
        sourceType: existing?.sourceType ?? '',
      }
    }
    return init
  })

  const updateResponse = useCallback((key: string, field: keyof ResponseState, value: string) => {
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }, [])

  const sectionId = ASSESSMENT_SECTIONS[currentSection].id
  const sectionQuestions = getQuestionsBySection(sectionId)
  const completionPct = getOverallCompletion(
    Object.fromEntries(
      Object.entries(responses)
        .filter(([, v]) => v.answer !== undefined)
        .map(([k, v]) => [k, v.answer as AnswerValue])
    )
  )

  const answeredInSection = sectionQuestions.filter(q => responses[q.key]?.answer).length
  const isLastSection = currentSection === ASSESSMENT_SECTIONS.length - 1

  const buildPayload = () =>
    ASSESSMENT_QUESTIONS.map(q => ({
      section: q.section,
      questionKey: q.key,
      questionText: q.text,
      answer: responses[q.key]?.answer ?? null,
      evidenceNote: responses[q.key]?.evidenceNote || null,
      notes: responses[q.key]?.notes || null,
      sourceType: responses[q.key]?.sourceType || null,
    })).filter(r => r.answer !== null)

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/rh/cases/${caseId}/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: buildPayload(), status: 'DRAFT' }),
      })
      if (!res.ok) throw new Error('Save failed')
      setLastSaved(new Date())
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [caseId, assessmentId, responses]) // eslint-disable-line

  const complete = useCallback(async () => {
    const unanswered = ASSESSMENT_QUESTIONS.filter(
      q => !responses[q.key]?.answer
    )
    if (unanswered.length > 5) {
      setError(`Please answer more questions before completing. ${unanswered.length} questions remain unanswered.`)
      return
    }

    setCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/rh/cases/${caseId}/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: buildPayload(), status: 'COMPLETED' }),
      })
      if (!res.ok) throw new Error('Failed to complete assessment')
      router.push(`/relationship-health/cases/${caseId}?tab=assessment`)
      router.refresh()
    } catch {
      setError('Failed to complete assessment. Please try again.')
    } finally {
      setCompleting(false)
    }
  }, [caseId, assessmentId, responses, router]) // eslint-disable-line

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Overall completion</span>
          <span className="text-sm font-semibold text-slate-800">{completionPct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        {lastSaved && (
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Clock size={12} />
            Saved {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Section navigation */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {ASSESSMENT_SECTIONS.map((s, idx) => {
          const qs = getQuestionsBySection(s.id)
          const answered = qs.filter(q => responses[q.key]?.answer).length
          const allDone = answered === qs.length
          const active = idx === currentSection
          return (
            <button
              key={s.id}
              onClick={() => setCurrentSection(idx)}
              className={`text-center rounded-lg p-2 border text-xs font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : allDone
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : answered > 0
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="font-bold">{s.id}</div>
              <div className="text-[10px] leading-tight">{answered}/{qs.length}</div>
            </button>
          )
        })}
      </div>

      {/* Current section */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Section {sectionId}: {ASSESSMENT_SECTIONS[currentSection].label}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {answeredInSection} of {sectionQuestions.length} questions answered
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {sectionQuestions.map(q => {
            const resp = responses[q.key]
            return (
              <div key={q.key} className="p-6">
                <div className="mb-3">
                  <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{q.key}</span>
                  <p className="text-slate-800 font-medium mt-2">{q.text}</p>
                  {q.helpText && (
                    <p className="text-sm text-slate-500 mt-1">{q.helpText}</p>
                  )}
                </div>

                {/* Answer buttons */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {ANSWER_OPTIONS.filter(opt => opt.value !== 'NA' || q.allowNA).map(opt => (
                    <button
                      key={opt.value}
                      disabled={isCompleted}
                      onClick={() => updateResponse(q.key, 'answer', opt.value)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        resp?.answer === opt.value
                          ? opt.color + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      } ${isCompleted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Source type + notes (show when answered) */}
                {resp?.answer && resp.answer !== 'NA' && (
                  <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Source of this assessment
                      </label>
                      <select
                        disabled={isCompleted}
                        value={resp.sourceType}
                        onChange={e => updateResponse(q.key, 'sourceType', e.target.value)}
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white w-full sm:w-auto"
                      >
                        <option value="">Select source type</option>
                        {SOURCE_TYPES.map(st => (
                          <option key={st.value} value={st.value}>{st.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Supporting evidence or example
                      </label>
                      <input
                        disabled={isCompleted}
                        type="text"
                        value={resp.evidenceNote}
                        onChange={e => updateResponse(q.key, 'evidenceNote', e.target.value)}
                        placeholder="Specific example, quote, or observation..."
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">
                        Additional notes
                      </label>
                      <textarea
                        disabled={isCompleted}
                        value={resp.notes}
                        onChange={e => updateResponse(q.key, 'notes', e.target.value)}
                        rows={2}
                        placeholder="Context, caveats, or follow-up needed..."
                        className="text-sm border border-slate-200 rounded px-3 py-1.5 bg-white w-full resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Navigation */}
      {!isCompleted && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
              disabled={currentSection === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            {!isLastSection && (
              <button
                onClick={() => setCurrentSection(prev => Math.min(ASSESSMENT_SECTIONS.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={complete}
              disabled={completing}
              className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
            >
              <CheckCircle size={16} />
              {completing ? 'Completing...' : 'Complete Assessment'}
            </button>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} />
          This assessment is marked complete. Create a new assessment to record updated findings.
        </div>
      )}
    </div>
  )
}
