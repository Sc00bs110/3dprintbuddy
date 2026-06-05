import { useTranslation } from 'react-i18next'
import { ListOrdered, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export default function QueuePage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-full">
      <PageHeader
        title={t('queue.title')}
        action={
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors">
            <Plus className="h-4 w-4" />
            {t('queue.addJob')}
          </button>
        }
      />
      <div className="flex flex-col items-center justify-center py-20 text-center p-6">
        <ListOrdered className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
        <p className="text-slate-500 text-sm">{t('queue.empty')}</p>
      </div>
    </div>
  )
}
