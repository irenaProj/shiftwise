import { useState, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../lib/store'
import { api } from '../lib/api'
import { NavBar } from '../components/NavBar'
import { useAvailability, useUpsertAvailability, useDeleteAvailability } from '../hooks/useAvailability'
import type { Employee, Availability } from '../lib/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function AvailabilityRow({
  window: w,
  onDelete,
}: {
  window: Availability
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3 px-5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-4">
        <span className="w-10 text-xs font-medium text-slate-400 uppercase">
          {DAYS_SHORT[w.dayOfWeek]}
        </span>
        <span className="text-sm text-slate-700 font-mono">
          {w.startTime} – {w.endTime}
        </span>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-slate-300 hover:text-red-400 transition-colors"
          title="Remove window"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

function AddWindowForm({
  workspaceId,
  userId,
}: {
  workspaceId: string
  userId: string
}) {
  const [form, setForm] = useState({ dayOfWeek: '1', startTime: '09:00', endTime: '17:00' })
  const [error, setError] = useState('')
  const upsert = useUpsertAvailability(workspaceId, userId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await upsert.mutateAsync({
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
      })
      setForm(f => ({ ...f, dayOfWeek: '1' }))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save availability')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Add / update window
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label htmlFor="availability-day" className="label">Day</label>
          <select
            id="availability-day"
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
          <label htmlFor="availability-from" className="label">From</label>
          <input
            id="availability-from"
            type="time"
            className="input"
            value={form.startTime}
            onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
            required
          />
        </div>
        <div>
          <label htmlFor="availability-to" className="label">To</label>
          <input
            id="availability-to"
            type="time"
            className="input"
            value={form.endTime}
            onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
            required
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button type="submit" className="btn-primary" disabled={upsert.isPending}>
        {upsert.isPending ? 'Saving…' : 'Save'}
      </button>
      <p className="text-xs text-slate-400 mt-2">
        Saving the same day + start time will update the end time.
      </p>
    </form>
  )
}

function EmployeeAvailabilityCard({
  workspaceId,
  userId,
  canManage,
}: {
  workspaceId: string
  userId: string
  canManage: boolean
}) {
  const { data: windows = [], isLoading } = useAvailability(workspaceId, userId)
  const deleteWindow = useDeleteAvailability(workspaceId, userId)

  // Sort by dayOfWeek then startTime
  const sorted = [...windows].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  )

  return (
    <div className="card overflow-hidden">
      {isLoading ? (
        <div className="py-10 text-center text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading…
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <svg className="w-8 h-8 mx-auto mb-2 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No availability set.</p>
        </div>
      ) : (
        sorted.map((w) => (
          <AvailabilityRow
            key={w.id}
            window={w}
            onDelete={
              canManage
                ? () => {
                    if (confirm(`Remove ${DAYS[w.dayOfWeek]} ${w.startTime}–${w.endTime}?`))
                      deleteWindow.mutate(w.id)
                  }
                : undefined
            }
          />
        ))
      )}
      {canManage && <AddWindowForm workspaceId={workspaceId} userId={userId} />}
    </div>
  )
}

export function AvailabilityPage() {
  const { workspace } = useAuthStore()
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'MANAGER'
  const workspaceId = workspace?.id ?? ''

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/employees`).then(r => r.data),
    enabled: !!workspaceId,
  })

  const [selectedUserId, setSelectedUserId] = useState('')
  const effectiveUserId = selectedUserId || employees[0]?.id || ''
  const selectedEmployee = employees.find(e => e.id === effectiveUserId)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage when each employee is available to work.
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">
            No employees yet. Add team members first.
          </div>
        ) : (
          <>
            <div className="mb-5 max-w-xs">
              <label htmlFor="employee-select" className="label">Employee</label>
              <select
                id="employee-select"
                className="input"
                value={effectiveUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee && (
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-700">
                  {selectedEmployee.name}
                  <span className="text-slate-400 font-normal ml-2">
                    {selectedEmployee.email}
                  </span>
                </p>
              </div>
            )}

            <EmployeeAvailabilityCard
              workspaceId={workspaceId}
              userId={effectiveUserId}
              canManage={canManage}
            />
          </>
        )}
      </main>
    </div>
  )
}
