import { useState, FormEvent } from 'react'
import { useAuthStore } from '../lib/store'
import { NavBar } from '../components/NavBar'
import { useShiftTemplates, useCreateShiftTemplate, useDeleteShiftTemplate } from '../hooks/useShiftTemplates'
import type { ShiftTemplate } from '../lib/types'

function TemplateRow({
  template,
  onDelete,
}: {
  template: ShiftTemplate
  onDelete?: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3 px-5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-slate-900 text-sm">{template.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {template.startTime} – {template.endTime}
          </p>
        </div>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-slate-300 hover:text-red-400 transition-colors"
          title="Delete template"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

function AddTemplateForm({ workspaceId }: { workspaceId: string }) {
  const [form, setForm] = useState({ name: '', startTime: '', endTime: '' })
  const [error, setError] = useState('')
  const createTemplate = useCreateShiftTemplate(workspaceId)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createTemplate.mutateAsync(form)
      setForm({ name: '', startTime: '', endTime: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create template')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        New template
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="sm:col-span-1">
          <label className="label">Name</label>
          <input
            className="input"
            placeholder="e.g. Morning"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Start time</label>
          <input
            type="time"
            className="input"
            value={form.startTime}
            onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">End time</label>
          <input
            type="time"
            className="input"
            value={form.endTime}
            onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
            required
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        className="btn-primary"
        disabled={createTemplate.isPending}
      >
        {createTemplate.isPending ? 'Adding…' : 'Add template'}
      </button>
    </form>
  )
}

export function ShiftTemplatesPage() {
  const { workspace } = useAuthStore()
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'MANAGER'
  const workspaceId = workspace?.id ?? ''

  const { data: templates = [], isLoading } = useShiftTemplates(workspaceId)
  const deleteTemplate = useDeleteShiftTemplate(workspaceId)

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Shift templates</h1>
          <p className="text-slate-500 text-sm mt-1">
            Define reusable time frames for scheduling.
          </p>
        </div>

        <div className="card overflow-hidden max-w-xl">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading…
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No templates yet.</p>
            </div>
          ) : (
            templates.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onDelete={
                  canManage
                    ? () => {
                        if (confirm(`Delete template "${t.name}"?`))
                          deleteTemplate.mutate(t.id)
                      }
                    : undefined
                }
              />
            ))
          )}

          {canManage && <AddTemplateForm workspaceId={workspaceId} />}
        </div>
      </main>
    </div>
  )
}
