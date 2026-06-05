"""
Bambu Lab adapter — MQTT over TLS + FTPS for file transfer.

Protocol (reverse-engineered — no official docs):
  - MQTT broker at <ip>:8883 with TLS (skip verify), credentials: bblp/<access_code>
  - Subscribe to device/<serial>/report for status pushes
  - Publish to device/<serial>/request for commands
  - File upload via FTPS on port 990 (credentials: bblp/<access_code>)

References: BambuBuddy (https://github.com/maziggy/bambuddy) services/bambu_mqtt.py
            and services/bambu_ftp.py for protocol details.
"""

from __future__ import annotations

import asyncio
import json
import logging
import ssl
from pathlib import Path
from typing import Any

from ..base.adapter import (
    DiscoveredPrinter,
    MaterialSlot,
    PrinterAdapter,
    PrinterCapabilities,
    PrinterState,
    PrinterStatus,
)

logger = logging.getLogger(__name__)

# Bambu AMS state integers → normalized status
_BAMBU_GCODE_STATE: dict[str, PrinterStatus] = {
    "IDLE": PrinterStatus.IDLE,
    "PREPARE": PrinterStatus.PRINTING,
    "RUNNING": PrinterStatus.PRINTING,
    "PAUSE": PrinterStatus.PAUSED,
    "FINISH": PrinterStatus.IDLE,
    "FAILED": PrinterStatus.ERROR,
}


class BambuAdapter(PrinterAdapter):
    ADAPTER_ID = "bambu"
    DISPLAY_NAME = "Bambu Lab"

    def __init__(self, printer_id: int, config: dict[str, Any], event_callback: Any) -> None:
        super().__init__(printer_id, config, event_callback)
        self._ip: str = config["ip_address"]
        self._serial: str = config["serial"]
        self._access_code: str = config["access_code"]
        self._mqtt_client: Any = None
        self._loop: asyncio.AbstractEventLoop | None = None

    @classmethod
    def capabilities(cls) -> PrinterCapabilities:
        return PrinterCapabilities(
            multi_material=True,
            camera=True,
            camera_rtsp=True,
            pause_resume=True,
            estimated_time=True,
            layer_info=True,
            chamber_temp=True,
            enclosure_light=True,
            remote_upload=True,
        )

    @classmethod
    def config_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "ip_address": {"type": "string", "title": "IP Address"},
                "serial": {"type": "string", "title": "Printer Serial Number"},
                "access_code": {"type": "string", "title": "Access Code", "format": "password"},
            },
            "required": ["ip_address", "serial", "access_code"],
        }

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    async def connect(self) -> None:
        try:
            import paho.mqtt.client as mqtt  # type: ignore[import]
        except ImportError as e:
            raise RuntimeError("paho-mqtt package required: pip install paho-mqtt") from e

        self._loop = asyncio.get_running_loop()

        tls_ctx = ssl.create_default_context()
        tls_ctx.check_hostname = False
        tls_ctx.verify_mode = ssl.CERT_NONE

        # paho-mqtt 2.x requires explicit callback API version
        try:
            client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
                client_id=f"3dprintbuddy_{self.printer_id}",
                protocol=mqtt.MQTTv311,
            )
        except AttributeError:
            # paho-mqtt 1.x fallback
            client = mqtt.Client(client_id=f"3dprintbuddy_{self.printer_id}", protocol=mqtt.MQTTv311)

        client.username_pw_set("bblp", self._access_code)
        client.tls_set_context(tls_ctx)
        client.on_connect = self._on_connect
        client.on_message = self._on_message
        client.on_disconnect = self._on_disconnect

        self._mqtt_client = client
        await self._loop.run_in_executor(None, lambda: client.connect(self._ip, 8883, keepalive=60))
        client.loop_start()
        self._connected = True
        logger.info("[Bambu:%d] MQTT loop started for %s", self.printer_id, self._ip)

    async def disconnect(self) -> None:
        self._connected = False
        if self._mqtt_client:
            self._mqtt_client.loop_stop()
            self._mqtt_client.disconnect()
        logger.info("[Bambu:%d] Disconnected", self.printer_id)

    def _on_connect(self, client: Any, _userdata: Any, _flags: Any, rc: int) -> None:
        if rc == 0:
            topic = f"device/{self._serial}/report"
            client.subscribe(topic)
            logger.info("[Bambu:%d] Subscribed to %s", self.printer_id, topic)
            # Request an immediate status push from the printer
            self._publish({"command": "push_status"})
        else:
            logger.error("[Bambu:%d] MQTT connect failed, rc=%d", self.printer_id, rc)
            if self._loop:
                asyncio.run_coroutine_threadsafe(
                    self._emit(PrinterState(status=PrinterStatus.OFFLINE, error_message=f"MQTT auth failed (rc={rc})")),
                    self._loop,
                )

    def _on_disconnect(self, _client: Any, _userdata: Any, rc: int) -> None:
        logger.warning("[Bambu:%d] MQTT disconnected rc=%d", self.printer_id, rc)
        self._connected = False
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._emit(PrinterState(status=PrinterStatus.OFFLINE)),
                self._loop,
            )

    def _on_message(self, _client: Any, _userdata: Any, msg: Any) -> None:
        try:
            payload = json.loads(msg.payload.decode())
            state = self._parse_status(payload)
            if self._loop:
                asyncio.run_coroutine_threadsafe(self._emit(state), self._loop)
        except Exception:
            logger.exception("[Bambu:%d] Error parsing MQTT message", self.printer_id)

    # ------------------------------------------------------------------
    # State parsing
    # ------------------------------------------------------------------

    def _parse_status(self, payload: dict) -> PrinterState:
        print_data = payload.get("print", {})

        gcode_state = print_data.get("gcode_state", "IDLE")
        status = _BAMBU_GCODE_STATE.get(gcode_state, PrinterStatus.IDLE)

        # AMS material slots
        slots: list[MaterialSlot] = []
        for ams in print_data.get("ams", {}).get("ams", []):
            for tray in ams.get("tray", []):
                slots.append(MaterialSlot(
                    slot_index=tray.get("id", 0),
                    material_type=tray.get("tray_type"),
                    color_hex=tray.get("tray_color"),
                    brand=tray.get("tray_sub_brands"),
                    remaining_pct=tray.get("remain"),
                ))

        mc_remaining = print_data.get("mc_remaining_time")
        mc_percent = print_data.get("mc_percent")

        return PrinterState(
            status=status,
            job_name=print_data.get("subtask_name"),
            progress_pct=float(mc_percent) if mc_percent is not None else None,
            time_elapsed_s=None,
            time_remaining_s=int(mc_remaining) * 60 if mc_remaining else None,
            current_layer=print_data.get("layer_num"),
            total_layers=print_data.get("total_layer_num"),
            nozzle_temp_c=print_data.get("nozzle_temper"),
            nozzle_target_c=print_data.get("nozzle_target_temper"),
            bed_temp_c=print_data.get("bed_temper"),
            bed_target_c=print_data.get("bed_target_temper"),
            chamber_temp_c=print_data.get("chamber_temper"),
            material_slots=slots,
            raw=payload,
        )

    # ------------------------------------------------------------------
    # Job control (MQTT commands)
    # ------------------------------------------------------------------

    def _publish(self, command: dict) -> None:
        topic = f"device/{self._serial}/request"
        self._mqtt_client.publish(topic, json.dumps({"print": command}))

    async def get_status(self) -> PrinterState:
        self._publish({"command": "push_status"})
        await asyncio.sleep(0.5)
        return PrinterState(status=PrinterStatus.CONNECTING)

    async def upload_file(self, file_path: Path, filename: str) -> str:
        import aioftp  # type: ignore[import]
        async with aioftp.Client.context(
            self._ip, port=990, user="bblp", password=self._access_code,
            ssl=ssl.create_default_context(),
        ) as ftp:
            await ftp.upload(file_path, f"/{filename}")
        return filename

    async def start_job(self, printer_filename: str, plate_index: int = 0) -> None:
        self._publish({"command": "project_file", "param": f"Metadata/plate_{plate_index + 1}.gcode"})

    async def pause_job(self) -> None:
        self._publish({"command": "pause"})

    async def resume_job(self) -> None:
        self._publish({"command": "resume"})

    async def cancel_job(self) -> None:
        self._publish({"command": "stop"})

    async def get_camera_url(self) -> str | None:
        return f"rtsps://bblp:{self._access_code}@{self._ip}/streaming/live/1"

    async def set_enclosure_light(self, on: bool) -> None:
        self._publish({"command": "set_chamber_light", "led_mode": "on" if on else "off"})

    # ------------------------------------------------------------------
    # Discovery (Bambu uses SSDP/mDNS — simplified UDP scan here)
    # ------------------------------------------------------------------

    @classmethod
    async def discover(cls) -> list[DiscoveredPrinter]:
        # Bambu printers announce via SSDP on port 1990.
        # Full implementation requires SSDP M-SEARCH; returning empty for now.
        # TODO: implement SSDP discovery matching BambuBuddy's discovery service.
        return []
