from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .api.routes import library, printers, queue, websocket
from .core.config import APP_NAME, APP_VERSION
from .core.database import init_db
from .models import library as _library_model  # noqa: F401 — ensure table is created
from .models import queue as _queue_model  # noqa: F401 — ensure table is created
from .services.printer_manager import printer_manager
from ..adapters.base.registry import load_adapters


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    load_adapters()
    await printer_manager.start()
    yield
    await printer_manager.stop()


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

app.include_router(printers.router, prefix="/api/v1")
app.include_router(library.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(websocket.router)

try:
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
except RuntimeError:
    pass  # static dir not built yet in dev
