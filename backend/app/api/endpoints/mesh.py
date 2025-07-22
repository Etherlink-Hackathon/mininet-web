"""Mesh network API endpoints for SmartPay mesh integration."""

from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Query
from ...services.mesh_client import mesh_client, SUPPORTED_TOKENS

router = APIRouter()

@router.get("/authorities")
async def list_authorities(refresh: bool = Query(False)) -> List[Dict[str, Any]]:
    """Get list of mesh authorities."""
    return await mesh_client.discover(force=refresh)

@router.get("/authorities/{name}")
async def get_authority(name: str) -> Dict[str, Any]:
    """Get specific authority information."""
    authorities = await mesh_client.discover()
    for auth in authorities:
        if auth["name"] == name:
            return auth
    raise HTTPException(status_code=404, detail="Authority not found")

@router.post("/transfer")
async def transfer(authority: str = Query(...), body: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send transfer to mesh authority."""
    if body is None:
        raise HTTPException(status_code=400, detail="Missing JSON body")
    if body.get("token") not in SUPPORTED_TOKENS:
        raise HTTPException(status_code=400, detail="Unsupported token")
    return await mesh_client.send_transfer(authority, body)

@router.post("/confirmation")
async def confirmation(authority: str = Query(...), body: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Send confirmation to mesh authority."""
    if body is None:
        raise HTTPException(status_code=400, detail="Missing JSON body")
    return await mesh_client.send_confirmation(authority, body)

@router.post("/ping/{name}")
async def ping(name: str) -> Dict[str, Any]:
    """Ping specific mesh authority."""
    return await mesh_client.ping(name)

@router.post("/ping-all")
async def ping_all() -> Dict[str, Any]:
    """Ping all mesh authorities."""
    return await mesh_client.ping_all()

@router.get("/")
async def mesh_root() -> Dict[str, Any]:
    """Root mesh endpoint with available operations."""
    return {
        "endpoints": {
            "authorities": "/api/mesh/authorities",
            "transfer": "/api/mesh/transfer?authority={name}",
            "confirmation": "/api/mesh/confirmation?authority={name}",
            "ping": "/api/mesh/ping/{name}",
            "ping_all": "/api/mesh/ping-all"
        }
    } 