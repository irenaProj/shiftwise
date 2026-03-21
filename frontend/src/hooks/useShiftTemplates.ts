import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ShiftTemplate } from '../lib/types'

const key = (workspaceId: string) => ['shiftTemplates', workspaceId]

export function useShiftTemplates(workspaceId: string) {
  return useQuery<ShiftTemplate[]>({
    queryKey: key(workspaceId),
    queryFn: () => api.get(`/workspaces/${workspaceId}/shift-templates`).then(r => r.data),
    enabled: !!workspaceId,
  })
}

export function useCreateShiftTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; startTime: string; endTime: string }) =>
      api.post(`/workspaces/${workspaceId}/shift-templates`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}

export function useDeleteShiftTemplate(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(`/workspaces/${workspaceId}/shift-templates/${templateId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}
