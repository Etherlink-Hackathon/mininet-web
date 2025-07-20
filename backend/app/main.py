"""Minimal FastAPI backend that proxies requests to FastPay mesh authorities.

This file depends **only** on `app.services.mesh_client` to communicate with the
Mininet-WiFi gateway bridge.  Keeping everything here ultra-lightweight helps us
reason about the full flow:

Frontend  →  /api  →  simple_backend.py  →  MeshClient  →  HTTP Gateway  →  Authority
"""

from __future__ import annotations

import time
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.services.mesh_client import mesh_client, SUPPORTED_TOKENS

# ---------------------------------------------------------------------------
# FastAPI setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Mininet-WiFi FastPay Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, lock this down.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------ lifecycle ------------------------------

@app.on_event("startup")
async def _startup() -> None:  # noqa: D401
    await mesh_client.start()


@app.on_event("shutdown")
async def _shutdown() -> None:  # noqa: D401
    await mesh_client.close()


# ------------------------------ routes --------------------------------


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "timestamp": time.time(),
        "gateway": mesh_client.gateway_url,
        "supported_tokens": SUPPORTED_TOKENS,
    }


@app.get("/shards")
async def list_shards(refresh: bool = Query(False)) -> List[Dict[str, Any]]:
    return await mesh_client.get_shards(force=refresh)


@app.get("/authorities")
async def list_authorities(refresh: bool = Query(False)) -> List[Dict[str, Any]]:
    return await mesh_client.discover(force=refresh)


@app.get("/authorities/{name}")
async def get_authority(name: str) -> Dict[str, Any]:
    authorities = await mesh_client.discover()
    for auth in authorities:
        if auth["name"] == name:
            return auth
    raise HTTPException(status_code=404, detail="Authority not found")


@app.post("/transfer")
async def transfer(authority: str = Query(...), body: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if body is None:
        raise HTTPException(status_code=400, detail="Missing JSON body")
    if body.get("token") not in SUPPORTED_TOKENS:
        raise HTTPException(status_code=400, detail="Unsupported token")
    return await mesh_client.send_transfer(authority, body)


@app.post("/confirmation")
async def confirmation(authority: str = Query(...), body: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if body is None:
        raise HTTPException(status_code=400, detail="Missing JSON body")
    return await mesh_client.send_confirmation(authority, body)


@app.post("/ping/{name}")
async def ping(name: str) -> Dict[str, Any]:
    return await mesh_client.ping(name)


@app.post("/ping-all")
async def ping_all() -> Dict[str, Any]:
    return await mesh_client.ping_all()


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "docs": "/docs",
        "authorities": "/authorities",
        "transfer": "/transfer?authority={name}",
        "confirmation": "/confirmation?authority={name}",
    } 