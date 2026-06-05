export interface LibraryFile {
  id: number
  filename: string
  original_name: string
  file_type: string
  size_bytes: number
  created_at: string
}

export interface QueueJob {
  id: number
  printer_id: number
  file_id: number
  status: 'pending' | 'dispatched' | 'done' | 'failed'
  plate_index: number
  created_at: string
  original_name: string | null
  printer_name: string | null
}
