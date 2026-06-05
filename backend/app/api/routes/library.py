import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.database import get_db
from ...models.library import LibraryFile

router = APIRouter(prefix="/library", tags=["library"])

ALLOWED_EXTENSIONS = {".3mf", ".gcode", ".stl", ".gcode.3mf"}


def _file_type(name: str) -> str:
    name = name.lower()
    if name.endswith(".gcode.3mf"):
        return "gcode.3mf"
    return Path(name).suffix.lstrip(".")


class LibraryFileResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: str
    size_bytes: int
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[LibraryFileResponse])
async def list_files(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LibraryFile).order_by(LibraryFile.created_at.desc()))
    files = result.scalars().all()
    return [LibraryFileResponse(
        id=f.id,
        filename=f.filename,
        original_name=f.original_name,
        file_type=f.file_type,
        size_bytes=f.size_bytes,
        created_at=str(f.created_at),
    ) for f in files]


@router.post("/upload", response_model=LibraryFileResponse, status_code=201)
async def upload_file(file: UploadFile, db: AsyncSession = Depends(get_db)):
    original_name = file.filename or "unknown"
    ext = Path(original_name.lower()).suffix
    if ext not in ALLOWED_EXTENSIONS and not original_name.lower().endswith(".gcode.3mf"):
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")

    library_dir = settings.data_dir / "library"
    library_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}_{original_name}"
    dest = library_dir / stored_name

    content = await file.read()
    async with aiofiles.open(dest, "wb") as f_out:
        await f_out.write(content)

    record = LibraryFile(
        filename=stored_name,
        original_name=original_name,
        file_type=_file_type(original_name),
        size_bytes=len(content),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return LibraryFileResponse(
        id=record.id,
        filename=record.filename,
        original_name=record.original_name,
        file_type=record.file_type,
        size_bytes=record.size_bytes,
        created_at=str(record.created_at),
    )


@router.delete("/{file_id}", status_code=204)
async def delete_file(file_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LibraryFile).where(LibraryFile.id == file_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "File not found")

    path = settings.data_dir / "library" / record.filename
    if path.exists():
        os.remove(path)

    await db.delete(record)
    await db.commit()
