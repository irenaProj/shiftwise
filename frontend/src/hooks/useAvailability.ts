import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Availability } from '../lib/types'

const key = (workspaceId: string, userId: string) => ['availability', workspaceId, userId]

export function useAvailability(workspaceId: string, userId: string) {
  return useQuery<Availability[]>({
    queryKey: key(workspaceId, userId),
    queryFn: () =>
      api.get(`/workspaces/${workspaceId}/employees/${userId}/availability`).then(r => r.data),
    enabled: !!workspaceId && !!userId,
  })
}

export function useUpsertAvailability(workspaceId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { dayOfWeek: number; startTime: string; endTime: string }) =>
      api
        .put(`/workspaces/${workspaceId}/employees/${userId}/availability`, body)
        .then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId, userId) }),
  })
}

export function useDeleteAvailability(workspaceId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (availabilityId: string) =>
      api.delete(`/workspaces/${workspaceId}/employees/${userId}/availability/${availabilityId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(workspaceId, userId) }),
  })
}
