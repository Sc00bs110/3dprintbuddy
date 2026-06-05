# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**3DPrintBuddy** is a self-hosted, plugin-based 3D printer management platform that supports multiple printer brands via a community adapter system. Core is printer-agnostic; all brand-specific code lives in adapters.

- Backend: Python 3.11+ / FastAPI (`backend/`)
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS (`frontend/`)
- Adapters: `backend/adapters/` — one package per printer brand
- Default DB: SQLite; optional PostgreSQL via `DATABASE_URL`

## Core Design Principle

**Never put printer-specific code in core.** All printer communication lives in `backend/adapters/<brand>/adapter.py`. Core only knows about `PrinterAdapter` (the ABC), `PrinterState` (the normalized model), and the adapter registry. Adding a new printer brand = creating a new adapter package, no core changes required.

## Adapter Plugin System

Adapters register via Python entry points under the group `threedprintbuddy.adapters` in `pyproject.toml`. Core discovers them at startup via `importlib.metadata.entry_points()`. The registry lives in `backend/adapters/base/registry.py`.

### Bundled Adapters

| Adapter ID | Class | Printer |
|---|---|---|
| `bambu` | `BambuAdapter` | Bambu Lab (MQTT/FTPS) |
| `snapmaker_u1` | `SnapmakerU1Adapter` | Snapmaker U1 (Moonraker WebSocket) |
| `klipper` | `KlipperAdapter` | Generic Klipper/Moonraker |

### Writing a New Adapter

1. Subclass `PrinterAdapter` from `backend.adapters.base.adapter`
2. Implement all `@abstractmethod` methods
3. Override `capabilities()` to declare what your printer supports
4. Override `config_schema()` to define the "Add Printer" form fields
5. Register in `pyproject.toml` under `[project.entry-points."threedprintbuddy.adapters"]`
6. Add contract tests in `backend/tests/unit/adapters/test_adapter_contract.py`

The `KlipperAdapter` in `backend/adapters/klipper/` is the reference minimal implementation.

### Key Types (`backend/adapters/base/adapter.py`)

- `PrinterAdapter` — abstract base; all adapters implement this
- `PrinterState` — normalized state all adapters translate into (temps, progress, status, material slots)
- `PrinterCapabilities` — capability flags that drive UI rendering (`multi_material`, `camera`, `layer_info`, etc.)
- `DiscoveredPrinter` — result of network discovery scan
- `PrinterStatus` — enum: `idle / printing / paused / error / offline / connecting / finishing`

## Development Setup

### Backend

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -e .           # registers entry_points so adapters are discoverable
DEBUG=true uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to localhost:8000
```

### Docker

```bash
docker compose up -d --build
# Linux: host networking (printer discovery works)
# macOS/Windows: uncomment ports: section, comment out network_mode: host
```

## Commands

### Backend

```bash
ruff check backend/                          # lint
ruff check --fix backend/                    # lint + auto-fix
ruff format backend/                         # format
pytest backend/tests/ -v                     # all tests
pytest backend/tests/unit/adapters/ -v       # adapter contract tests only
pytest backend/tests/path/to/test_file.py -v # single file
```

### Frontend

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run test:run      # vitest run + i18n parity check
npm test              # vitest watch
npm run build         # outputs to ../static/
```

## Normalized State Flow

```
Printer hardware
    ↓ (MQTT / WebSocket / HTTP polling)
PrinterAdapter._parse_status()
    ↓
PrinterState (normalized)
    ↓ adapter._emit(state)
PrinterManager._on_state_update()
    ↓
WebSocketManager.broadcast()
    ↓
Frontend useWebSocket hook → UI
```

## API Structure

All routes live under `/api/v1/`. Key endpoints:

- `GET /api/v1/printers/adapters` — list installed adapters + their config schemas (powers Add Printer wizard)
- `GET /api/v1/printers/discover` — network scan via all adapters
- `GET /api/v1/printers/` — list configured printers
- `POST /api/v1/printers/` — add a printer (body: `{name, adapter_id, config}`)
- `GET /api/v1/printers/{id}/status` — current normalized PrinterState
- `POST /api/v1/printers/{id}/pause|resume|cancel`
- `GET /api/v1/printers/{id}/camera` — returns stream URL
- `WS /api/v1/ws` — WebSocket for real-time state pushes

## Internationalization

All user-visible strings in the frontend must use `react-i18next`. Add keys to **all** locale files in `frontend/src/i18n/locales/` (`en.ts` is primary). i18n parity is checked in CI.
