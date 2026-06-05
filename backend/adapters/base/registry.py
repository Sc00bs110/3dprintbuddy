"""
Adapter registry — discovers and loads installed adapters via Python entry points.

Third-party adapters register under the entry point group "threedprintbuddy.adapters".
Bundled adapters are also registered this way via the root pyproject.toml.
"""

from __future__ import annotations

import logging
from importlib.metadata import entry_points

from .adapter import PrinterAdapter

logger = logging.getLogger(__name__)

_registry: dict[str, type[PrinterAdapter]] = {}


def load_adapters() -> None:
    """Call once at startup to discover and register all installed adapters."""
    eps = entry_points(group="threedprintbuddy.adapters")
    for ep in eps:
        try:
            adapter_cls = ep.load()
            if not (isinstance(adapter_cls, type) and issubclass(adapter_cls, PrinterAdapter)):
                logger.warning("Entry point %s did not load a PrinterAdapter subclass — skipping", ep.name)
                continue
            _registry[ep.name] = adapter_cls
            logger.info("Loaded adapter: %s (%s)", ep.name, adapter_cls.DISPLAY_NAME)
        except Exception:
            logger.exception("Failed to load adapter entry point: %s", ep.name)


def get_adapter(adapter_id: str) -> type[PrinterAdapter]:
    """Return the adapter class for the given id. Raises KeyError if not found."""
    if adapter_id not in _registry:
        raise KeyError(f"No adapter registered with id '{adapter_id}'. Loaded: {list(_registry)}")
    return _registry[adapter_id]


def list_adapters() -> list[dict]:
    """Return metadata for all registered adapters (for the UI's Add Printer wizard)."""
    return [
        {
            "id": adapter_id,
            "display_name": cls.DISPLAY_NAME,
            "capabilities": vars(cls.capabilities()),
            "config_schema": cls.config_schema(),
        }
        for adapter_id, cls in _registry.items()
    ]
