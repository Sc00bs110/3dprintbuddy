import { useTranslation } from 'react-i18next'
import { FolderOpen, Upload } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

export default function LibraryPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-full">
      <PageHeader
        title={t('library.title')}
        action={
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors">
            <Upload className="h-4 w-4" />
            {t('library.upload')}
          </button>
        }
      />
      <div className="flex flex-col items-center justify-center py-20 text-center p-6">
        <FolderOpen className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
        <p className="text-slate-500 text-sm">{t('library.empty')}</p>
      </div>
    </div>
  )
}
