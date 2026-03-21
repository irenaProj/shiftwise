import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Skill } from '../lib/types'

const key = (workspaceId: string) => ['skills', workspaceId]

export function useSkills(workspaceId: string) {
  return useQuery<Skill[]>({
    queryKey: key(workspaceId),
    queryFn: () => api.get(`/workspaces/${workspaceId}/skills`).then(r => r.data),
    enabled: !!workspaceId,
  })
}

export function useCreateSkill(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post(`/workspaces/${workspaceId}/skills`, { name }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}

export function useDeleteSkill(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (skillId: string) =>
      api.delete(`/workspaces/${workspaceId}/skills/${skillId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}
