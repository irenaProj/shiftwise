import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ForecastSlot } from '../lib/types'

const key = (workspaceId: string) => ['forecast', workspaceId]

export function useForecast(workspaceId: string) {
  return useQuery<ForecastSlot[]>({
    queryKey: key(workspaceId),
    queryFn: () => api.get(`/workspaces/${workspaceId}/forecast`).then(r => r.data),
    enabled: !!workspaceId,
  })
}

export function useUpsertForecastSlot(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { dayOfWeek: number; time: string; required: number }) =>
      api.put(`/workspaces/${workspaceId}/forecast`, body).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}

export function useDeleteForecastSlot(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slotId: string) =>
      api.delete(`/workspaces/${workspaceId}/forecast/${slotId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId) }),
  })
}
