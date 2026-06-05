import { useTranslation } from 'react-i18next'
import { ListOrdered, Play, Trash2, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useQueue, useDispatchJob, useDeleteJob } from '@/hooks/useLibrary'
import { jobStatusBadgeClass, formatDate } from '@/utils/format'

export default function QueuePage() {
  const { t } = useTranslation()
  const { data: jobs = [], isLoading } = useQueue()
  const dispatch = useDispatchJob()
  const deleteJob = useDeleteJob()

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('queue.title')}
        subtitle={`${jobs.filter((j) => j.status === 'pending').length} pending`}
      />

      <div className="p-6">
        {isLoading ? (
          <p className="text-slate-500 text-sm">{t('common.loading')}</p>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ListOrdered className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
            <p className="text-slate-500 text-sm">{t('queue.empty')}</p>
            <p className="text-slate-600 text-xs mt-1">Use the Library page to send files to a printer.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">File</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Printer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-slate-200 font-medium truncate max-w-xs block">{job.original_name ?? `File #${job.file_id}`}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{job.printer_name ?? `Printer #${job.printer_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${jobStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(job.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.status === 'pending' && (
                          <button
                            onClick={() => dispatch.mutate(job.id)}
                            disabled={dispatch.isPending}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 transition-colors disabled:opacity-60"
                          >
                            {dispatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Dispatch
                          </button>
                        )}
                        <button
                          onClick={() => deleteJob.mutate(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
