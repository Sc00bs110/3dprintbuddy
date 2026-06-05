"""
Snapmaker U1 adapter — communicates via Moonraker (Klipper's API layer).

Protocol:
  - WebSocket at ws://<ip>/websocket  (JSON-RPC 2.0, real-time push)
  - HTTP REST at http://<ip>/         (file upload, one-off commands)
  - mDNS discovery (_moonraker._tcp)

Moonraker docs: https://moonraker.readthedocs.io/en/latest/web_api/
Snapmaker fork:  https://github.com/Snapmaker/u1-moonraker
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any

from ..base.adapter import (
    DiscoveredPrinter,
    PrinterAdapter,
    PrinterCapabilities,
    PrinterState,
    PrinterStatus,
)

logger = logging.getLogger(__name__)


class SnapmakerU1Adapter(PrinterAdapter):
    ADAPTER_ID = "snapmaker_u1"
    DISPLAY_NAME = "Snapmaker U1"

    def __init__(self, printer_id: int, config: dict[str, Any], event_callback: Any) -> None:
        super().__init__(printer_id, config, event_callback)
        self._ip: str = config["ip_address"]
        self._port: int = int(config.get("port", 80))
        self._ws: Any = None           # websockets.WebSocketClientProtocol
        self._rpc_id = 0
        self._listen_task: asyncio.Task | None = None

    @classmethod
    def capabilities(cls) -> PrinterCapabilities:
        return PrinterCapabilities(
            multi_material=False,
            camera=True,
            camera_rtsp=False,       # Moonraker webcam is MJPEG
            pause_resume=True,
            estimated_time=True,
            layer_info=True,
            chamber_temp=False,
            enclosure_light=False,
            remote_upload=True,
        )

    @classmethod
    def config_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "ip_address": {"type": "string", "title": "IP Address"},
                "port": {"type": "integer", "title": "Port", "default": 80},
            },
            "required": ["ip_address"],
        }

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        try:
            import websockets  # type: ignore[import]
        except ImportError as e:
            raise RuntimeError("websockets package required: pip install websockets") from e

        uri = f"ws://{self._ip}:{self._port}/websocket"
        logger.info("[U1:%d] Connecting to %s", self.printer_id, uri)
        self._ws = await websockets.connect(uri)
        self._connected = True

        # Subscribe to the objects we care about
        await self._subscribe()

        # Emit initial state immediately via HTTP so the card populates at once
        try:
            initial = await self.get_status()
            await self._emit(initial)
        except Exception:
            logger.warning("[U1:%d] Could not fetch initial status", self.printer_id)

        self._listen_task = asyncio.create_task(self._listen_loop())
        logger.info("[U1:%d] Connected", self.printer_id)

    async def disconnect(self) -> None:
        self._connected = False
        if self._listen_task:
            self._listen_task.cancel()
        if self._ws:
            await self._ws.close()
        logger.info("[U1:%d] Disconnected", self.printer_id)

    # ------------------------------------------------------------------
    # Moonraker JSON-RPC helpers
    # ------------------------------------------------------------------

    async def _rpc(self, method: str, params: dict | None = None) -> Any:
        self._rpc_id += 1
        msg = {"jsonrpc": "2.0", "method": method, "id": self._rpc_id}
        if params:
            msg["params"] = params
        await self._ws.send(json.dumps(msg))
        # Simple request/response — for subscriptions we use _listen_loop
        raw = await self._ws.recv()
        data = json.loads(raw)
        if "error" in data:
            raise RuntimeError(f"Moonraker RPC error: {data['error']}")
        return data.get("result")

    async def _subscribe(self) -> None:
        """Subscribe to printer object updates via printer.objects.subscribe."""
        await self._rpc("printer.objects.subscribe", {
            "objects": {
                "print_stats": None,        # job name, state, layer info
                "virtual_sdcard": None,     # progress, file position
                "extruder": None,           # nozzle temps
                "heater_bed": None,         # bed temps
                "display_status": None,     # progress message
            }
        })

    async def _listen_loop(self) -> None:
        """Receive push updates from Moonraker and emit normalized state."""
        try:
            async for raw in self._ws:
                try:
                    msg = json.loads(raw)
                    if msg.get("method") == "notify_status_update":
                        state = self._parse_status(msg["params"][0])
                        await self._emit(state)
                except Exception:
                    logger.exception("[U1:%d] Error parsing message", self.printer_id)
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("[U1:%d] WebSocket connection lost", self.printer_id)
            self._connected = False

    # ------------------------------------------------------------------
    # State parsing
    # ------------------------------------------------------------------

    def _parse_status(self, data: dict) -> PrinterState:
        ps = data.get("print_stats", {})
        vsd = data.get("virtual_sdcard", {})
        extruder = data.get("extruder", {})
        bed = data.get("heater_bed", {})

        klipper_state = ps.get("state", "standby")
        status_map = {
            "standby": PrinterStatus.IDLE,
            "printing": PrinterStatus.PRINTING,
            "paused": PrinterStatus.PAUSED,
            "complete": PrinterStatus.IDLE,
            "cancelled": PrinterStatus.IDLE,
            "error": PrinterStatus.ERROR,
        }
        status = status_map.get(klipper_state, PrinterStatus.IDLE)

        progress = vsd.get("progress")
        progress_pct = round(progress * 100, 1) if progress is not None else None

        return PrinterState(
            status=status,
            job_name=ps.get("filename"),
            progress_pct=progress_pct,
            time_elapsed_s=int(ps.get("print_duration", 0)) or None,
            time_remaining_s=None,   # Moonraker doesn't push ETA; calculate from progress
            current_layer=ps.get("info", {}).get("current_layer") or ps.get("current_layer"),
            total_layers=ps.get("info", {}).get("total_layer") or ps.get("total_layer"),
            nozzle_temp_c=extruder.get("temperature"),
            nozzle_target_c=extruder.get("target"),
            bed_temp_c=bed.get("temperature"),
            bed_target_c=bed.get("target"),
            error_message=ps.get("message") if klipper_state == "error" else None,
            raw=data,
        )

    # ------------------------------------------------------------------
    # Job control
    # ------------------------------------------------------------------

    async def get_status(self) -> PrinterState:
        """Query current state via HTTP (reliable one-shot, no WS dependency)."""
        import httpx  # type: ignore[import]
        url = (
            f"http://{self._ip}:{self._port}/printer/objects/query"
            "?print_stats&virtual_sdcard&extruder&heater_bed"
        )
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        return self._parse_status(data.get("result", {}).get("status", {}))

    async def upload_file(self, file_path: Path, filename: str) -> str:
        import httpx  # type: ignore[import]
        url = f"http://{self._ip}:{self._port}/server/files/upload"
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                response = await client.post(url, files={"file": (filename, f)})
        response.raise_for_status()
        return response.json().get("item", {}).get("path", filename)

    async def start_job(self, printer_filename: str, plate_index: int = 0) -> None:
        await self._rpc("printer.print.start", {"filename": printer_filename})

    async def pause_job(self) -> None:
        await self._rpc("printer.print.pause")

    async def resume_job(self) -> None:
        await self._rpc("printer.print.resume")

    async def cancel_job(self) -> None:
        await self._rpc("printer.print.cancel")

    async def get_camera_url(self) -> str | None:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                r = await client.get(f"http://{self._ip}:{self._port}/webcam/")
                if r.status_code == 200:
                    return f"http://{self._ip}:{self._port}/webcam/?action=stream"
        except Exception:
            pass
        return None

    # ------------------------------------------------------------------
    # Discovery (mDNS)
    # ------------------------------------------------------------------

    @classmethod
    async def discover(cls) -> list[DiscoveredPrinter]:
        try:
            from zeroconf import ServiceBrowser, Zeroconf  # type: ignore[import]
            from zeroconf.asyncio import AsyncZeroconf
        except ImportError:
            logger.warning("zeroconf package not installed — Snapmaker U1 mDNS discovery unavailable")
            return []

        found: list[DiscoveredPrinter] = []
        azc = AsyncZeroconf()

        class Listener:
            def add_service(self, zc: Any, type_: str, name: str) -> None:
                info = zc.get_service_info(type_, name)
                if info and info.parsed_addresses():
                    found.append(DiscoveredPrinter(
                        adapter_id=cls.ADAPTER_ID,
                        name=name.replace(f".{type_}", ""),
                        model="Snapmaker U1",
                        ip_address=info.parsed_addresses()[0],
                        port=info.port,
                    ))
            def remove_service(self, *_: Any) -> None: pass
            def update_service(self, *_: Any) -> None: pass

        browser = ServiceBrowser(azc.zeroconf, "_moonraker._tcp.local.", Listener())
        await asyncio.sleep(3)
        await azc.async_close()
        return found
