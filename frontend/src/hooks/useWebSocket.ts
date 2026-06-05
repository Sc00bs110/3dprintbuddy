import { useEffect, useRef } from 'react'
import { usePrinterStore } from '@/store/printerStore'
import type { PrinterState } from '@/types/printer'

interface WsMessage {
  type: string
  printer_id: number
  state: PrinterState
}

export function useWebSocket() {
  const setprinterState = usePrinterStore((s) => s.setprinterState)
  const ws = useRef<WebSocket | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
      const socket = new WebSocket(`${protocol}://${location.host}/api/v1/ws`)
      ws.current = socket

      socket.onmessage = (ev) => {
        try {
          const msg: WsMessage = JSON.parse(ev.data)
          if (msg.type === 'printer_state') {
            setprinterState(msg.printer_id, msg.state)
          }
        } catch {
          // ignore malformed messages
        }
      }

      socket.onclose = () => {
        retryTimer.current = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      ws.current?.close()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [setprinterState])
}
