from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...models.printer import Printer
from ...services.printer_manager import printer_manager
from ....adapters.base.registry import list_adapters, get_adapter

router = APIRouter(prefix="/printers", tags=["printers"])


class PrinterCreate(BaseModel):
    name: str
    adapter_id: str
    config: dict


class PrinterResponse(BaseModel):
    id: int
    name: str
    adapter_id: str
    config: dict
    enabled: bool

    class Config:
        from_attributes = True


@router.get("/adapters")
async def get_adapters():
    """List all installed printer adapters with their capabilities and config schemas."""
    return list_adapters()


@router.get("/", response_model=list[PrinterResponse])
async def list_printers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Printer))
    return result.scalars().all()


@router.post("/", response_model=PrinterResponse, status_code=201)
async def add_printer(body: PrinterCreate, db: AsyncSession = Depends(get_db)):
    try:
        get_adapter(body.adapter_id)
    except KeyError:
        raise HTTPException(400, f"Unknown adapter: {body.adapter_id}")

    printer = Printer(name=body.name, adapter_id=body.adapter_id, config=body.config)
    db.add(printer)
    await db.commit()
    await db.refresh(printer)
    return printer


@router.delete("/{printer_id}", status_code=204)
async def delete_printer(printer_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Printer).where(Printer.id == printer_id))
    printer = result.scalar_one_or_none()
    if not printer:
        raise HTTPException(404, "Printer not found")
    await db.delete(printer)
    await db.commit()


@router.get("/{printer_id}/status")
async def get_printer_status(printer_id: int):
    try:
        adapter = printer_manager.get_adapter(printer_id)
    except KeyError:
        raise HTTPException(404, "Printer not found or not connected")
    state = await adapter.get_status()
    return state


@router.post("/{printer_id}/pause")
async def pause_printer(printer_id: int):
    adapter = printer_manager.get_adapter(printer_id)
    await adapter.pause_job()
    return {"ok": True}


@router.post("/{printer_id}/resume")
async def resume_printer(printer_id: int):
    adapter = printer_manager.get_adapter(printer_id)
    await adapter.resume_job()
    return {"ok": True}


@router.post("/{printer_id}/cancel")
async def cancel_printer(printer_id: int):
    adapter = printer_manager.get_adapter(printer_id)
    await adapter.cancel_job()
    return {"ok": True}


@router.get("/{printer_id}/camera")
async def get_camera_url(printer_id: int):
    adapter = printer_manager.get_adapter(printer_id)
    url = await adapter.get_camera_url()
    if not url:
        raise HTTPException(404, "Camera not available for this printer")
    return {"url": url}


@router.get("/discover")
async def discover_printers():
    """Scan the local network for printers using all installed adapters."""
    from ....adapters.base.registry import _registry
    results = []
    for adapter_cls in _registry.values():
        found = await adapter_cls.discover()
        results.extend([vars(p) for p in found])
    return results
