"""WebSocket API endpoints for SmartPay."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

router = APIRouter()

class ConnectionManager:
    """WebSocket connection manager."""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        # Send initial connection message
        await manager.send_personal_message(
            json.dumps({
                "type": "connection",
                "message": "Connected to SmartPay WebSocket",
                "timestamp": asyncio.get_event_loop().time()
            }),
            websocket
        )
        
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            
            # Echo back for now - in the future this would handle specific commands
            await manager.send_personal_message(
                json.dumps({
                    "type": "echo",
                    "data": data,
                    "timestamp": asyncio.get_event_loop().time()
                }),
                websocket
            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.get("/")
async def websocket_info():
    """WebSocket connection information."""
    return {
        "websocket_url": "/api/ws/",
        "active_connections": len(manager.active_connections),
        "supported_messages": [
            "echo - Echo back received message",
            "status - Get system status updates"
        ]
    } 