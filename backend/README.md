# Mininet-Web Backend

> **FastAPI service that bridges the React web UI to Etherlink Blockchain for offline payment operations.**
>
> Provides REST API endpoints for wallet management, transaction processing, and blockchain state queries.

---

## ✨ What's inside?

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── core/
│   │   └── config.py        # Configuration management
│   ├── models/
│   │   └── base.py          # Pydantic models for API responses
│   ├── services/
│   │   └── blockchain_client.py # Etherlink blockchain integration
│   └── api/v1/
│       ├── endpoints/
│       │   ├── authorities.py # Authority network management
│       │   ├── transactions.py # Transaction processing
│       │   ├── wallet.py    # Wallet balance and account info
│       │   └── websocket.py # Real-time updates
│       └── router.py        # API routing
├── requirements.txt         # Python dependencies
└── Dockerfile               # Container image (production & dev)
```

---

## 🔌 High-level flow

```text
Frontend (React)  ─┐                  │
                   │  REST / JSON    │
                   ▼                  │
   FastAPI Backend (main.py)          │
                   │  Web3 / RPC     │
                   ▼                  │
       blockchain_client.py  ───────►  Etherlink Blockchain
                   │                  │
                   │  Smart Contract  │
                   ▼                  ▼
             MeshPayMVP Contract  …  Token Contracts (USDT/USDC)
```

* The **backend** exposes REST API endpoints for wallet operations, transaction processing, and blockchain state queries.
* `blockchain_client.py` handles all interactions with Etherlink blockchain using Web3.py.
* Smart contracts manage account registration, token funding, and transfer certificate redemption.
* Real-time updates are provided via WebSocket connections.

---

## 🚀 Quick start (local dev)

```bash
# 1.  Ensure Python 3.9+ and Etherlink RPC access

# 2.  Install dependencies (virtualenv/venv recommended)
pip install -r requirements.txt

# 3.  Set environment variables
export ETHERLINK_RPC_URL="https://testnet-rpc.etherlink.com"
export MESHPAY_CONTRACT_ADDRESS="0x..."
export BACKEND_PRIVATE_KEY="0x..."

# 4.  Launch backend (auto-reload)
uvicorn app.main:app --reload --port 8000

# 5.  Open docs → http://localhost:8000/docs
```

> **Tip:** You can use the provided `.env.example` file to configure your environment variables.

### Using Docker

```bash
# Build image
docker build -t meshpay-backend .

# Run (maps port 8000)
docker run --rm -p 8000:8000 \
  -e ETHERLINK_RPC_URL=https://testnet-rpc.etherlink.com \
  -e MESHPAY_CONTRACT_ADDRESS=0x... \
  -e BACKEND_PRIVATE_KEY=0x... \
  meshpay-backend
```

---

## 🌐 API reference

### Wallet Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/wallet/{address}` | Get account information and balances |
| GET | `/wallet/{address}/balances` | Get token balances for account |
| GET | `/wallet/{address}/registration` | Check account registration status |

### Authority Network

| Method | Path | Description |
|--------|------|-------------|
| GET | `/authorities` | Get all available authorities |
| GET | `/authorities/{name}` | Get specific authority details |
| POST | `/authorities/{name}/ping` | Ping authority for health check |

### Real-time Updates

| Method | Path | Description |
|--------|------|-------------|
| WebSocket | `/ws/updates` | Real-time transaction and authority updates |

### System Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health check |
| GET | `/contract/stats` | Smart contract statistics |

### Payload examples

**Account Info Response**
```jsonc
{
  "address": "0x...",
  "balances": {
    "USDT": {
      "token_symbol": "USDT",
      "token_address": "0x...",
      "wallet_balance": "1000.0",
      "meshpay_balance": "500.0",
      "total_balance": "1500.0",
      "decimals": 18
    }
  },
  "is_registered": true,
  "registration_time": 1704067200,
  "last_redeemed_sequence": 0
}
```

---

## 🛠️ Configuration

All settings can be configured via **environment variables**:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ETHERLINK_RPC_URL` | `https://testnet-rpc.etherlink.com` | Etherlink RPC endpoint |
| `CHAIN_ID` | `128123` | Etherlink testnet chain ID |
| `MESHPAY_CONTRACT_ADDRESS` | `0x...` | Deployed MeshPayMVP contract address |
| `BACKEND_PRIVATE_KEY` | `0x...` | Backend account private key |
| `WTZ_CONTRACT_ADDRESS` | `0x...` | Wrapped XTZ token contract |
| `USDT_CONTRACT_ADDRESS` | `0x...` | USDT token contract |
| `USDC_CONTRACT_ADDRESS` | `0x...` | USDC token contract |

---

## 🔧 Smart Contract Integration

The backend integrates with the following smart contracts on Etherlink:

### MeshPayMVP Contract
- **Account Registration**: Automatic registration during funding
- **Token Funding**: Transfer tokens from primary blockchain to MeshPay system
- **Transfer Certificates**: Create and redeem off-chain payment certificates
- **Authority Management**: Manage authority permissions and activities

### Token Contracts
- **USDT/USDC**: Standard ERC-20 token contracts
- **Wrapped XTZ**: Native XTZ wrapped as ERC-20 token
- **Balance Tracking**: Real-time balance queries and updates

---

## 📊 Monitoring & Health

- **Health Check**: `/health` endpoint for load balancer integration
- **Contract Stats**: `/contract/stats` for smart contract metrics
- **Real-time Updates**: WebSocket endpoint for live transaction tracking
- **Error Handling**: Comprehensive error responses with detailed messages

---

## 📜 License

This backend follows the Apache-2.0 license of the wider *mininet-web* project. 