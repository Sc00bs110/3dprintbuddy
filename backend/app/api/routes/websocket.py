from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ...core.websocket import ws_manager

router = APIRouter()


@router.websocket("/api/v1/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()   # keep connection open; server pushes only
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
