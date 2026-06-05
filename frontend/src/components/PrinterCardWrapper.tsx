import PrinterCard from '@/components/PrinterCard'
import { usePrinterControls } from '@/hooks/usePrinters'
import { usePrinterStore } from '@/store/printerStore'
import type { AdapterInfo, Printer } from '@/types/printer'

interface Props {
  printer: Printer
  adapterInfo: AdapterInfo | undefined
}

export default function PrinterCardWrapper({ printer, adapterInfo }: Props) {
  const state = usePrinterStore((s) => s.states[printer.id])
  const controls = usePrinterControls(printer.id)

  return (
    <PrinterCard
      printer={printer}
      state={state}
      capabilities={adapterInfo?.capabilities}
      onPause={controls.pause}
      onResume={controls.resume}
      onCancel={controls.cancel}
      onCamera={() => {}}
    />
  )
}
