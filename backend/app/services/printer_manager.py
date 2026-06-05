"""
PrinterManager — owns the lifecycle of all active printer adapter instances.

At startup it loads all Printer rows from the DB, instantiates the correct
adapter via the registry, calls connect(), and keeps them alive.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select

from ..core.database import async_session
from ..core.websocket import ws_manager
from ..models.printer import Printer
from ...adapters.base.adapter import PrinterState
from ...adapters.base.registry import get_adapter

logger = logging.getLogger(__name__)


class PrinterManager:
    def __init__(self) -> None:
        self._adapters: dict[int, Any] = {}   # printer_id → PrinterAdapter instance

    async def start(self) -> None:
        async with async_session() as session:
            result = await session.execute(select(Printer).where(Printer.enabled == True))
            printers = result.scalars().all()

        for printer in printers:
            await self._connect_printer(printer)

    async def stop(self) -> None:
        for adapter in self._adapters.values():
            try:
                await adapter.disconnect()
            except Exception:
                logger.exception("Error disconnecting adapter")
        self._adapters.clear()

    async def _connect_printer(self, printer: Printer) -> None:
        try:
            adapter_cls = get_adapter(printer.adapter_id)
        except KeyError:
            logger.error("No adapter '%s' found for printer %d (%s)", printer.adapter_id, printer.id, printer.name)
            return

        adapter = adapter_cls(
            printer_id=printer.id,
            config=printer.config,
            event_callback=self._on_state_update,
        )
        self._adapters[printer.id] = adapter

        try:
            await adapter.connect()
        except Exception:
            logger.exception("Failed to connect printer %d (%s)", printer.id, printer.name)

    async def _on_state_update(self, printer_id: int, state: PrinterState) -> None:
        """Called by adapters on state change — broadcast to all WebSocket clients."""
        await ws_manager.broadcast({
            "type": "printer_state",
            "printer_id": printer_id,
            "state": {
                "status": state.status.value,
                "job_name": state.job_name,
                "progress_pct": state.progress_pct,
                "time_remaining_s": state.time_remaining_s,
                "current_layer": state.current_layer,
                "total_layers": state.total_layers,
                "nozzle_temp_c": state.nozzle_temp_c,
                "nozzle_target_c": state.nozzle_target_c,
                "bed_temp_c": state.bed_temp_c,
                "bed_target_c": state.bed_target_c,
                "chamber_temp_c": state.chamber_temp_c,
                "material_slots": [vars(s) for s in state.material_slots],
                "error_message": state.error_message,
            },
        })

    def get_adapter(self, printer_id: int) -> Any:
        if printer_id not in self._adapters:
            raise KeyError(f"Printer {printer_id} not managed")
        return self._adapters[printer_id]


printer_manager = PrinterManager()
