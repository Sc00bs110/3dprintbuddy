export type PrinterStatus =
  | 'idle'
  | 'printing'
  | 'paused'
  | 'error'
  | 'offline'
  | 'connecting'
  | 'finishing'

export interface MaterialSlot {
  slot_index: number
  material_type: string | null
  color_hex: string | null
  brand: string | null
  remaining_pct: number | null
}

export interface PrinterState {
  status: PrinterStatus
  job_name: string | null
  progress_pct: number | null
  time_elapsed_s: number | null
  time_remaining_s: number | null
  current_layer: number | null
  total_layers: number | null
  nozzle_temp_c: number | null
  nozzle_target_c: number | null
  bed_temp_c: number | null
  bed_target_c: number | null
  chamber_temp_c: number | null
  material_slots: MaterialSlot[]
  error_message: string | null
}

export interface PrinterCapabilities {
  multi_material: boolean
  camera: boolean
  camera_rtsp: boolean
  pause_resume: boolean
  estimated_time: boolean
  layer_info: boolean
  chamber_temp: boolean
  enclosure_light: boolean
  remote_upload: boolean
}

export interface Printer {
  id: number
  name: string
  adapter_id: string
  config: Record<string, unknown>
  enabled: boolean
}

export interface AdapterInfo {
  id: string
  display_name: string
  capabilities: PrinterCapabilities
  config_schema: Record<string, unknown>
}

export interface DiscoveredPrinter {
  adapter_id: string
  name: string
  model: string | null
  ip_address: string
  port: number | null
  serial: string | null
}

// Live state keyed by printer id — maintained by useWebSocket
export type PrinterStateMap = Record<number, PrinterState>
