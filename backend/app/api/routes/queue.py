from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db
from ...models.library import LibraryFile
from ...models.printer import Printer
from ...models.queue import QueueJob
from ...services.printer_manager import printer_manager

router = APIRouter(prefix="/queue", tags=["queue"])


class QueueJobCreate(BaseModel):
    printer_id: int
    file_id: int
    plate_index: int = 0


class QueueJobResponse(BaseModel):
    id: int
    printer_id: int
    file_id: int
    status: str
    plate_index: int
    created_at: str
    original_name: str | None = None
    printer_name: str | None = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[QueueJobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QueueJob, LibraryFile.original_name, Printer.name)
        .join(LibraryFile, QueueJob.file_id == LibraryFile.id)
        .join(Printer, QueueJob.printer_id == Printer.id)
        .order_by(QueueJob.created_at.desc())
    )
    rows = result.all()
    return [
        QueueJobResponse(
            id=job.id,
            printer_id=job.printer_id,
            file_id=job.file_id,
            status=job.status,
            plate_index=job.plate_index,
            created_at=str(job.created_at),
            original_name=original_name,
            printer_name=printer_name,
        )
        for job, original_name, printer_name in rows
    ]


@router.post("/", response_model=QueueJobResponse, status_code=201)
async def add_job(body: QueueJobCreate, db: AsyncSession = Depends(get_db)):
    # Validate printer and file exist
    printer = await db.get(Printer, body.printer_id)
    if not printer:
        raise HTTPException(404, "Printer not found")
    lib_file = await db.get(LibraryFile, body.file_id)
    if not lib_file:
        raise HTTPException(404, "File not found")

    job = QueueJob(printer_id=body.printer_id, file_id=body.file_id, plate_index=body.plate_index)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return QueueJobResponse(
        id=job.id,
        printer_id=job.printer_id,
        file_id=job.file_id,
        status=job.status,
        plate_index=job.plate_index,
        created_at=str(job.created_at),
        original_name=lib_file.original_name,
        printer_name=printer.name,
    )


@router.post("/{job_id}/dispatch", response_model=QueueJobResponse)
async def dispatch_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Upload the file to the printer and start printing."""
    job = await db.get(QueueJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != "pending":
        raise HTTPException(400, f"Job is already {job.status}")

    lib_file = await db.get(LibraryFile, job.file_id)
    if not lib_file:
        raise HTTPException(404, "Library file not found")

    file_path = settings.data_dir / "library" / lib_file.filename

    try:
        adapter = printer_manager.get_adapter(job.printer_id)
    except KeyError:
        raise HTTPException(503, "Printer not connected")

    printer_filename = await adapter.upload_file(Path(file_path), lib_file.original_name)
    await adapter.start_job(printer_filename, job.plate_index)

    job.status = "dispatched"
    job.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(job)

    printer = await db.get(Printer, job.printer_id)
    return QueueJobResponse(
        id=job.id,
        printer_id=job.printer_id,
        file_id=job.file_id,
        status=job.status,
        plate_index=job.plate_index,
        created_at=str(job.created_at),
        original_name=lib_file.original_name,
        printer_name=printer.name if printer else None,
    )


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(QueueJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    await db.delete(job)
    await db.commit()
