import { useState, FormEvent } from 'react'
import { useAuthStore } from '../lib/store'
import { NavBar } from '../components/NavBar'
import { useForecast, useUpsertForecastSlot, useDeleteForecastSlot } from '../hooks/useForecast'
import type { ForecastSlot } from '../lib/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Generate HH:mm options in 30-min increments
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

function requiredColor(n: number) {
  if (n >= 4) return 'bg-red-100 text-red-700'
  if (n === 3) return 'bg-orange-100 text-orange-700'
  if (n === 2) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

function ForecastGrid({
  slots,
  canManage,
  onDelete,
}: {
  slots: ForecastSlot[]
  canManage: boolean
  onDelete: (id: string) => void
}) {
  // Index slots by dayOfWeek → time
  const index = new Map<string, ForecastSlot>()
  for (const s of slots) {
    index.set(`${s.dayOfWeek}:${s.time}`, s)
  }

  // Only show time rows that have at least one slot
  const activeTimes = [...new Set(slots.map((s) => s.time))].sort()

  if (activeTimes.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">No forecast slots yet. Add one using the form.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-4 py-2.5 w-20">
              Time
            </th>
            {DAYS.map((d) => (
              <th key={d} className="text-center text-xs font-medium text-slate-400 uppercase tracking-wide px-2 py-2.5">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {activeTimes.map((time) => (
            <tr key={time} className="hover:bg-slate-50/50">
              <td className="px-4 py-2 text-xs text-slate-500 font-mono">{time}</td>
              {DAYS.map((_, day) => {
                const slot = index.get(`${day}:${time}`)
                return (
                  <td key={day} className="px-2 py-2 text-center">
                    {slot ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${requiredColor(slot.required)}`}>
                        {slot.required}
                        {canManage && (
                          <button
                            onClick={() => onDelete(slot.id)}
                            className="opacity-50 hover:opacity-100 leading-none"
                            title="Remove slot"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-200">–</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UpsertSlotForm({ workspaceId }: { workspaceId: string }) {
  const [form, setForm] = useState({ dayOfWeek: '1', time: '09:00', required: '2' })
  const [error, setError] = useState('')
  const upsert = useUpsertForecastSlot(workspaceId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await upsert.mutateAsync({
        dayOfWeek: Number(form.dayOfWeek),
        time: form.time,
        required: Number(form.required),
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save slot')
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Set demand</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Day</label>
          <select
            className="input"
            value={form.dayOfWeek}
            onChange={(e) => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Time slot</label>
          <select
            className="input"
            value={form.time}
            onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Employees required</label>
          <input
            type="number"
            min={1}
            className="input"
            value={form.required}
            onChange={(e) => setForm(f => ({ ...f, required: e.target.value }))}
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save slot'}
        </button>
      </form>
      <p className="text-xs text-slate-400 mt-3">
        Saving an existing day + time slot will update it.
      </p>
    </div>
  )
}

export function ForecastPage() {
  const { workspace } = useAuthStore()
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'MANAGER'
  const workspaceId = workspace?.id ?? ''

  const { data: slots = [], isLoading } = useForecast(workspaceId)
  const deleteSlot = useDeleteForecastSlot(workspaceId)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Forecast</h1>
          <p className="text-slate-500 text-sm mt-1">
            Set how many employees are needed per 30-minute slot.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 card overflow-hidden">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading…
              </div>
            ) : (
              <ForecastGrid
                slots={slots}
                canManage={canManage}
                onDelete={(id) => {
                  if (confirm('Remove this forecast slot?')) deleteSlot.mutate(id)
                }}
              />
            )}
            {slots.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-100 inline-block" /> 1
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-100 inline-block" /> 2
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-orange-100 inline-block" /> 3
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-100 inline-block" /> 4+
                </span>
              </div>
            )}
          </div>

          {canManage && <UpsertSlotForm workspaceId={workspaceId} />}
        </div>
      </main>
    </div>
  )
}
