import { useState } from 'react'
import PrinterCard from '@/components/PrinterCard'
import { usePrinterControls, useDeletePrinter } from '@/hooks/usePrinters'
import { usePrinterStore } from '@/store/printerStore'
import type { AdapterInfo, Printer } from '@/types/printer'

interface Props {
  printer: Printer
  adapterInfo: AdapterInfo | undefined
}

export default function PrinterCardWrapper({ printer, adapterInfo }: Props) {
  const state = usePrinterStore((s) => s.states[printer.id])
  const controls = usePrinterControls(printer.id)
  const deletePrinter = useDeletePrinter()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (confirmDelete) {
      deletePrinter.mutate(printer.id)
    } else {
      setConfirmDelete(true)
      // Auto-reset confirm state after 3s if user doesn't click again
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <PrinterCard
      printer={printer}
      state={state}
      capabilities={adapterInfo?.capabilities}
      onPause={controls.pause}
      onResume={controls.resume}
      onCancel={controls.cancel}
      onCamera={() => {}}
      onDelete={handleDelete}
      confirmDelete={confirmDelete}
    />
  )
}
