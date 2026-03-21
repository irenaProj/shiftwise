import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Skill } from '../lib/types'

const key = (workspaceId: string, userId: string) => ['employeeSkills', workspaceId, userId]

export function useEmployeeSkills(workspaceId: string, userId: string) {
  return useQuery<Skill[]>({
    queryKey: key(workspaceId, userId),
    queryFn: () =>
      api.get(`/workspaces/${workspaceId}/employees/${userId}/skills`).then(r => r.data),
    enabled: !!workspaceId && !!userId,
  })
}

export function useAddEmployeeSkill(workspaceId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (skillId: string) =>
      api.post(`/workspaces/${workspaceId}/employees/${userId}/skills`, { skillId }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId, userId) }),
  })
}

export function useRemoveEmployeeSkill(workspaceId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (skillId: string) =>
      api.delete(`/workspaces/${workspaceId}/employees/${userId}/skills/${skillId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId, userId) }),
  })
}
