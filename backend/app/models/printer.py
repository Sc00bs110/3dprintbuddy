from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, func

from ..core.database import Base


class Printer(Base):
    __tablename__ = "printers"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    adapter_id = Column(String, nullable=False)   # "bambu" | "snapmaker_u1" | "klipper" | ...
    config = Column(JSON, nullable=False)          # adapter-defined connection config (ip, serial, etc.)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
