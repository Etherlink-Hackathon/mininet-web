"""Mesh Internet Bridge server.

Provides HTTP → FastPay TCP translation so external web front-ends can
interact with mesh authorities.
"""

from __future__ import annotations

import http.server
import json
import socket
import socketserver
import threading
import time
from typing import Any, Dict, Optional, List

from mininet.log import info

from mn_wifi.authority import WiFiAuthority
from mn_wifi.client import Client

__all__ = ["MeshInternetBridge"]


class MeshInternetBridge:
    """HTTP bridge server that enables web back-ends to communicate with
    mesh authorities.
    """

    def __init__(self, clients: List[Client], port: int = 8080) -> None:
        self.port = port
        self.authorities: Dict[str, Dict[str, Any]] = {}
        self.clients_map: Dict[str, Client] = {c.name: c for c in clients}
        self.server: Optional[socketserver.TCPServer] = None
        self.server_thread: Optional[threading.Thread] = None
        self.running = False

    # ------------------------------------------------------------------
    # New – HTTP → client.transfer helper
    # ------------------------------------------------------------------

    def _transfer_via_client(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a transfer order through :pymeth:`mn_wifi.client.Client.transfer`.

        The JSON body must include ``sender``, ``recipient`` and ``amount``.
        The helper performs basic validation and returns a JSON-serialisable
        response containing ``success`` and optional ``error``.
        """

        sender = body.get("sender")
        recipient = body.get("recipient")
        amount = body.get("amount")

        # Basic sanity checks --------------------------------------------------
        if sender is None or recipient is None or amount is None:
            return {"success": False, "error": "missing_fields", "required": ["sender", "recipient", "amount"]}

        try:
            amount_int = int(amount)
        except Exception:
            return {"success": False, "error": "amount_not_int"}

        client = self.clients_map.get(sender)
        if client is None:
            return {"success": False, "error": "sender_not_found", "sender": sender}

        # ------------------------------------------------------------------
        # Execute the transfer using the built-in FastPay helper -------------
        # ------------------------------------------------------------------
        try:
            ok = client.transfer(recipient, amount_int)
            return {"success": bool(ok), "sender": sender, "recipient": recipient, "amount": amount_int}
        except Exception as exc:  # pragma: no cover – defensive guard
            return {"success": False, "error": str(exc)}

    # ---------------------------------------------------------------------
    # Registration helpers
    # ---------------------------------------------------------------------

    def register_authority(self, authority: WiFiAuthority) -> None:  # noqa: D401
        """Add/refresh *authority* entry used by the JSON API."""

        def _serialise_account(acc):  # type: ignore[ann-type]
            return {
                "address": acc.address,
                "balance": acc.balance,
                "sequence_number": acc.sequence_number,
                "last_update": acc.last_update,
            }

        accounts = {
            addr: _serialise_account(acc)
            for addr, acc in authority.state.accounts.items()
        }

        self.authorities[authority.name] = {
            "name": authority.name,
            "ip": authority.IP(),
            "address": {
                "node_id": authority.address.node_id,
                "ip_address": authority.address.ip_address,
                "port": authority.address.port,
                "node_type": authority.address.node_type.value,
            },
            "status": "online",
            "last_sync_time": getattr(authority.state, "last_sync_time", None),
            "accounts": accounts,
            "committee_members": list(getattr(authority.state, "committee_members", [])),
            "range": authority.params.get("range", 100),
            "txpower": authority.params.get("txpower", 20),
            "antennaGain": authority.params.get("antennaGain", 5),
            "stake": authority.stake,
        }

    # ---------------------------------------------------------------------
    # Web server
    # ---------------------------------------------------------------------

    def start(self) -> None:
        """Start the HTTP bridge (if not already running)."""
        if self.running:
            return

        info(f"🌉 Starting Mesh Internet Bridge on port {self.port}\n")

        class _Handler(http.server.BaseHTTPRequestHandler):  # noqa: D401
            def __init__(self, *args, bridge: "MeshInternetBridge", **kwargs):
                self.bridge = bridge
                super().__init__(*args, **kwargs)

            # ------------- helpers -------------------------------------
            def _json(self, obj: Any, code: int = 200) -> None:  # noqa: ANN401
                payload = json.dumps(obj).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(payload)

            # ------------- routing -------------------------------------
            def do_GET(self):  # noqa: N802
                if self.path == "/health":
                    self._json({
                        "status": "healthy",
                        "authorities_count": len(self.bridge.authorities),
                        "timestamp": time.time(),
                    })
                elif self.path == "/authorities":
                    self._json({
                        "authorities": list(self.bridge.authorities.values()),
                        "count": len(self.bridge.authorities),
                        "timestamp": time.time(),
                    })
                else:
                    self._json({"error": "not found"}, 404)

            # -------- POST ---------------------------------------------
            def do_POST(self):  # noqa: N802
                path_parts = [p for p in self.path.split("/") if p]

                # New simple endpoint: POST /transfer -------------------
                if len(path_parts) == 1 and path_parts[0] == "transfer":
                    try:
                        length = int(self.headers.get("Content-Length", "0"))
                        raw = self.rfile.read(length) if length else b"{}"
                        body = json.loads(raw.decode() or "{}")
                    except Exception as exc:  # bad JSON
                        self._json({"success": False, "error": f"invalid_json: {exc}"}, 400)
                        return

                    result = self.bridge._transfer_via_client(body)
                    code = 200 if result.get("success") else 400
                    self._json(result, code)
                    return

            def log_message(self, *_):  # silence default logging
                pass

        def _factory(*args, **kwargs):  # type: ignore[ann-type]
            return _Handler(*args, bridge=self, **kwargs)

        self.server = socketserver.TCPServer(("", self.port), _factory)
        self.server.allow_reuse_address = True
        self.server_thread = threading.Thread(
            target=self.server.serve_forever, daemon=True
        )
        self.server_thread.start()
        self.running = True
        info("✅ Mesh Internet Bridge started\n")

    def stop(self) -> None:
        if not self.running or self.server is None:
            return
        info("🛑 Stopping Mesh Internet Bridge\n")
        self.server.shutdown()
        self.server.server_close()
        self.server_thread.join(timeout=2)
        self.running = False
        self.server = None
        self.server_thread = None

    # ------------------------------------------------------------------
    # Back-compat helper names (used by the demo script) ---------------
    # ------------------------------------------------------------------

    def start_bridge_server(self, *_args, **_kwargs):  # noqa: D401
        """Alias for :py:meth:`start` (kept for backward compatibility)."""

        self.start()

    def stop_bridge_server(self):  # noqa: D401
        """Alias for :py:meth:`stop` (kept for backward compatibility)."""

        self.stop() 