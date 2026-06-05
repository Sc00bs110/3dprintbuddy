"""
Adapter contract tests — every bundled adapter must pass these.

These tests verify that adapters correctly implement the PrinterAdapter ABC
and produce valid PrinterState objects. They use mock I/O — no real printer needed.
"""

import pytest
from backend.adapters.base.adapter import PrinterAdapter, PrinterCapabilities, PrinterState
from backend.adapters.bambu import BambuAdapter
from backend.adapters.snapmaker_u1 import SnapmakerU1Adapter
from backend.adapters.klipper import KlipperAdapter

ALL_ADAPTERS = [BambuAdapter, SnapmakerU1Adapter, KlipperAdapter]


@pytest.mark.parametrize("adapter_cls", ALL_ADAPTERS)
def test_adapter_has_required_class_attrs(adapter_cls):
    assert adapter_cls.ADAPTER_ID, f"{adapter_cls.__name__} must define ADAPTER_ID"
    assert adapter_cls.DISPLAY_NAME, f"{adapter_cls.__name__} must define DISPLAY_NAME"


@pytest.mark.parametrize("adapter_cls", ALL_ADAPTERS)
def test_capabilities_returns_correct_type(adapter_cls):
    caps = adapter_cls.capabilities()
    assert isinstance(caps, PrinterCapabilities)


@pytest.mark.parametrize("adapter_cls", ALL_ADAPTERS)
def test_config_schema_is_valid_json_schema(adapter_cls):
    schema = adapter_cls.config_schema()
    assert isinstance(schema, dict)
    assert schema.get("type") == "object"
    assert "properties" in schema
    assert "required" in schema


@pytest.mark.parametrize("adapter_cls", ALL_ADAPTERS)
def test_is_subclass_of_printer_adapter(adapter_cls):
    assert issubclass(adapter_cls, PrinterAdapter)


def test_snapmaker_u1_parses_moonraker_status():
    adapter = SnapmakerU1Adapter.__new__(SnapmakerU1Adapter)
    adapter.printer_id = 1

    moonraker_payload = {
        "print_stats": {
            "state": "printing",
            "filename": "benchy.gcode",
            "print_duration": 1234,
            "current_layer": 42,
            "total_layer": 100,
        },
        "virtual_sdcard": {"progress": 0.42},
        "extruder": {"temperature": 215.3, "target": 215.0},
        "heater_bed": {"temperature": 60.1, "target": 60.0},
    }

    state = adapter._parse_status(moonraker_payload)
    assert state.status.value == "printing"
    assert state.job_name == "benchy.gcode"
    assert state.progress_pct == 42.0
    assert state.current_layer == 42
    assert state.total_layers == 100
    assert state.nozzle_temp_c == 215.3
    assert state.bed_temp_c == 60.1


def test_bambu_parses_mqtt_payload():
    adapter = BambuAdapter.__new__(BambuAdapter)
    adapter.printer_id = 1

    payload = {
        "print": {
            "gcode_state": "RUNNING",
            "subtask_name": "vase.3mf",
            "mc_percent": 55,
            "mc_remaining_time": 30,
            "layer_num": 80,
            "total_layer_num": 200,
            "nozzle_temper": 220.0,
            "nozzle_target_temper": 220.0,
            "bed_temper": 65.0,
            "bed_target_temper": 65.0,
            "chamber_temper": 35.0,
            "ams": {"ams": []},
        }
    }

    state = adapter._parse_status(payload)
    assert state.status.value == "printing"
    assert state.job_name == "vase.3mf"
    assert state.progress_pct == 55.0
    assert state.time_remaining_s == 1800
    assert state.chamber_temp_c == 35.0
