"""WebSocket API endpoints."""

from fastapi import APIRouter, WebSocket
import asyncio

router = APIRouter()

@router.websocket("/updates")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    try:
        while True:
            # Send periodic updates
            await websocket.send_json({"type": "heartbeat", "timestamp": "now"})
            await asyncio.sleep(30)
 