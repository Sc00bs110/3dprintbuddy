import { useTranslation } from 'react-i18next'
import PageHeader from '@/components/PageHeader'

export default function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-full">
      <PageHeader title={t('settings.title')} />
      <div className="p-6 max-w-xl space-y-6">
        <SettingRow label={t('settings.authEnabled')}>
          <input type="checkbox" className="h-4 w-4 rounded accent-violet-500" />
        </SettingRow>
        <SettingRow label={t('settings.language')}>
          <select className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-violet-500 focus:outline-none">
            <option value="en">English</option>
          </select>
        </SettingRow>
      </div>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
      <span className="text-sm text-slate-300">{label}</span>
      {children}
    </div>
  )
}
