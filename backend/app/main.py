"""FastAPI backend for mininet-web MeshPay system.

This application provides a clean REST API for interacting with:
- MeshPay mesh networks via gateway bridge
- Smart contract operations on Etherlink blockchain
- Wallet management and transaction processing
"""

from __future__ import annotations

import time
from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.services.mesh_client import mesh_client
from app.services.blockchain_client import blockchain_client

# ---------------------------------------------------------------------------
# FastAPI application setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MeshPay Backend",
    description="Backend API for MeshPay mesh network and blockchain integration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=settings.allowed_methods,
    allow_headers=settings.allowed_headers,
)

# Include the main API router with /api prefix
app.include_router(api_router, prefix="/api")
# ---------------------------------------------------------------------------
# Root endpoints (non-API)
# ---------------------------------------------------------------------------

@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with API information."""
    return {
        "name": "MeshPay Backend",
        "version": "1.0.0",
        "status": "running",
        "timestamp": time.time(),
        "api": {
            "docs": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "authorities": "/api/authorities",
            "mesh": "/api/mesh",
            "wallet": "/api/wallet",
            "shards": "/api/shards",
            "transactions": "/api/transactions",
            "websocket": "/api/ws"
        }
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """System health check endpoint."""

    # Check blockchain client status
    blockchain_health = await blockchain_client.health_check()
    
    return {
        "status": "ok",
        "timestamp": time.time(),
        "services": {
            "mesh_client": {
                "status": mesh_status,
                "gateway_url": mesh_client.gateway_url,
            },
            "blockchain_client": {
                "status": "ok" if blockchain_health['connected'] else "error",
                "chain_id": blockchain_health.get('chain_id'),
                "meshpay_contract": blockchain_health['meshpay_contract'],
            }
        },
        "config": {
            "environment": settings.environment,
            "debug": settings.debug,
            "api_prefix": "/api"
        }
    }

@app.get("/info")
async def system_info() -> Dict[str, Any]:
    """System information and configuration."""
    return {
        "application": {
            "name": "MeshPay Backend",
            "version": "1.0.0",
            "environment": settings.environment,
            "debug": settings.debug,
        },
        "mesh_network": {
            "gateway_url": settings.mesh_gateway_url,
            "discovery_enabled": settings.mesh_discovery_enabled,
            "authority_port": settings.mesh_authority_port,
        },
        "blockchain": {
            "rpc_url": settings.rpc_url,
            "chain_id": settings.chain_id,
            "chain_name": settings.chain_name,
            "meshpay_contract": settings.meshpay_contract_address,
        },
        "api": {
            "prefix": "/api",
            "cors_origins": settings.allowed_origins,
            "websocket_enabled": settings.ws_enable,
        }
    } 