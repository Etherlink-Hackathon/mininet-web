"""Shards API endpoints for MeshPay."""

from typing import Dict, List, Any
from fastapi import APIRouter, Query, HTTPException
from ...services.mesh_client import mesh_client

router = APIRouter()

@router.get("/")
async def list_shards(refresh: bool = Query(False)) -> List[Dict[str, Any]]:
    """Get list of shards."""
    shards = await mesh_client.get_shards(force=refresh)
    if len(shards) == 0:
        raise HTTPException(status_code=404, detail="No shards found")
    return shards

@router.get("/{shard_id}")
async def get_shard(shard_id: str) -> Dict[str, Any]:
    """Get specific shard information."""
    shards = await mesh_client.get_shards()
    for shard in shards:
        if shard.get("id") == shard_id:
            return shard
    raise HTTPException(status_code=404, detail="No shard found")

@router.get("/root")
async def shards_root() -> Dict[str, Any]:
    """Root shards endpoint with available operations."""
    return {
        "endpoints": {
            "list": "/api/shards/",
            "get": "/api/shards/{shard_id}"
        }
    } 