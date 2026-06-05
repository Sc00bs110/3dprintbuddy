import { useTranslation } from 'react-i18next'
import {
  Thermometer,
  Layers,
  Clock,
  Pause,
  Play,
  X,
  Camera,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { Printer, PrinterState, PrinterCapabilities } from '@/types/printer'
import { formatSeconds, formatTemp, statusBadgeClass } from '@/utils/format'

interface Props {
  printer: Printer
  state: PrinterState | undefined
  capabilities: PrinterCapabilities | undefined
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onCamera: () => void
}

export default function PrinterCard({ printer, state, capabilities, onPause, onResume, onCancel, onCamera }: Props) {
  const { t } = useTranslation()
  const status = state?.status ?? 'offline'
  const isPrinting = status === 'printing'
  const isPaused = status === 'paused'
  const isActive = isPrinting || isPaused || status === 'finishing'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 truncate">{printer.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{printer.adapter_id}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(status)}`}>
            {status === 'offline'
              ? <WifiOff className="h-3 w-3 mr-1" />
              : <Wifi className="h-3 w-3 mr-1" />}
            {t(`printer.status.${status}`, { defaultValue: status })}
          </span>
        </div>
      </div>

      {/* Job info */}
      {state?.job_name && (
        <div className="text-sm text-slate-300 truncate">
          <span className="text-slate-500 text-xs mr-1.5">{t('printer.info.job')}</span>
          {state.job_name}
        </div>
      )}

      {/* Progress bar */}
      {isActive && state?.progress_pct !== null && state?.progress_pct !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{t('printer.info.progress')}</span>
            <span>{state.progress_pct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${state.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      {state && status !== 'offline' && (
        <div className="grid grid-cols-2 gap-2">
          {/* Nozzle temp */}
          {state.nozzle_temp_c !== null && (
            <Stat
              icon={<Thermometer className="h-3.5 w-3.5 text-orange-400" />}
              label={t('printer.info.nozzle')}
              value={formatTemp(state.nozzle_temp_c, state.nozzle_target_c)}
            />
          )}
          {/* Bed temp */}
          {state.bed_temp_c !== null && (
            <Stat
              icon={<Thermometer className="h-3.5 w-3.5 text-blue-400" />}
              label={t('printer.info.bed')}
              value={formatTemp(state.bed_temp_c, state.bed_target_c)}
            />
          )}
          {/* Layer info */}
          {capabilities?.layer_info && state.current_layer !== null && state.total_layers !== null && (
            <Stat
              icon={<Layers className="h-3.5 w-3.5 text-violet-400" />}
              label={t('printer.info.layer')}
              value={`${state.current_layer} / ${state.total_layers}`}
            />
          )}
          {/* Time remaining */}
          {isActive && state.time_remaining_s !== null && (
            <Stat
              icon={<Clock className="h-3.5 w-3.5 text-slate-400" />}
              label={t('printer.info.timeRemaining')}
              value={formatSeconds(state.time_remaining_s)}
            />
          )}
          {/* Chamber temp */}
          {capabilities?.chamber_temp && state.chamber_temp_c !== null && (
            <Stat
              icon={<Thermometer className="h-3.5 w-3.5 text-emerald-400" />}
              label={t('printer.info.chamber')}
              value={formatTemp(state.chamber_temp_c, null)}
            />
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && state?.error_message && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{state.error_message}</span>
        </div>
      )}

      {/* Controls */}
      {(isActive || capabilities?.camera) && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          {isPrinting && capabilities?.pause_resume && (
            <ControlBtn onClick={onPause} icon={<Pause className="h-3.5 w-3.5" />} label={t('printer.controls.pause')} />
          )}
          {isPaused && capabilities?.pause_resume && (
            <ControlBtn onClick={onResume} icon={<Play className="h-3.5 w-3.5" />} label={t('printer.controls.resume')} variant="primary" />
          )}
          {isActive && (
            <ControlBtn onClick={onCancel} icon={<X className="h-3.5 w-3.5" />} label={t('printer.controls.cancel')} variant="danger" />
          )}
          {capabilities?.camera && (
            <ControlBtn onClick={onCamera} icon={<Camera className="h-3.5 w-3.5" />} label={t('printer.controls.camera')} className="ml-auto" />
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/50 px-2.5 py-2">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-xs font-medium text-slate-200 truncate">{value}</p>
      </div>
    </div>
  )
}

function ControlBtn({
  onClick,
  icon,
  label,
  variant = 'default',
  className = '',
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'primary' | 'danger'
  className?: string
}) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors'
  const variants = {
    default: 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100',
    primary: 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30',
    danger: 'bg-red-600/15 text-red-400 hover:bg-red-600/25',
  }
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {icon}
      {label}
    </button>
  )
}
