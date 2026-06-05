import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

export function useLibrary() {
  return useQuery({ queryKey: ['library'], queryFn: api.library.list })
}

export function useUploadFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.library.upload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.library.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  })
}

export function useQueue() {
  return useQuery({ queryKey: ['queue'], queryFn: api.queue.list })
}

export function useAddJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.queue.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}

export function useDispatchJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.queue.dispatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.queue.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
  })
}
