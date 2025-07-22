# Etherlink Offline Payment Web Application

## 🚀 Project Overview

This is a web application for the **Etherlink Summer Camp** that enables **offline stablecoin payments** (USDT/USDC) without internet connectivity. The application interfaces with a SmartPay authority network running on `mininet-wifi` to verify and process transactions through local TCP communication.

## 🌟 Key Features

- **🗺️ Interactive Map**: Shows nearby shards/authorities that can verify transactions
- **💰 Wallet Interface**: View balance, transaction history, and manage payments
- **📱 Offline-First**: Works without internet using local authority networks
- **🔒 Secure Certificates**: Display transaction certificates for proof of payment
- **🎯 Real-time Updates**: Live status of authorities and network connectivity
- **📊 Analytics Dashboard**: Transaction metrics and network performance

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Web Frontend      │    │   Backend API       │    │  SmartPay Network    │
│   (React + Map)     │◄──►│   (FastAPI)         │◄──►│  (mininet-wifi)     │
│                     │    │                     │    │                     │
│ • Interactive Map   │    │ • Authority Proxy   │    │ • WiFi Authorities  │
│ • Payment UI        │    │ • Transaction API   │    │ • Client Nodes      │
│ • Certificate View  │    │ • WebSocket Updates │    │ • P2P Network       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## 📁 Project Structure

```
mininet-web/
├── backend/                 # FastAPI backend server
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # FastAPI main application
│   │   ├── api/            # API routes
│   │   ├── core/           # Core business logic
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Service layer
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docs/                   # Documentation
├── docker-compose.yml      # Development environment
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose
- Running mininet-wifi with SmartPay authorities

### 1. Clone and Setup

```bash
cd mininet-web
```

### 2. Start Development Environment

```bash
# Start all services
docker compose up -d

# Or run individually:
# Backend
cd backend && python -m uvicorn app.main:app --reload --port 8000

# Frontend  
cd frontend && npm start
```

### 3. Access the Application

- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/ws

## 🎯 Usage Guide

### 1. **View Network Map**
   - See nearby authorities as interactive markers
   - Click on authorities to view shard information
   - Real-time status indicators (online/offline)

### 2. **Check Balance**
   - View current USDT/USDC balance
   - Transaction history with certificates
   - Pending transaction status

### 3. **Make Payment**
   - Enter recipient address and amount
   - Select nearby authorities for verification
   - Receive transaction certificate upon confirmation

### 4. **Manage Certificates**
   - View transaction certificates
   - Export/share proof of payments
   - Verify certificate authenticity

## 🔧 Configuration

### Backend Configuration (`backend/app/core/config.py`)

```python
# SmartPay Authority Network
AUTHORITY_DISCOVERY_PORT = 8080
AUTHORITY_TIMEOUT = 5.0
MIN_QUORUM_SIZE = 3

# Stablecoin Configuration
SUPPORTED_TOKENS = ["USDT", "USDC"]
DEFAULT_TOKEN = "USDT"

# WebSocket Settings
WS_HEARTBEAT_INTERVAL = 30
```

### Frontend Configuration (`frontend/src/config.ts`)

```typescript
export const config = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  mapCenter: [37.7749, -122.4194], // San Francisco
  defaultZoom: 12,
  refreshInterval: 5000,
};
```

## 📡 API Endpoints

### Authority Management
- `GET /api/authorities` - List nearby authorities
- `GET /api/authorities/{id}` - Get authority details
- `GET /api/authorities/{id}/shards` - Get authority shards

### Transactions
- `POST /api/transactions/transfer` - Initiate payment
- `GET /api/transactions/{id}` - Get transaction status
- `GET /api/transactions/{id}/certificate` - Get transaction certificate

### Wallet
- `GET /api/wallet/balance` - Get current balance
- `GET /api/wallet/history` - Get transaction history

### Real-time Updates
- `WS /ws` - WebSocket for real-time updates

## 🔒 Security Features

- **Certificate Validation**: All transactions include cryptographic certificates
- **Offline Verification**: Transactions verified by local authority network
- **Transport Security**: Secure TCP communication with authorities
- **Input Validation**: Comprehensive input sanitization and validation

## 🎨 UI Components

### Key React Components

1. **`<NetworkMap />`** - Interactive authority network map
2. **`<WalletDashboard />`** - Balance and transaction overview
3. **`<PaymentForm />`** - Payment initiation interface
4. **`<CertificateViewer />`** - Transaction certificate display
5. **`<AuthorityCard />`** - Authority information display

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
# Start test environment
docker compose -f docker-compose.test.yml up
```

## 📦 Deployment

### Production Build

```bash
# Build all services
docker compose -f docker-compose.prod.yml build

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=your-secret-key

# Frontend
REACT_APP_API_URL=https://api.yourapp.com
REACT_APP_WS_URL=wss://api.yourapp.com/ws
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Etherlink Documentation**: https://docs.etherlink.com/
- **SmartPay Repository**: ../fastpay/
- **Mininet-WiFi**: ../mininet-wifi/

## 🎯 Etherlink Summer Camp Submission

This project demonstrates:
- ✅ **Offline-first architecture** using SmartPay protocol
- ✅ **Stablecoin integration** (USDT/USDC)
- ✅ **Real-time network visualization**
- ✅ **Cryptographic transaction certificates**
- ✅ **User-friendly payment interface**
- ✅ **Integration with existing SmartPay infrastructure**

---

**Built with ❤️ for the Etherlink Summer Camp 2025** # mininet-web
