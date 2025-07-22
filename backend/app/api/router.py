"""Main API router for all endpoints."""

from fastapi import APIRouter
from app.api.endpoints import authorities, transactions, wallet, websocket, mesh, shards

# Create the main API router
api_router = APIRouter()

# Include all endpoint routers with appropriate prefixes
api_router.include_router(authorities.router, prefix="/authorities", tags=["Authorities"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"]) 
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
api_router.include_router(mesh.router, prefix="/mesh", tags=["Mesh Network"])
api_router.include_router(shards.router, prefix="/shards", tags=["Shards"])

# Health check endpoint at the API level
@api_router.get("/health")
async def health():
    """API health check endpoint."""
    return {
        "status": "ok",
        "message": "SmartPay API is running",
        "endpoints": {
            "authorities": "/api/authorities",
            "transactions": "/api/transactions", 
            "wallet": "/api/wallet",
            "mesh": "/api/mesh",
            "shards": "/api/shards",
            "websocket": "/api/ws"
        }
    } 