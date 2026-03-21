import { useState, FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../lib/store'
import { api } from '../lib/api'
import { NavBar } from '../components/NavBar'
import { useSkills, useCreateSkill, useDeleteSkill } from '../hooks/useSkills'
import { useEmployeeSkills, useAddEmployeeSkill, useRemoveEmployeeSkill } from '../hooks/useEmployeeSkills'
import type { Employee, Skill } from '../lib/types'

function SkillChip({
  skill,
  onRemove,
}: {
  skill: Skill
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium px-2 py-1 rounded-full">
      {skill.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-brand-400 hover:text-brand-700 transition-colors leading-none"
          title={`Remove ${skill.name}`}
        >
          ×
        </button>
      )}
    </span>
  )
}

function WorkspaceSkillsCard({
  workspaceId,
  canManage,
}: {
  workspaceId: string
  canManage: boolean
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const { data: skills = [], isLoading } = useSkills(workspaceId)
  const createSkill = useCreateSkill(workspaceId)
  const deleteSkill = useDeleteSkill(workspaceId)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createSkill.mutateAsync(name.trim())
      setName('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add skill')
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Workspace skills</h2>

      {isLoading ? (
        <div className="py-6 text-center text-slate-400 text-sm">Loading…</div>
      ) : skills.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">No skills defined yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill) => (
            <SkillChip
              key={skill.id}
              skill={skill}
              onRemove={
                canManage
                  ? () => {
                      if (confirm(`Delete skill "${skill.name}"? This will remove it from all employees.`))
                        deleteSkill.mutate(skill.id)
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            className="input"
            placeholder="New skill name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={createSkill.isPending}
          >
            {createSkill.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}

function EmployeeSkillsCard({
  workspaceId,
  employees,
  allSkills,
  canManage,
}: {
  workspaceId: string
  employees: Employee[]
  allSkills: Skill[]
  canManage: boolean
}) {
  const [selectedUserId, setSelectedUserId] = useState(employees[0]?.id ?? '')
  const [error, setError] = useState('')

  const { data: assigned = [] } = useEmployeeSkills(workspaceId, selectedUserId)
  const addSkill = useAddEmployeeSkill(workspaceId, selectedUserId)
  const removeSkill = useRemoveEmployeeSkill(workspaceId, selectedUserId)

  const assignedIds = new Set(assigned.map((s) => s.id))
  const unassigned = allSkills.filter((s) => !assignedIds.has(s.id))

  async function handleAssign(skillId: string) {
    setError('')
    try {
      await addSkill.mutateAsync(skillId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign skill')
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Employee skills</h2>

      {employees.length === 0 ? (
        <p className="text-sm text-slate-400">No employees yet.</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="label">Select employee</label>
            <select
              className="input"
              value={selectedUserId}
              onChange={(e) => { setSelectedUserId(e.target.value); setError('') }}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Assigned skills
            </p>
            {assigned.length === 0 ? (
              <p className="text-sm text-slate-400">No skills assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assigned.map((skill) => (
                  <SkillChip
                    key={skill.id}
                    skill={skill}
                    onRemove={
                      canManage ? () => removeSkill.mutate(skill.id) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {canManage && unassigned.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Assign skill
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleAssign(skill.id)}
                    disabled={addSkill.isPending}
                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-700 text-xs font-medium px-2 py-1 rounded-full transition-colors"
                  >
                    + {skill.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </>
      )}
    </div>
  )
}

export function SkillsPage() {
  const { workspace } = useAuthStore()
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'MANAGER'

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}/employees`).then(r => r.data),
    enabled: !!workspace?.id,
  })

  const { data: allSkills = [] } = useSkills(workspace?.id ?? '')

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Skills</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage workspace skills and assign them to employees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WorkspaceSkillsCard
            workspaceId={workspace?.id ?? ''}
            canManage={canManage}
          />
          <EmployeeSkillsCard
            workspaceId={workspace?.id ?? ''}
            employees={employees}
            allSkills={allSkills}
            canManage={canManage}
          />
        </div>
      </main>
    </div>
  )
}
