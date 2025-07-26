"""Authorities API endpoints for MeshPay."""

from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Query
from ...services.mesh_client import mesh_client

router = APIRouter()

@router.get("/")
async def post_transfer(body: Dict[str, Any]) -> Dict[str, Any]:
    """Post a transfer to the gateway."""
    return await mesh_client.send_transfer(body)

