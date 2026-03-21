import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../lib/store'
import { api } from '../lib/api'
import { AddEmployeeModal } from '../components/AddEmployeeModal'
import { NavBar } from '../components/NavBar'

const ROLE_BADGE: Record<string, string> = {
  OWNER:    'bg-purple-100 text-purple-700',
  MANAGER:  'bg-blue-100 text-blue-700',
  EMPLOYEE: 'bg-slate-100 text-slate-600',
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-rose-400', 'bg-orange-400', 'bg-amber-400', 'bg-teal-400', 'bg-cyan-400', 'bg-indigo-400']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

export function DashboardPage() {
  const { user, workspace } = useAuthStore()
  const [showModal, setShowModal] = useState(false)
  const qc = useQueryClient()

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/employees`).then(r => r.data),
    enabled: !!workspace?.id,
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/workspaces/${workspace!.id}/employees/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', workspace?.id] }),
  })

  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'MANAGER'

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team members</h1>
            <p className="text-slate-500 text-sm mt-1">
              {employees.length} {employees.length === 1 ? 'person' : 'people'} in {workspace?.name}
            </p>
          </div>
          {canManage && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add member
            </button>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total staff', value: employees.length },
            { label: 'Managers', value: employees.filter((e: any) => e.role === 'MANAGER' || e.role === 'OWNER').length },
            { label: 'Employees', value: employees.filter((e: any) => e.role === 'EMPLOYEE').length },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Employee list */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading team…
            </div>
          ) : employees.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              No team members yet. Add your first one!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wide px-5 py-3">Role</th>
                  {canManage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{emp.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${ROLE_BADGE[emp.role] || ROLE_BADGE.EMPLOYEE}`}>
                        {emp.role.charAt(0) + emp.role.slice(1).toLowerCase()}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        {emp.id !== user?.id && (
                          <button
                            onClick={() => { if (confirm(`Remove ${emp.name} from the workspace?`)) removeMutation.mutate(emp.id) }}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Next milestone hint */}
        <div className="mt-6 p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-brand-900">Milestone 1 complete ✅</p>
            <p className="text-sm text-brand-700 mt-0.5">Next: Shift templates &amp; availability (Milestone 4), then the scheduler engine (Milestone 5).</p>
          </div>
        </div>
      </main>

      {showModal && <AddEmployeeModal workspaceId={workspace!.id} onClose={() => setShowModal(false)} />}
    </div>
  )
}
