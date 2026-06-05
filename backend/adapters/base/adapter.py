"""
PrinterAdapter — the plugin contract every adapter must implement.

Each adapter is a Python package that:
  1. Subclasses PrinterAdapter
  2. Registers itself via the entry point group "threedprintbuddy.adapters"
     e.g. in pyproject.toml:
       [project.entry-points."threedprintbuddy.adapters"]
       bambu = "threedprintbuddy_adapter_bambu:BambuAdapter"

Core never imports adapter modules directly — it discovers them at startup
via importlib.metadata.entry_points().
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, AsyncIterator

if TYPE_CHECKING:
    from pathlib import Path


class PrinterStatus(str, Enum):
    IDLE = "idle"
    PRINTING = "printing"
    PAUSED = "paused"
    ERROR = "error"
    OFFLINE = "offline"
    CONNECTING = "connecting"
    FINISHING = "finishing"


@dataclass
class MaterialSlot:
    """Represents one filament/material slot (AMS tray, spool holder, etc.)."""
    slot_index: int
    material_type: str | None = None  # e.g. "PLA", "PETG"
    color_hex: str | None = None      # e.g. "FF0000"
    brand: str | None = None
    remaining_pct: float | None = None


@dataclass
class ToolHead:
    """Temperature state for one tool head / nozzle."""
    index: int
    temp_c: float | None = None
    target_c: float | None = None
    active: bool = False   # currently extruding / selected


@dataclass
class PrinterCapabilities:
    """Declare what this printer/adapter supports so the UI renders correctly."""
    multi_material: bool = False       # Has AMS / multi-spool system
    camera: bool = False               # Can stream camera
    camera_rtsp: bool = False          # RTSP stream (vs MJPEG)
    pause_resume: bool = True
    estimated_time: bool = True
    layer_info: bool = False           # Reports current/total layer
    chamber_temp: bool = False
    enclosure_light: bool = False
    remote_upload: bool = True
    scheduled_print: bool = True


@dataclass
class PrinterState:
    """
    Normalized printer state. All adapters translate their native format here.
    Core and frontend only ever read this — never adapter-native structures.
    """
    status: PrinterStatus = PrinterStatus.OFFLINE
    job_name: str | None = None
    progress_pct: float | None = None       # 0.0–100.0
    time_elapsed_s: int | None = None
    time_remaining_s: int | None = None
    current_layer: int | None = None
    total_layers: int | None = None
    nozzle_temp_c: float | None = None      # primary nozzle (T0 or active head)
    nozzle_target_c: float | None = None
    bed_temp_c: float | None = None
    bed_target_c: float | None = None
    chamber_temp_c: float | None = None
    tool_heads: list[ToolHead] = field(default_factory=list)   # all tool heads if multi-head
    material_slots: list[MaterialSlot] = field(default_factory=list)
    error_message: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)   # adapter-native payload for debugging


@dataclass
class DiscoveredPrinter:
    """A printer found on the local network by an adapter's discovery scan."""
    adapter_id: str          # e.g. "bambu", "snapmaker_u1"
    name: str
    model: str | None
    ip_address: str
    port: int | None = None
    serial: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


class PrinterAdapter(ABC):
    """
    Base class for all printer adapters.

    Lifecycle:
      1. __init__(config: dict)  — called with the stored printer config
      2. connect()               — establish connection to printer
      3. [state events via event_callback]
      4. disconnect()            — clean up

    Adapters must not block the event loop. All I/O must be async.
    """

    #: Unique identifier for this adapter. Must match the entry point key.
    ADAPTER_ID: str = ""

    #: Human-readable brand/model name shown in the UI.
    DISPLAY_NAME: str = ""

    def __init__(self, printer_id: int, config: dict[str, Any], event_callback: Any) -> None:
        """
        Args:
            printer_id: DB primary key of the printer record.
            config: Stored connection config (IP, access code, etc.) — adapter-defined schema.
            event_callback: Async callable — adapter calls this with (printer_id, PrinterState)
                            whenever state changes. Core broadcasts it to WebSocket clients.
        """
        self.printer_id = printer_id
        self.config = config
        self._event_callback = event_callback
        self._connected = False

    # ------------------------------------------------------------------
    # Required — must implement
    # ------------------------------------------------------------------

    @classmethod
    @abstractmethod
    def capabilities(cls) -> PrinterCapabilities:
        """Return static capability flags for this adapter/model."""

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection. Raise on failure."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Tear down connection cleanly."""

    @abstractmethod
    async def get_status(self) -> PrinterState:
        """Return current printer state (poll-based fallback; push via event_callback preferred)."""

    @abstractmethod
    async def upload_file(self, file_path: Path, filename: str) -> str:
        """
        Upload a file to the printer's local storage.
        Returns the printer-side filename/path.
        """

    @abstractmethod
    async def start_job(self, printer_filename: str, plate_index: int = 0) -> None:
        """Start printing the given file."""

    @abstractmethod
    async def pause_job(self) -> None:
        """Pause the current print."""

    @abstractmethod
    async def resume_job(self) -> None:
        """Resume a paused print."""

    @abstractmethod
    async def cancel_job(self) -> None:
        """Cancel the current print."""

    # ------------------------------------------------------------------
    # Optional — override to enable
    # ------------------------------------------------------------------

    @classmethod
    async def discover(cls) -> list[DiscoveredPrinter]:
        """Scan the local network for printers of this type. Return empty list if unsupported."""
        return []

    async def get_camera_url(self) -> str | None:
        """Return a streamable camera URL (RTSP or MJPEG), or None if unsupported."""
        return None

    async def set_enclosure_light(self, on: bool) -> None:
        """Toggle enclosure light. No-op if unsupported."""

    @classmethod
    def config_schema(cls) -> dict[str, Any]:
        """
        JSON Schema for the adapter's config dict. Used to render the
        "Add Printer" form in the UI. Override to provide field definitions.
        """
        return {
            "type": "object",
            "properties": {
                "ip_address": {"type": "string", "title": "IP Address"},
            },
            "required": ["ip_address"],
        }

    # ------------------------------------------------------------------
    # Helpers for subclasses
    # ------------------------------------------------------------------

    async def _emit(self, state: PrinterState) -> None:
        """Push a state update to core. Call this whenever printer state changes."""
        if asyncio.iscoroutinefunction(self._event_callback):
            await self._event_callback(self.printer_id, state)
        else:
            self._event_callback(self.printer_id, state)

    @property
    def is_connected(self) -> bool:
        return self._connected
