"""Main API router for v1 endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints import authorities, transactions, wallet, websocket, mesh

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(authorities.router, prefix="/authorities", tags=["Authorities"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
api_router.include_router(mesh.router, prefix="/mesh", tags=["Mesh Network"]) 