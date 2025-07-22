# Mininet-Web Project Prompt

## Project Overview

You are working on **mininet-web**, a comprehensive **offline payment web application** designed for the **Etherlink Summer Camp**. This is a production-ready system that enables **offline stablecoin payments** (USDT/USDC) without internet connectivity by interfacing with a MeshPay authority network running on `mininet-wifi`.

## Project Context & Goals

### Core Mission
Create a beautiful, intuitive web application that demonstrates **offline blockchain payments** using:
- **Etherlink** (EVM Layer 2 on Tezos) for final settlement
- **MeshPay protocol** (Facebook/Meta research) for offline consensus  
- **mininet-wifi** infrastructure for local authority networks
- **React + FastAPI** for modern web interface

### Key Innovation
This system enables **real offline payments** where users can send USDT/USDC transfers even without internet, using local WiFi authorities for Byzantine fault-tolerant consensus, with eventual settlement on Etherlink blockchain.

## Architecture Overview

```
Frontend (React)           Backend (FastAPI)         MeshPay Network        Etherlink Blockchain
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐     ┌─────────────────┐
│ • Interactive   │◄─────►│ • Authority     │◄─────►│ • WiFi          │◄───►│ • Smart         │
│   Network Map   │       │   Client (TCP)  │       │   Authorities   │     │   Contracts     │
│ • Payment UI    │       │ • Transaction   │       │ • Committee     │     │ • Final         │
│ • Certificate   │       │   API           │       │   Consensus     │     │   Settlement    │
│   Viewer        │       │ • WebSocket     │       │ • P2P Network   │     │ • Token Vaults  │
│ • Real-time     │       │   Updates       │       │ • Offline       │     │ • Authority     │
│   Dashboard     │       │ • MeshPay       │       │   Capability    │     │   Management    │
└─────────────────┘       │   Protocol      │       └─────────────────┘     └─────────────────┘
                          └─────────────────┘
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI** for Etherlink-themed interface
- **Leaflet/OpenLayers** for interactive network maps
- **WebSocket** for real-time updates
- **Vite** for development and building
- **Docker** for containerization

### Backend  
- **FastAPI** with Python 3.9+
- **TCP client** for MeshPay authority communication
- **WebSocket** for real-time frontend updates
- **Pydantic** models matching MeshPay protocol
- **Authority discovery** on `10.0.0.0/8` network
- **Docker** for containerization

### Smart Contracts
- **Solidity** contracts for Etherlink deployment
- **MeshPay MVP** implementation (based on Facebook research)
- **Foundry** for development and testing
- **OpenZeppelin** for security standards
- **Multi-token support** (USDT, USDC)

### Infrastructure
- **mininet-wifi** for WiFi authority networks
- **Docker Compose** for development environment
- **MeshPay protocol** for offline consensus
- **Etherlink** for final blockchain settlement

## Core Features & Components

### 1. Interactive Network Map
- **Real-time visualization** of nearby MeshPay authorities
- **Geographic positioning** with status indicators
- **Authority details** on click (shard info, connectivity)  
- **Network health monitoring** with live updates

### 2. Offline Payment System
- **Stablecoin transfers** (USDT/USDC) without internet
- **Multi-authority verification** for Byzantine fault tolerance
- **Transaction certificates** with cryptographic proofs
- **Real-time status tracking** through consensus process

### 3. Transaction Certificates
- **Cryptographic proof** of payment completion
- **Authority signatures** for transaction finality
- **Certificate viewer** with detailed information
- **Export/share capabilities** for verification

### 4. Smart Contract Integration
- **MeshPay MVP contract** aligned with original Facebook research
- **Account registration** and token funding
- **Transfer certificate** creation and redemption
- **Sequence number validation** for replay protection
- **Etherlink deployment** with nearly-free transactions

## File Structure

```
mininet-web/
├── README.md                     # Project documentation
├── IMPLEMENTATION_SUMMARY.md     # Technical implementation details
├── SMART_CONTRACT_PLAN.TXT       # Blockchain integration strategy
├── docker-compose.yml            # Development environment
├── scripts/start-dev.sh          # One-command startup
│
├── frontend/                     # React TypeScript Application
│   ├── src/
│   │   ├── App.tsx              # Main React application
│   │   ├── components/          # Reusable UI components
│   │   │   ├── NetworkMap.tsx   # Interactive authority map
│   │   │   ├── WalletDashboard.tsx # Balance and history
│   │   │   ├── PaymentForm.tsx  # Payment interface
│   │   │   └── CertificateViewer.tsx # Transaction certificates
│   │   ├── pages/
│   │   │   └── Dashboard.tsx    # Main dashboard page
│   │   ├── services/            # API integration layer
│   │   ├── types/               # TypeScript definitions
│   │   └── config/              # Configuration management
│   ├── package.json             # Dependencies and scripts
│   └── Dockerfile               # Frontend container
│
├── backend/                      # FastAPI Python Backend
│   ├── app/
│   │   ├── main.py              # FastAPI application entry
│   │   ├── core/
│   │   │   └── config.py        # Configuration management
│   │   ├── models/
│   │   │   └── base.py          # Pydantic models (MeshPay types)
│   │   ├── services/
│   │   │   └── authority_client.py # TCP client for authorities
│   │   └── api/v1/
│   │       ├── endpoints/
│   │       │   ├── authorities.py # Authority management
│   │       │   ├── transactions.py # Transaction processing
│   │       │   ├── wallet.py    # Balance and history
│   │       │   └── websocket.py # Real-time updates
│   │       └── router.py        # API routing
│   ├── requirements.txt         # Python dependencies
│   └── Dockerfile               # Backend container
│
└── smart-contract/               # Etherlink Smart Contracts
    ├── contracts/
    │   └── MeshPayMVP.sol       # Main MeshPay implementation
    ├── test/
    │   └── MeshPayMVP.t.sol     # Comprehensive tests
    ├── script/
    │   └── DeployMVP.s.sol      # Deployment script
    ├── scripts/                 # Cross-platform automation
    │   ├── setup.sh/.ps1        # Environment setup
    │   ├── test.sh/.ps1         # Run tests
    │   └── deploy.sh/.ps1       # Deploy contracts
    ├── foundry.toml             # Foundry configuration
    └── GETTING_STARTED.md       # MeshPay tutorial
```

## MeshPay Protocol Integration

### Authority Discovery
- **Network scanning** on `10.0.0.0/8` for authorities at port `8080`
- **TCP communication** using MeshPay protocol messages
- **Real-time status monitoring** of authority availability

### Protocol Messages
- **`TRANSFER_REQUEST`** - Initiate offline payments
- **`CONFIRMATION_ORDER`** - Obtain transaction certificates
- **`BALANCE_REQUEST`** - Query account balances  
- **`DISCOVERY_REQUEST`** - Find available authorities

### Consensus Process
- **Byzantine fault tolerance** through committee consensus
- **Sequence number validation** for replay protection
- **Certificate generation** with authority signatures
- **Offline operation** without internet connectivity

## Smart Contract Architecture

### MeshPay MVP Contract
```solidity
// Core MeshPay operations (following original Facebook research)
registerAccount()                                    // MeshPay account registration
handleFundingTransaction(token, amount)              // Primary → MeshPay funding  
createTransferCertificate(recipient, token, amount, sequenceNumber) // Off-chain certificate
handleRedeemTransaction(redeemTransaction)           // MeshPay → Primary settlement
```

### Key Features
- **Account management** with free registration
- **Token funding** (Primary blockchain → MeshPay system)
- **Certificate creation** for off-chain payments
- **Redemption processing** (MeshPay → Primary settlement)
- **Sequence validation** preventing replay attacks
- **Multi-token support** (any ERC20)

### Etherlink Deployment
- **Nearly-free transactions** (~$0.001 per operation)
- **Sub-second finality** (~500ms confirmation)
- **EVM compatibility** with existing tools
- **Foundry development environment**

## Development Workflow

### Quick Start
```bash
# Start entire development environment
cd mininet-web && ./scripts/start-dev.sh

# Access points:
# Web App: http://localhost:3000  
# API Docs: http://localhost:8000/docs
# WebSocket: ws://localhost:8000/ws
```

### Smart Contract Development
```bash
cd smart-contract

# Setup (installs Foundry if needed)
./scripts/setup.sh

# Test MeshPay implementation
./scripts/test.sh

# Deploy to Etherlink testnet
./scripts/deploy.sh testnet
```

### Integration Testing
- **Local authority network** via mininet-wifi
- **Mock MeshPay authorities** for development
- **End-to-end payment flows** with certificate verification
- **Real-time updates** through WebSocket connections

## Key Technical Challenges

### 1. Offline Consensus
- **Byzantine fault tolerance** in WiFi networks
- **Authority coordination** without central server
- **Certificate validation** with multiple signatures
- **Network partition handling**

### 2. Real-time Synchronization
- **WebSocket updates** for authority status
- **Live transaction tracking** through consensus
- **Network topology changes** with authority addition/removal
- **Balance reconciliation** between off-chain and on-chain

### 3. User Experience
- **Intuitive payment flows** for offline operation
- **Clear feedback** during consensus process  
- **Certificate presentation** for transaction proof
- **Network visualization** with geographic context

## Integration Points

### With Existing MeshPay Network
- **Authority auto-discovery** on local network
- **Protocol message translation** between web API and MeshPay
- **Certificate verification** using existing infrastructure
- **Committee consensus** through established authorities

### With Etherlink Blockchain
- **Smart contract deployment** for final settlement
- **Event monitoring** for on-chain transactions
- **Token vault management** for USDT/USDC
- **Gas optimization** for nearly-free operations

## Performance Requirements

### Frontend
- **Real-time map updates** (< 100ms latency)
- **Responsive design** for mobile/desktop
- **Offline-first architecture** with local caching
- **Progressive loading** for large authority networks

### Backend  
- **Low-latency TCP** communication with authorities
- **Concurrent transaction** processing
- **WebSocket scaling** for multiple clients
- **Authority health monitoring**

### Smart Contracts
- **Gas optimization** for Etherlink deployment
- **Batch processing** for multiple transactions
- **Emergency procedures** for system recovery
- **Upgrade strategies** for contract evolution

## Security Considerations

### Network Security
- **TCP connection security** with authorities
- **Certificate validation** against replay attacks
- **Authority authentication** and authorization
- **Network partition resilience**

### Smart Contract Security
- **Reentrancy protection** on all external calls
- **Access control** for privileged operations
- **Emergency pause** mechanisms
- **Comprehensive test coverage**

### User Security
- **Transaction certificate** integrity
- **Balance verification** across systems
- **Private key management** (if applicable)
- **Audit trail** for all operations

## Success Metrics

### Technical Metrics
- **Transaction throughput** (offline payments/second)
- **Consensus latency** (time to certificate generation)
- **Network uptime** (authority availability)
- **Gas efficiency** (Etherlink deployment costs)

### User Experience Metrics
- **Payment completion rate** (successful offline transfers)
- **Interface responsiveness** (< 100ms interactions)
- **Certificate generation time** (< 5 seconds)
- **Error recovery** (network partition handling)

---

## Instructions for AI Assistants

When working on this project:

1. **Understand the Context**: This is a complex integration of multiple technologies (React, FastAPI, MeshPay protocol, Etherlink blockchain) for offline payments.

2. **Maintain Architecture**: Respect the separation between frontend, backend, smart contracts, and MeshPay network layers.

3. **Follow Conventions**: Use TypeScript for frontend, Python type hints for backend, and comprehensive Solidity documentation.

4. **Focus on Integration**: Ensure all components work together seamlessly, especially the offline payment flows.

5. **Prioritize UX**: The system must be intuitive for users making offline payments, with clear feedback and status indicators.

6. **Consider Security**: Every component handles financial transactions and must implement appropriate security measures.

7. **Test Thoroughly**: All changes should include comprehensive tests, especially for critical payment flows.

8. **Document Everything**: Maintain clear documentation for this complex multi-technology system.

This project demonstrates the future of blockchain payments: **fast, fair, nearly-free, and capable of working offline** - perfectly showcasing Etherlink's capabilities for the Summer Camp. 