"""
Generic Klipper/Moonraker adapter — reference implementation for community adapters.

Works with any stock Moonraker instance (OctoPrint-free Klipper printers,
Voron, RatRig, etc.). The Snapmaker U1 adapter extends this same protocol
with U1-specific customizations.

This is intentionally minimal — the simplest correct Moonraker adapter —
so it serves as a clear template for community adapter authors.
"""

from __future__ import annotations

from typing import Any

from ..snapmaker_u1.adapter import SnapmakerU1Adapter
from ..base.adapter import DiscoveredPrinter, PrinterCapabilities


class KlipperAdapter(SnapmakerU1Adapter):
    """
    Generic Moonraker adapter. Inherits all U1 Moonraker communication.
    Override capabilities and display name only.
    """

    ADAPTER_ID = "klipper"
    DISPLAY_NAME = "Klipper / Moonraker"

    @classmethod
    def capabilities(cls) -> PrinterCapabilities:
        return PrinterCapabilities(
            multi_material=False,
            camera=True,
            camera_rtsp=False,
            pause_resume=True,
            estimated_time=True,
            layer_info=True,
            chamber_temp=False,
            enclosure_light=False,
            remote_upload=True,
        )

    @classmethod
    async def discover(cls) -> list[DiscoveredPrinter]:
        # Generic Moonraker printers also advertise via _moonraker._tcp mDNS
        results = await super().discover()
        for r in results:
            r.adapter_id = cls.ADAPTER_ID
            r.model = "Klipper"
        return results

    @classmethod
    def config_schema(cls) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "ip_address": {"type": "string", "title": "IP Address"},
                "port": {"type": "integer", "title": "Moonraker Port", "default": 7125},
            },
            "required": ["ip_address"],
        }
