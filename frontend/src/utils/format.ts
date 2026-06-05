export function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatTemp(temp: number | null, target: number | null): string {
  if (temp === null) return '—'
  const t = `${temp.toFixed(0)}°C`
  return target ? `${t} / ${target.toFixed(0)}°C` : t
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function statusColor(status: string): string {
  switch (status) {
    case 'printing': return 'text-emerald-400'
    case 'paused': return 'text-amber-400'
    case 'error': return 'text-red-400'
    case 'finishing': return 'text-sky-400'
    case 'offline': return 'text-slate-500'
    default: return 'text-slate-400'
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'printing': return 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
    case 'paused': return 'bg-amber-500/15 text-amber-400 ring-amber-500/30'
    case 'error': return 'bg-red-500/15 text-red-400 ring-red-500/30'
    case 'finishing': return 'bg-sky-500/15 text-sky-400 ring-sky-500/30'
    case 'connecting': return 'bg-violet-500/15 text-violet-400 ring-violet-500/30'
    case 'offline': return 'bg-slate-700/50 text-slate-500 ring-slate-600/30'
    default: return 'bg-slate-700/50 text-slate-400 ring-slate-600/30'
  }
}

export function jobStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-500/15 text-amber-400 ring-amber-500/30'
    case 'dispatched': return 'bg-violet-500/15 text-violet-400 ring-violet-500/30'
    case 'done': return 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
    case 'failed': return 'bg-red-500/15 text-red-400 ring-red-500/30'
    default: return 'bg-slate-700/50 text-slate-400 ring-slate-600/30'
  }
}
