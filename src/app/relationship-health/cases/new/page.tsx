'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const SOURCE_OPTIONS = [
  { value: 'CLIENT_FEEDBACK', label: 'Client Feedback' },
  { value: 'VA_FEEDBACK', label: 'VA Feedback' },
  { value: 'AM_OBSERVATION', label: 'AM Observation' },
  { value: 'PERFORMANCE_REVIEW', label: 'Performance Review' },
  { value: 'OTHER', label: 'Other' },
]

const SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

interface Client { id: string; name: string }
interface VA { id: string; name: string; clientId: string }

export default function NewCasePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [vas, setVAs] = useState<VA[]>([])
  const [filteredVAs, setFilteredVAs] = useState<VA[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    clientId: '',
    vaId: '',
    assignedAm: 'Rose',
    dateIdentified: new Date().toISOString().slice(0, 10),
    sourceOfConcern: 'AM_OBSERVATION',
    description: '',
    severity: 'MODERATE',
    clientFeedback: '',
    vaFeedback: '',
    nextReviewDate: '',
  })

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients ?? d ?? [])).catch(() => {})
    fetch('/api/vas').then(r => r.json()).then(d => setVAs(d.vas ?? d ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.clientId) {
      setFilteredVAs(vas.filter(v => v.clientId === form.clientId))
      setForm(f => ({ ...f, vaId: '' }))
    } else {
      setFilteredVAs(vas)
    }
  }, [form.clientId, vas])

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rh/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          dateIdentified: new Date(form.dateIdentified).toISOString(),
          nextReviewDate: form.nextReviewDate ? new Date(form.nextReviewDate).toISOString() : null,
          vaId: form.vaId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Failed to create case')
      }
      const data = await res.json()
      router.push(`/relationship-health/cases/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create case')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <TopBar title="New Case" subtitle="Open a new Relationship Health case" />

      <div className="p-6 max-w-2xl">
        <Link
          href="/relationship-health/cases"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cases
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-6 text-base font-semibold text-slate-900">Case Details</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Title *">
              <input
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="input-base"
                placeholder="Brief title describing the issue"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Client *">
                <select
                  required
                  value={form.clientId}
                  onChange={e => set('clientId', e.target.value)}
                  className="input-base"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="VA">
                <select
                  value={form.vaId}
                  onChange={e => set('vaId', e.target.value)}
                  className="input-base"
                  disabled={!form.clientId}
                >
                  <option value="">Select VA...</option>
                  {filteredVAs.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Assigned AM *">
                <input
                  required
                  value={form.assignedAm}
                  onChange={e => set('assignedAm', e.target.value)}
                  className="input-base"
                />
              </FormField>

              <FormField label="Date Identified *">
                <input
                  type="date"
                  required
                  value={form.dateIdentified}
                  onChange={e => set('dateIdentified', e.target.value)}
                  className="input-base"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Source of Concern">
                <select
                  value={form.sourceOfConcern}
                  onChange={e => set('sourceOfConcern', e.target.value)}
                  className="input-base"
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Severity *">
                <select
                  required
                  value={form.severity}
                  onChange={e => set('severity', e.target.value)}
                  className="input-base"
                >
                  {SEVERITIES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Description *">
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="input-base"
                placeholder="Describe the relationship issue in detail..."
              />
            </FormField>

            <FormField label="Client Feedback (optional)">
              <textarea
                rows={3}
                value={form.clientFeedback}
                onChange={e => set('clientFeedback', e.target.value)}
                className="input-base"
                placeholder="Direct feedback received from the client..."
              />
            </FormField>

            <FormField label="VA Feedback (optional)">
              <textarea
                rows={3}
                value={form.vaFeedback}
                onChange={e => set('vaFeedback', e.target.value)}
                className="input-base"
                placeholder="Direct feedback received from the VA..."
              />
            </FormField>

            <FormField label="Next Review Date (optional)">
              <input
                type="date"
                value={form.nextReviewDate}
                onChange={e => set('nextReviewDate', e.target.value)}
                className="input-base"
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Case'}
              </button>
              <Link
                href="/relationship-health/cases"
                className="rounded-md border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .input-base {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-base:focus {
          ring: 2px;
          ring-color: #94a3b8;
        }
      `}</style>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}
