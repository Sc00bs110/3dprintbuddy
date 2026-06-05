import type { AdapterInfo, DiscoveredPrinter, Printer, PrinterState } from '@/types/printer'

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
  },
  adapters: {
    list: () => request<AdapterInfo[]>('/printers/adapters'),
    discover: () => request<DiscoveredPrinter[]>('/printers/discover'),
  },
}
