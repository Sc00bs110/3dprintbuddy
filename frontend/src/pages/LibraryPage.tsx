import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, Upload, Trash2, Send, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useLibrary, useUploadFile, useDeleteFile, useAddJob } from '@/hooks/useLibrary'
import { usePrinters } from '@/hooks/usePrinters'
import { formatBytes, formatDate } from '@/utils/format'
import type { LibraryFile } from '@/types/library'

export default function LibraryPage() {
  const { t } = useTranslation()
  const { data: files = [], isLoading } = useLibrary()
  const { data: printers = [] } = usePrinters()
  const upload = useUploadFile()
  const deleteFile = useDeleteFile()
  const addJob = useAddJob()
  const inputRef = useRef<HTMLInputElement>(null)
  const [sendTarget, setSendTarget] = useState<{ file: LibraryFile; printerId: number | null } | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate(file)
    e.target.value = ''
  }

  async function handleSend(file: LibraryFile, printerId: number) {
    await addJob.mutateAsync({ printer_id: printerId, file_id: file.id })
    setSendTarget(null)
  }

  const fileTypeIcon = (type: string) => {
    if (type === 'stl') return '🧊'
    if (type.includes('gcode')) return '🖨️'
    if (type === '3mf') return '📦'
    return '📄'
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('library.title')}
        action={
          <>
            <input ref={inputRef} type="file" accept=".3mf,.gcode,.stl" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-60"
            >
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {upload.isPending ? 'Uploading…' : t('library.upload')}
            </button>
          </>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <p className="text-slate-500 text-sm">{t('common.loading')}</p>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="h-12 w-12 text-slate-700 mb-4" strokeWidth={1} />
            <p className="text-slate-500 text-sm">{t('library.empty')}</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-4 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
            >
              {t('library.upload')} →
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">File</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{fileTypeIcon(file.file_type)}</span>
                        <span className="text-slate-200 font-medium truncate max-w-xs">{file.original_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs rounded-md bg-slate-800 px-2 py-0.5 text-slate-400 font-mono">{file.file_type}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatBytes(file.size_bytes)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(file.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Send to printer */}
                        {printers.length > 0 && (
                          <div className="relative">
                            <button
                              onClick={() => setSendTarget(sendTarget?.file.id === file.id ? null : { file, printerId: null })}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-violet-600/15 text-violet-400 hover:bg-violet-600/25 transition-colors"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send
                            </button>
                            {sendTarget?.file.id === file.id && (
                              <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-1">
                                {printers.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleSend(file, p.id)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => deleteFile.mutate(file.id)}
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

      {/* Click-outside to close send dropdown */}
      {sendTarget && (
        <div className="fixed inset-0 z-0" onClick={() => setSendTarget(null)} />
      )}
    </div>
  )
}
