"""Authorities API endpoints for SmartPay."""

from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Query
from ...services.mesh_client import mesh_client

router = APIRouter()

@router.get("/")
async def list_authorities(refresh: bool = Query(False)) -> List[Dict[str, Any]]:
    """Get list of authorities."""
    return await mesh_client.discover(force=refresh)

@router.get("/{name}")
async def get_authority(name: str) -> Dict[str, Any]:
    """Get specific authority information."""
    authorities = await mesh_client.discover()
    for auth in authorities:
        if auth["name"] == name:
            return auth
    raise HTTPException(status_code=404, detail="Authority not found")

@router.post("/{name}/ping")
async def ping_authority(name: str) -> Dict[str, Any]:
    """Ping a specific authority."""
    return await mesh_client.ping(name)

@router.get("/root")
async def authorities_root() -> Dict[str, Any]:
    """Root authorities endpoint with available operations."""
    return {
        "endpoints": {
            "list": "/api/authorities/",
            "get": "/api/authorities/{name}",
            "ping": "/api/authorities/{name}/ping"
        }
    } 