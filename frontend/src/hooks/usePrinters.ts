import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

export function usePrinters() {
  return useQuery({ queryKey: ['printers'], queryFn: api.printers.list })
}

export function useAdapters() {
  return useQuery({ queryKey: ['adapters'], queryFn: api.adapters.list })
}

export function useAddPrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.printers.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
  })
}

export function useDeletePrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.printers.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['printers'] }),
  })
}

export function usePrinterControls(printerId: number) {
  return {
    pause: () => api.printers.pause(printerId),
    resume: () => api.printers.resume(printerId),
    cancel: () => api.printers.cancel(printerId),
  }
}
