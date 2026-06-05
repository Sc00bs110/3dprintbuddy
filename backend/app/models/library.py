from sqlalchemy import Column, DateTime, Integer, String, func

from ..core.database import Base


class LibraryFile(Base):
    __tablename__ = "library_files"

    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)   # "3mf" | "gcode" | "stl"
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
