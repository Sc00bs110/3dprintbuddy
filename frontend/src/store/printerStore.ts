import { create } from 'zustand'
import type { PrinterState, PrinterStateMap } from '@/types/printer'

interface PrinterStore {
  states: PrinterStateMap
  setprinterState: (printerId: number, state: PrinterState) => void
}

// Lightweight global store for live printer states pushed via WebSocket.
// React Query handles server data (the printer list, etc.); this store
// holds only the real-time state that arrives outside the query lifecycle.
export const usePrinterStore = create<PrinterStore>((set) => ({
  states: {},
  setprinterState: (printerId, state) =>
    set((s) => ({ states: { ...s.states, [printerId]: state } })),
}))
