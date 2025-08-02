# Mininet-Web Frontend

> **React TypeScript application for offline payment operations on Etherlink blockchain.**
>
> Modern web interface for managing MeshPay accounts, processing offline transactions, and monitoring authority networks.

---

## ✨ Features

- **Interactive Network Map**: Real-time visualization of MeshPay authorities
- **Wallet Dashboard**: Account balances, transaction history, and registration status
- **Offline Payments**: Send USDT/USDC transfers without internet connectivity
- **Transfer Progress**: Real-time tracking of authority confirmations
- **Certificate Viewer**: Cryptographic proof of payment completion
- **Responsive Design**: Works on desktop and mobile devices

---

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Dashboard.tsx    # Main dashboard page
│   │   ├── NetworkMap.tsx   # Interactive authority map
│   │   ├── WalletDashboard.tsx # Balance and history display
│   │   ├── PaymentForm.tsx  # Payment interface
│   │   ├── DepositModal.tsx # Token deposit modal
│   │   ├── QuickPaymentModal.tsx # Quick payment form
│   │   ├── TransferProgressModal.tsx # Transfer progress tracking
│   │   └── CertificateViewer.tsx # Transaction certificates
│   ├── context/
│   │   └── WalletContext.tsx # Wallet state management
│   ├── services/
│   │   ├── api.ts          # Backend API integration
│   │   ├── server.ts       # Server service layer
│   │   └── cache.ts        # Local storage caching
│   ├── types/
│   │   └── api.ts          # TypeScript type definitions
│   ├── config/
│   │   └── contracts.ts    # Smart contract configuration
│   └── App.tsx             # Main React application
├── public/                 # Static assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite development configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** or **yarn**
- **Backend server** running on port 8000
- **Etherlink testnet** access

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp env.example .env.local

# 3. Configure environment variables
# Edit .env.local with your settings:
# VITE_SERVER_BASE_URL=http://localhost:8000
# VITE_ETHERLINK_RPC_URL=https://testnet-rpc.etherlink.com

# 4. Start development server
npm run dev

# 5. Open browser → http://localhost:3000
```

### Using Docker

```bash
# Build image
docker build -t meshpay-frontend .

# Run container
docker run --rm -p 3000:3000 \
  -e VITE_SERVER_BASE_URL=http://localhost:8000 \
  meshpay-frontend
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_SERVER_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_ETHERLINK_RPC_URL` | `https://testnet-rpc.etherlink.com` | Etherlink RPC endpoint |
| `VITE_MESHPAY_CONTRACT_ADDRESS` | `0x...` | MeshPayMVP contract address |

### Supported Tokens

The application supports the following tokens:

- **XTZ**: Native Tezos token (wrapped as ERC-20)
- **USDT**: Tether USD stablecoin
- **USDC**: USD Coin stablecoin

Token configurations are defined in `src/config/contracts.ts`.

---

## 🎯 Core Components

### Dashboard
- **MeshPay Balance Card**: Shows account balances for all supported tokens
- **Network Stats**: Authority network health and statistics
- **Quick Actions**: Deposit and payment buttons

### Network Map
- **Interactive Map**: Geographic visualization of authority locations
- **Authority Details**: Click to view authority information and status
- **Real-time Updates**: Live status updates via WebSocket

### Payment Flow
1. **Quick Payment Modal**: Enter recipient, amount, and select authority cluster
2. **Transfer Progress**: Real-time tracking of authority confirmations
3. **Certificate Generation**: Cryptographic proof of payment completion
4. **Broadcast Confirmation**: Final step to complete the transaction

### Wallet Management
- **Balance Display**: Real-time token balances from blockchain
- **Transaction History**: Recent transactions and their status
- **Account Registration**: Automatic registration during first deposit

---

## 🔌 API Integration

The frontend communicates with the backend through:

### REST API Endpoints
- `GET /wallet/{address}` - Account information and balances
- `POST /transactions/transfer` - Process transfer orders
- `GET /authorities` - Authority network information

### WebSocket Connection
- `ws://localhost:8000/ws/updates` - Real-time transaction updates

### Data Flow
```text
User Action → React Component → API Service → Backend → Etherlink Blockchain
                ↓
            State Update → UI Re-render → User Feedback
```

---

## 🎨 UI/UX Features

### Material-UI Design
- **Etherlink Theme**: Custom color scheme and styling
- **Responsive Layout**: Adapts to different screen sizes
- **Loading States**: Smooth loading indicators and progress bars
- **Error Handling**: User-friendly error messages and recovery

### Interactive Elements
- **Tooltips**: Helpful information for complex features
- **Modal Dialogs**: Focused interaction for payments and deposits
- **Real-time Updates**: Live data without page refresh
- **Form Validation**: Client-side validation with helpful feedback

---

## 🧪 Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Development Tips

1. **Hot Reload**: Changes automatically reflect in the browser
2. **TypeScript**: Full type safety with comprehensive type definitions
3. **ESLint**: Code quality and consistency enforcement
4. **Vite**: Fast development server and optimized builds
5. **React DevTools**: Browser extension for debugging

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage
```

---

## 📱 Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

---

## 🔒 Security

- **HTTPS Only**: All API calls use secure connections
- **Input Validation**: Client and server-side validation
- **Error Handling**: No sensitive data in error messages
- **CORS Protection**: Proper cross-origin request handling

---

## 📜 License

This frontend follows the Apache-2.0 license of the wider *mininet-web* project. 