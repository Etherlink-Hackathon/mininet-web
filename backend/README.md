# Mininet-WiFi SmartPay Backend

> **Single-file, zero-dependency* FastAPI service that bridges the React web UI to SmartPay authorities running in an IEEE 802.11s mesh network.**
>
> *Zero-dependency beyond `httpx`, `fastapi`, and `uvicorn` – see `requirements.txt` for full list.

---

## ✨ What’s inside?

```
backend/
├── app/
│   ├── services/
│   │   ├── mesh_client.py   # single source of truth for authority comms
│   │   └── __init__.py      # re-exports mesh_client helpers
│   └── simple_backend.py    # minimal FastAPI application
├── requirements.txt         # small set of runtime deps
└── Dockerfile               # container image (production & dev)
```

*All legacy clients (`authority_client.py`, `mesh_authority_client.py`, etc.) have been removed.*

---

## 🔌 High-level flow

```text
Frontend (React)  ─┐                  │
                   │  REST / JSON    │
                   ▼                  │
   simple_backend.py (FastAPI)        │
                   │  async httpx    │
                   ▼                  │
       mesh_client.py  ─────────►  Mininet-WiFi Gateway Bridge (NAT node exposing :8080)
                   │                  │
                   │  TCP SmartPay     │
                   ▼                  ▼
             SmartPay Authority  …  SmartPay Authority
```

* The **gateway bridge** (running inside the NAT node of the mesh demo) exposes standard HTTP routes ( `/authorities`, `/authorities/<name>/transfer`, … ).
* `mesh_client.py` is a thin wrapper that forwards JSON requests to the bridge and returns the answer.
* `simple_backend.py` exposes a handful of REST routes consumed by the React frontend.

---

## 🚀 Quick start (local dev)

```bash
# 1.  Ensure Python 3.11+ and Node gateway running (or mock)

# 2.  Install deps (virtualenv/venv recommended)
pip install -r requirements.txt

# 3.  Launch backend (auto-reload)
uvicorn app.main:app --reload --port 8000

# 4.  Open docs → http://localhost:8000/docs
```

> **Tip:** You can export `MESH_GATEWAY_URL` before launch to point at a non-default gateway address.

### using Docker

```bash
# Build image
docker build -t fastpay-backend .

# Run (maps port 8000)
docker run --rm -p 8000:8000 -e MESH_GATEWAY_URL=http://10.0.0.254:8080 fastpay-backend
```

---

## 🌐 API reference (MVP)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Simple liveness probe |
| GET | `/authorities?refresh=false` | Discover SmartPay authorities |
| GET | `/authorities/{name}` | Single authority details |
| POST | `/transfer?authority={name}` | Forward *TransferRequest* JSON to authority |
| POST | `/confirmation?authority={name}` | Forward *ConfirmationRequest* JSON to authority |
| POST | `/ping/{name}` | Ping authority through gateway |
| POST | `/ping-all` | Concurrent ping for all authorities |

### Payload examples

**TransferRequest**
```jsonc
{
  "sender": "alice",
  "recipient": "bob",
  "amount": 50,
  "token": "USDT",
  "sequence_number": 123 // optional
}
```

**ConfirmationRequest**
```jsonc
{
  "transfer_id": "0xdeadbeef",
  "signature": "0x…"   // optional – authority may add it
}
```

---

## 🛠️ Configuration

All settings are hard-coded for simplicity but can be overridden via **environment variables**:

| Var | Default | Purpose |
|-----|---------|---------|
| `MESH_GATEWAY_URL` | `http://10.0.0.254:8080` | URL of the HTTP bridge inside the NAT node |
| `HTTP_TIMEOUT` | `10` | Seconds for httpx requests |
| `SUPPORTED_TOKENS` | `USDT,USDC` | Comma-separated ERC-20 symbols |

---

## 🤖 Development tips

1. **Edit & save** – `uvicorn --reload` auto-refreshes.
2. Use `curl` or the interactive **Swagger UI** (`/docs`) for quick tests.
3. All logging goes through `structlog`, printed as JSON; pipe to `jq` for pretty output.
4. The backend is *stateless*: safe to scale horizontally behind a load-balancer.

---

## 📜 License

This backend follows the Apache-2.0 license of the wider *mininet-web* project. 