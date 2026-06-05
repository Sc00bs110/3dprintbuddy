import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, Printer } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PrinterCardWrapper from '@/components/PrinterCardWrapper'
import { usePrinters, useAdapters } from '@/hooks/usePrinters'

export default function PrintersPage() {
  const { t } = useTranslation()
  const { data: printers = [], isLoading } = usePrinters()
  const { data: adapters = [] } = useAdapters()

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('nav.printers')}
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

      <div className="p-6">
        {isLoading ? (
          <p className="text-slate-500 text-sm">{t('common.loading')}</p>
        ) : printers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Printer className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
            <p className="text-slate-400 mb-1">{t('printer.noPrintersYet')}</p>
            <p className="text-slate-600 text-sm mb-4">{t('printer.addFirstPrompt')}</p>
            <Link
              to="/printers/add"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('printer.addPrinter')}
            </Link>
          </div>
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
