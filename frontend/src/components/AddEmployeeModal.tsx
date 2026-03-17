import { useState, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Props {
  workspaceId: string
  onClose: () => void
}

export function AddEmployeeModal({ workspaceId, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', role: 'EMPLOYEE', password: 'changeme123' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post(`/workspaces/${workspaceId}/employees`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', workspaceId] })
      onClose()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to add employee')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Add team member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" placeholder="Alex Johnson" value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div>
            <label className="label">Email address</label>
            <input type="email" className="input" placeholder="alex@company.com" value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input font-mono text-sm" value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            <p className="text-xs text-slate-400 mt-1">They can change this after first login.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
