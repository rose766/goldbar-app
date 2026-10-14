export interface AssessmentQuestion {
  key: string
  text: string
  section: string
  sectionLabel: string
  allowNA: boolean
  helpText?: string
}

export const ASSESSMENT_SECTIONS = [
  { id: 'A', label: 'Communication' },
  { id: 'B', label: 'Delegation & Ownership' },
  { id: 'C', label: 'Access & Business Context' },
  { id: 'D', label: 'Confidence & Relationship' },
  { id: 'E', label: 'Performance & Workload' },
  { id: 'F', label: 'Role Clarity & Expectations' },
  { id: 'G', label: 'Operating Systems & Documentation' },
  { id: 'H', label: 'Feedback & Previous Coaching' },
] as const

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // ─── Section A: Communication ─────────────────────────────────────────────
  {
    key: 'A1', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Does the VA respond to client messages in a timely and professional manner?',
    helpText: 'Consider the agreed response time standard and actual response patterns.',
  },
  {
    key: 'A2', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Does the VA proactively communicate status updates without being asked?',
  },
  {
    key: 'A3', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Does the VA raise blockers, risks, or delays before they become problems?',
  },
  {
    key: 'A4', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Does the client communicate clearly and consistently with the VA?',
  },
  {
    key: 'A5', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Are messages, tasks, and decisions consolidated in agreed channels?',
    helpText: 'E.g., not scattered across email, Slack, text, and verbal.',
  },
  {
    key: 'A6', section: 'A', sectionLabel: 'Communication', allowNA: false,
    text: 'Does the VA close the loop after completing tasks?',
  },
  {
    key: 'A7', section: 'A', sectionLabel: 'Communication', allowNA: true,
    text: 'Do communication style differences (directness, formality, pace) create friction?',
    helpText: 'Answer YES if differences are present and causing issues.',
  },

  // ─── Section B: Delegation & Ownership ────────────────────────────────────
  {
    key: 'B1', section: 'B', sectionLabel: 'Delegation & Ownership', allowNA: false,
    text: 'Does the client actively delegate recurring tasks to the VA?',
  },
  {
    key: 'B2', section: 'B', sectionLabel: 'Delegation & Ownership', allowNA: false,
    text: 'Does the VA take ownership of agreed responsibilities without constant reminders?',
  },
  {
    key: 'B3', section: 'B', sectionLabel: 'Delegation & Ownership', allowNA: false,
    text: 'Does the client redo or micromanage tasks already delegated to the VA?',
    helpText: 'Answer YES if this is a pattern, not a one-off.',
  },
  {
    key: 'B4', section: 'B', sectionLabel: 'Delegation & Ownership', allowNA: false,
    text: 'Does the VA proactively identify tasks or areas they could take on?',
  },
  {
    key: 'B5', section: 'B', sectionLabel: 'Delegation & Ownership', allowNA: true,
    text: 'Are there clear boundaries around what the VA can decide independently?',
  },

  // ─── Section C: Access & Business Context ─────────────────────────────────
  {
    key: 'C1', section: 'C', sectionLabel: 'Access & Business Context', allowNA: false,
    text: 'Does the VA have access to all tools, accounts, and systems needed for their role?',
    helpText: 'E.g., calendar, email, CRM, project tools.',
  },
  {
    key: 'C2', section: 'C', sectionLabel: 'Access & Business Context', allowNA: false,
    text: 'Does the VA have sufficient business context to make good decisions and ask relevant questions?',
  },
  {
    key: 'C3', section: 'C', sectionLabel: 'Access & Business Context', allowNA: false,
    text: 'Are there documented processes or SOPs the VA can reference for recurring tasks?',
  },
  {
    key: 'C4', section: 'C', sectionLabel: 'Access & Business Context', allowNA: true,
    text: 'Has the VA received a proper introduction to key contacts, vendors, or stakeholders?',
  },

  // ─── Section D: Confidence & Relationship ─────────────────────────────────
  {
    key: 'D1', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: 'Does the VA communicate with confidence during check-ins and calls?',
  },
  {
    key: 'D2', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: 'Does the VA feel comfortable asking clarifying questions when needed?',
  },
  {
    key: 'D3', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: 'Is the working relationship between the VA and client respectful and professional?',
  },
  {
    key: 'D4', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: 'Does the client appear to trust the VA with meaningful responsibilities?',
  },
  {
    key: 'D5', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: "Has the VA expressed any concerns about the client's behavior or communication style?",
  },
  {
    key: 'D6', section: 'D', sectionLabel: 'Confidence & Relationship', allowNA: false,
    text: 'Has the client expressed any concerns or frustration about the VA?',
  },

  // ─── Section E: Performance & Workload ────────────────────────────────────
  {
    key: 'E1', section: 'E', sectionLabel: 'Performance & Workload', allowNA: false,
    text: 'Is the VA completing tasks accurately and to the standard the client expects?',
  },
  {
    key: 'E2', section: 'E', sectionLabel: 'Performance & Workload', allowNA: false,
    text: 'Is the VA meeting agreed deadlines consistently?',
  },
  {
    key: 'E3', section: 'E', sectionLabel: 'Performance & Workload', allowNA: false,
    text: "Is the VA's workload manageable within their contracted hours?",
  },
  {
    key: 'E4', section: 'E', sectionLabel: 'Performance & Workload', allowNA: false,
    text: 'Has the same mistake or issue been raised more than once after coaching?',
  },
  {
    key: 'E5', section: 'E', sectionLabel: 'Performance & Workload', allowNA: true,
    text: "Are VA performance issues influenced by factors outside the VA's control (e.g., missing client input, blocked access)?",
    helpText: 'Answer YES if client-side delays are a contributing factor.',
  },

  // ─── Section F: Role Clarity & Expectations ───────────────────────────────
  {
    key: 'F1', section: 'F', sectionLabel: 'Role Clarity & Expectations', allowNA: false,
    text: 'Is there a clear, agreed understanding of what the VA is responsible for?',
  },
  {
    key: 'F2', section: 'F', sectionLabel: 'Role Clarity & Expectations', allowNA: false,
    text: 'Is the client requesting work outside the agreed role scope?',
  },
  {
    key: 'F3', section: 'F', sectionLabel: 'Role Clarity & Expectations', allowNA: false,
    text: 'Does the VA have the skills required for their current responsibilities?',
  },
  {
    key: 'F4', section: 'F', sectionLabel: 'Role Clarity & Expectations', allowNA: true,
    text: 'Has the role scope expanded since the engagement began without a formal adjustment?',
  },

  // ─── Section G: Operating Systems & Documentation ─────────────────────────
  {
    key: 'G1', section: 'G', sectionLabel: 'Operating Systems & Documentation', allowNA: false,
    text: 'Does the team use a central system to track tasks and priorities?',
  },
  {
    key: 'G2', section: 'G', sectionLabel: 'Operating Systems & Documentation', allowNA: false,
    text: 'Are decisions and priority changes documented in a shared location?',
  },
  {
    key: 'G3', section: 'G', sectionLabel: 'Operating Systems & Documentation', allowNA: true,
    text: 'Are there recurring meetings or check-ins that support the working relationship?',
  },
  {
    key: 'G4', section: 'G', sectionLabel: 'Operating Systems & Documentation', allowNA: true,
    text: 'Is there a handoff or update process when the client is unavailable?',
  },

  // ─── Section H: Feedback & Previous Coaching ──────────────────────────────
  {
    key: 'H1', section: 'H', sectionLabel: 'Feedback & Previous Coaching', allowNA: false,
    text: 'Does the client provide timely and specific feedback to the VA?',
  },
  {
    key: 'H2', section: 'H', sectionLabel: 'Feedback & Previous Coaching', allowNA: false,
    text: 'Has the VA received coaching or guidance on the issues identified in this case?',
  },
  {
    key: 'H3', section: 'H', sectionLabel: 'Feedback & Previous Coaching', allowNA: true,
    text: 'Has previous coaching led to measurable improvement?',
    helpText: 'Answer NA if no previous coaching has occurred.',
  },
  {
    key: 'H4', section: 'H', sectionLabel: 'Feedback & Previous Coaching', allowNA: true,
    text: 'Are there documented records of previous coaching conversations or corrective actions?',
  },
]

export type AnswerValue = 'YES' | 'NO' | 'UNKNOWN' | 'NA'

export const ANSWER_OPTIONS: { value: AnswerValue; label: string; color: string }[] = [
  { value: 'YES', label: 'Yes', color: 'bg-green-100 border-green-500 text-green-700' },
  { value: 'NO', label: 'No', color: 'bg-red-100 border-red-500 text-red-700' },
  { value: 'UNKNOWN', label: 'Unknown', color: 'bg-amber-100 border-amber-500 text-amber-700' },
  { value: 'NA', label: 'N/A', color: 'bg-slate-100 border-slate-400 text-slate-600' },
]

export function getQuestionsBySection(sectionId: string): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS.filter(q => q.section === sectionId)
}

export function getSectionCompletion(
  sectionId: string,
  responses: Record<string, AnswerValue>
): { answered: number; total: number } {
  const questions = getQuestionsBySection(sectionId)
  const answered = questions.filter(q => responses[q.key] !== undefined).length
  return { answered, total: questions.length }
}

export function getOverallCompletion(responses: Record<string, AnswerValue>): number {
  const answered = ASSESSMENT_QUESTIONS.filter(q => responses[q.key] !== undefined).length
  return Math.round((answered / ASSESSMENT_QUESTIONS.length) * 100)
}
