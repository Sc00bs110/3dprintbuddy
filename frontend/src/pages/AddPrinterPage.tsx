import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronLeft, Loader2, Check, Scan } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useAdapters, useAddPrinter } from '@/hooks/usePrinters'
import { api } from '@/api/client'
import type { AdapterInfo, DiscoveredPrinter } from '@/types/printer'

type Step = 'adapter' | 'configure' | 'name'

export default function AddPrinterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: adapters = [], isLoading } = useAdapters()
  const addPrinter = useAddPrinter()

  const [step, setStep] = useState<Step>('adapter')
  const [selectedAdapter, setSelectedAdapter] = useState<AdapterInfo | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [printerName, setPrinterName] = useState('')
  const [discovered, setDiscovered] = useState<DiscoveredPrinter[]>([])
  const [discovering, setDiscovering] = useState(false)

  async function handleDiscover() {
    setDiscovering(true)
    try {
      const results = await api.adapters.discover()
      setDiscovered(results)
    } catch {
      setDiscovered([])
    } finally {
      setDiscovering(false)
    }
  }

  function selectDiscovered(d: DiscoveredPrinter) {
    const adapter = adapters.find((a) => a.id === d.adapter_id)
    if (adapter) setSelectedAdapter(adapter)
    setConfig({ ip_address: d.ip_address, ...(d.serial ? { serial: d.serial } : {}) })
    setPrinterName(d.name)
    setStep('name')
  }

  async function handleSave() {
    if (!selectedAdapter || !printerName.trim()) return
    await addPrinter.mutateAsync({
      name: printerName.trim(),
      adapter_id: selectedAdapter.id,
      config,
    })
    navigate('/printers')
  }

  const schema = selectedAdapter?.config_schema as {
    properties?: Record<string, { title?: string; type?: string; format?: string; default?: unknown }>
    required?: string[]
  } | undefined

  return (
    <div className="min-h-full">
      <PageHeader title={t('addPrinter.title')} />

      <div className="p-6 max-w-3xl">
        {/* Steps */}
        <StepIndicator current={step} />

        <div className="mt-8 space-y-6">
          {/* Step 1: Choose adapter */}
          {step === 'adapter' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">{t('addPrinter.selectAdapter')}</p>

              {/* Network scan */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDiscover}
                  disabled={discovering}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-60"
                >
                  {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                  {discovering ? t('addPrinter.discovering') : t('addPrinter.discover')}
                </button>
              </div>

              {/* Discovered printers */}
              {discovered.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('addPrinter.discoveredPrinters')}</p>
                  {discovered.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => selectDiscovered(d)}
                      className="w-full text-left rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-200">{d.name}</p>
                      <p className="text-xs text-slate-500">{d.ip_address} · {d.model ?? d.adapter_id}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('addPrinter.useManual')}</p>
                {isLoading ? (
                  <p className="text-sm text-slate-500">{t('common.loading')}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {adapters.map((adapter) => (
                      <AdapterOption
                        key={adapter.id}
                        adapter={adapter}
                        selected={selectedAdapter?.id === adapter.id}
                        onClick={() => { setSelectedAdapter(adapter); setConfig({}) }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <NextBtn disabled={!selectedAdapter} onClick={() => setStep('configure')} label={t('addPrinter.next')} />
              </div>
            </div>
          )}

          {/* Step 2: Configure connection */}
          {step === 'configure' && selectedAdapter && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Configure <span className="text-slate-200 font-medium">{selectedAdapter.display_name}</span> connection</p>
              <div className="space-y-3">
                {schema?.properties && Object.entries(schema.properties).map(([key, field]) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-slate-400 mb-1 block">
                      {field.title ?? key}
                      {schema.required?.includes(key) && <span className="text-red-400 ml-1">*</span>}
                    </span>
                    <input
                      type={field.format === 'password' ? 'password' : 'text'}
                      value={config[key] ?? ''}
                      onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                      placeholder={String(field.default ?? '')}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-between">
                <BackBtn onClick={() => setStep('adapter')} label={t('addPrinter.back')} />
                <NextBtn onClick={() => setStep('name')} label={t('addPrinter.next')} />
              </div>
            </div>
          )}

          {/* Step 3: Name & save */}
          {step === 'name' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-slate-400 mb-1 block">{t('addPrinter.printerName')}</span>
                <input
                  type="text"
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  placeholder={t('addPrinter.printerNamePlaceholder')}
                  autoFocus
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </label>
              <div className="flex justify-between">
                <BackBtn onClick={() => setStep('configure')} label={t('addPrinter.back')} />
                <button
                  onClick={handleSave}
                  disabled={!printerName.trim() || addPrinter.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-60"
                >
                  {addPrinter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {addPrinter.isPending ? t('addPrinter.saving') : t('addPrinter.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdapterOption({ adapter, selected, onClick }: { adapter: AdapterInfo; selected: boolean; onClick: () => void }) {
  const caps = adapter.capabilities
  const { t } = useTranslation()
  const capLabels = Object.entries({
    multi_material: caps.multi_material,
    camera: caps.camera,
    layer_info: caps.layer_info,
    chamber_temp: caps.chamber_temp,
  }).filter(([, v]) => v).map(([k]) => t(`addPrinter.capabilities.${k}`, { defaultValue: k }))

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
        selected
          ? 'border-violet-500/60 bg-violet-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-200">{adapter.display_name}</p>
        {selected && <Check className="h-4 w-4 text-violet-400" />}
      </div>
      {capLabels.length > 0 && (
        <p className="text-xs text-slate-500 mt-0.5">{capLabels.join(' · ')}</p>
      )}
    </button>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation()
  const steps: { key: Step; label: string }[] = [
    { key: 'adapter', label: t('addPrinter.step1') },
    { key: 'configure', label: t('addPrinter.step2') },
    { key: 'name', label: t('addPrinter.step3') },
  ]
  const currentIndex = steps.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold shrink-0 ${i <= currentIndex ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
            {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {/* Only show label for active step */}
          {i === currentIndex && (
            <span className="text-sm text-slate-200 font-medium">{step.label}</span>
          )}
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />}
        </div>
      ))}
    </div>
  )
}

function NextBtn({ onClick, disabled = false, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-60"
    >
      {label} <ChevronRight className="h-4 w-4" />
    </button>
  )
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
  )
}
