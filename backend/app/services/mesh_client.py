"""MeshClient – single source for communicating with FastPay mesh authorities.  

This small async wrapper around the Mininet-WiFi *gateway bridge* exposes just
what the web backend needs:

* discover()          – list available authorities
* send_transfer()     – forward a transfer order
* send_confirmation() – forward a confirmation order
* ping()/ping_all()   – liveness checks

The implementation intentionally avoids dependencies on the old, heavier
`authority_client.py` and `mesh_authority_client.py`.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Dict, List, Optional

import httpx
import structlog
from app.core.config import get_settings

logger = structlog.get_logger(__name__)

settings = get_settings()
MESH_GATEWAY_URL: str = settings.mesh_bridge_url.rstrip("/")
HTTP_TIMEOUT: float = settings.mesh_timeout
SUPPORTED_TOKENS: List[str] = settings.supported_tokens

# ---------------------------------------------------------------------------
# Pydantic-free (simple) models – frontend has its own TS typings
# ---------------------------------------------------------------------------

class AuthorityInfoDict(Dict[str, Any]):
    """Authority info represented as a plain `dict` (to avoid pydantic heavy-weight)."""

    name: str  # type: ignore[assignment]
    ip: str  # type: ignore[assignment]
    port: int  # type: ignore[assignment]
    status: str  # type: ignore[assignment]
    position: Dict[str, float]  # type: ignore[assignment]
    committee_members: List[str]  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class MeshClientError(RuntimeError):
    """Base exception for mesh client errors."""


# ---------------------------------------------------------------------------
# Mesh client implementation
# ---------------------------------------------------------------------------

class MeshClient:  # pylint: disable=too-few-public-methods
    """HTTP client that talks to the mesh gateway bridge running in the NAT node."""

    def __init__(self, gateway_url: str | None = None) -> None:
        self.gateway_url: str = (gateway_url or MESH_GATEWAY_URL).rstrip("/")
        self._http: Optional[httpx.AsyncClient] = None
        self._cache: Dict[str, AuthorityInfoDict] = {}

    # ------------------------------ lifecycle -----------------------------

    async def start(self) -> None:
        self._http = httpx.AsyncClient(timeout=HTTP_TIMEOUT)
        logger.info("mesh_client_started", gateway=self.gateway_url)

    async def close(self) -> None:
        if self._http:
            await self._http.aclose()
            logger.info("mesh_client_closed")

    # ------------------------------ helpers ------------------------------

    def _require_client(self) -> httpx.AsyncClient:
        if not self._http:
            raise MeshClientError("MeshClient not started – call start() first")
        return self._http

    # ------------------------------ core API ------------------------------

    async def discover(self, *, force: bool = False) -> List[AuthorityInfoDict]:
        """Return list of authorities; refresh from gateway when requested."""
        if self._cache and not force:
            return list(self._cache.values())

        http = self._require_client()
        try:
            resp = await http.get(f"{self.gateway_url}/authorities")
            resp.raise_for_status()
            data: Dict[str, Any] = resp.json()
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("authority_discovery_failed", error=str(exc))
            raise MeshClientError("Gateway unreachable for discovery") from exc

        self._cache = {a["name"]: a for a in data.get("authorities", [])}
        logger.info("authority_discovery_success", count=len(self._cache))
        return list(self._cache.values())

    async def send_transfer(self, authority: str, body: Dict[str, Any]) -> Dict[str, Any]:
        http = self._require_client()
        if body.get("token") not in SUPPORTED_TOKENS:
            raise MeshClientError(f"Unsupported token {body.get('token')}")
        payload = {**body, "timestamp": time.time()}
        try:
            resp = await http.post(
                f"{self.gateway_url}/authorities/{authority}/transfer", json=payload
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("transfer_failed", authority=authority, error=str(exc))
            raise MeshClientError("Transfer failed") from exc

    async def send_confirmation(self, authority: str, body: Dict[str, Any]) -> Dict[str, Any]:
        http = self._require_client()
        payload = {**body, "timestamp": time.time()}
        try:
            resp = await http.post(
                f"{self.gateway_url}/authorities/{authority}/confirmation", json=payload
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("confirmation_failed", authority=authority, error=str(exc))
            raise MeshClientError("Confirmation failed") from exc

    async def ping(self, authority: str) -> Dict[str, Any]:
        http = self._require_client()
        try:
            resp = await http.post(
                f"{self.gateway_url}/authorities/{authority}/ping", json={"timestamp": time.time()}
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("ping_failed", authority=authority, error=str(exc))
            return {"success": False, "error": str(exc)}

    async def ping_all(self) -> Dict[str, Dict[str, Any]]:
        authorities = await self.discover()
        results = await asyncio.gather(*(self.ping(a["name"]) for a in authorities))
        return {a["name"]: r for a, r in zip(authorities, results)}


# ---------------------------------------------------------------------------
# Singleton & helper for FastAPI dependency injection
# ---------------------------------------------------------------------------

mesh_client = MeshClient()

async def get_mesh_client() -> MeshClient:  # noqa: D401
    return mesh_client

__all__ = [
    "MeshClient",
    "mesh_client",
    "get_mesh_client",
    "MeshClientError",
    "SUPPORTED_TOKENS",
] 