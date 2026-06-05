import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Printer, Plus, Activity } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PrinterCardWrapper from '@/components/PrinterCardWrapper'
import { usePrinters, useAdapters } from '@/hooks/usePrinters'
import { usePrinterStore } from '@/store/printerStore'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data: printers = [], isLoading } = usePrinters()
  const { data: adapters = [] } = useAdapters()
  const states = usePrinterStore((s) => s.states)

  const activePrints = printers.filter((p) => {
    const s = states[p.id]?.status
    return s === 'printing' || s === 'paused' || s === 'finishing'
  })
  const idleCount = printers.filter((p) => states[p.id]?.status === 'idle').length
  const offlineCount = printers.filter((p) => !states[p.id] || states[p.id].status === 'offline').length

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('dashboard.title')}
        action={
          <Link
            to="/printers/add"
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('printer.addPrinter')}
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {printers.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              icon={<Activity className="h-5 w-5 text-emerald-400" />}
              label={t('dashboard.activePrints')}
              value={activePrints.length}
              highlight
            />
            <SummaryCard
              icon={<Printer className="h-5 w-5 text-slate-400" />}
              label={t('dashboard.idle')}
              value={idleCount}
            />
            <SummaryCard
              icon={<Printer className="h-5 w-5 text-slate-600" />}
              label={t('dashboard.offline')}
              value={offlineCount}
            />
          </div>
        )}

        {isLoading ? (
          <div className="text-slate-500 text-sm">{t('common.loading')}</div>
        ) : printers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {printers.map((printer) => (
              <PrinterCardWrapper
                key={printer.id}
                printer={printer}
                adapterInfo={adapters.find((a) => a.id === printer.adapter_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${highlight && value > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900'}`}>
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Printer className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
      <p className="text-slate-400 mb-2">{t('dashboard.noPrinters')}</p>
      <Link
        to="/printers/add"
        className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
      >
        {t('dashboard.addFirst')} →
      </Link>
    </div>
  )
}
