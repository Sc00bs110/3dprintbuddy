import type { AdapterInfo, DiscoveredPrinter, Printer, PrinterState } from '@/types/printer'
import type { LibraryFile, QueueJob } from '@/types/library'

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  printers: {
    list: () => request<Printer[]>('/printers/'),
    add: (body: { name: string; adapter_id: string; config: Record<string, unknown> }) =>
      request<Printer>('/printers/', { method: 'POST', body: JSON.stringify(body) }),
    status: (id: number) => request<PrinterState>(`/printers/${id}/status`),
    pause: (id: number) => request<void>(`/printers/${id}/pause`, { method: 'POST' }),
    resume: (id: number) => request<void>(`/printers/${id}/resume`, { method: 'POST' }),
    cancel: (id: number) => request<void>(`/printers/${id}/cancel`, { method: 'POST' }),
    cameraUrl: (id: number) => request<{ url: string }>(`/printers/${id}/camera`),
    delete: (id: number) =>
      fetch(`${BASE}/printers/${id}`, { method: 'DELETE' }).then(() => undefined),
  },
  adapters: {
    list: () => request<AdapterInfo[]>('/printers/adapters'),
    discover: () => request<DiscoveredPrinter[]>('/printers/discover'),
  },
  library: {
    list: () => request<LibraryFile[]>('/library/'),
    delete: (id: number) =>
      fetch(`${BASE}/library/${id}`, { method: 'DELETE' }).then(() => undefined),
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/library/upload`, { method: 'POST', body: form }).then(
        (r) => r.json() as Promise<LibraryFile>,
      )
    },
  },
  queue: {
    list: () => request<QueueJob[]>('/queue/'),
    add: (body: { printer_id: number; file_id: number; plate_index?: number }) =>
      request<QueueJob>('/queue/', { method: 'POST', body: JSON.stringify(body) }),
    dispatch: (id: number) => request<QueueJob>(`/queue/${id}/dispatch`, { method: 'POST' }),
    delete: (id: number) =>
      fetch(`${BASE}/queue/${id}`, { method: 'DELETE' }).then(() => undefined),
  },
}
