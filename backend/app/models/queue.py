from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from ..core.database import Base


class QueueJob(Base):
    __tablename__ = "queue_jobs"

    id = Column(Integer, primary_key=True)
    printer_id = Column(Integer, ForeignKey("printers.id"), nullable=False)
    file_id = Column(Integer, ForeignKey("library_files.id"), nullable=False)
    status = Column(String, default="pending")   # pending | dispatched | done | failed
    plate_index = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
