# FastPay Smart Contract Integration Setup

This guide will help you configure the frontend to connect with your deployed FastPay smart contracts on Etherlink.

## Prerequisites

1. **Deploy FastPay Contract**: First, deploy the `FastPayMVP.sol` contract to Etherlink testnet or mainnet using the smart-contract directory.
2. **Get Token Addresses**: Obtain the USDT and USDC contract addresses on Etherlink.
3. **Privy Account**: Sign up at [https://console.privy.io/](https://console.privy.io/) to get your App ID.

## Environment Configuration

Create a `.env.local` file in the `frontend` directory with the following variables:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/api/v1/ws/updates

# Privy Configuration
VITE_PRIVY_APP_ID=your-privy-app-id-here

# Etherlink Testnet Contract Addresses (Chain ID: 128123)
VITE_FASTPAY_CONTRACT_ADDRESS_TESTNET=0x1234567890123456789012345678901234567890
VITE_USDT_CONTRACT_ADDRESS_TESTNET=0xabc1234567890123456789012345678901234567890
VITE_USDC_CONTRACT_ADDRESS_TESTNET=0xdef1234567890123456789012345678901234567890

# Etherlink Mainnet Contract Addresses (Chain ID: 42793)
VITE_FASTPAY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_USDT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_USDC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## Contract Deployment Steps

### 1. Deploy FastPay Contract

```bash
cd smart-contract
./scripts/setup.sh          # Install dependencies
./scripts/test.sh           # Run tests
./scripts/deploy.sh testnet # Deploy to testnet
```

### 2. Get Contract Address

After deployment, copy the FastPay contract address from the deployment output and update your `.env.local` file.

### 3. Find Token Addresses

For Etherlink testnet, you may need to deploy test tokens or find existing ones:

- Check Etherlink explorer: [https://testnet.explorer.etherlink.com](https://testnet.explorer.etherlink.com)
- Look for USDT/USDC contracts or deploy your own test tokens

### 4. Configure Privy

1. Go to [https://console.privy.io/](https://console.privy.io/)
2. Create a new app
3. Copy your App ID
4. Update `VITE_PRIVY_APP_ID` in `.env.local`

## Wallet Features

Once configured, users can:

### 1. **Connect Wallet**
- Connect using Privy (email, SMS, or external wallet)
- Automatically detects Etherlink network

### 2. **Register with FastPay**
- One-time registration with the FastPay system
- Free transaction to register account

### 3. **View Balances**
- **Wallet Balance**: Regular USDT/USDC in user's wallet
- **FastPay Balance**: Tokens deposited into FastPay system
- **Total Balance**: Combined balance across both systems

### 4. **Deposit to FastPay**
- Two-step process: Approve + Deposit
- Moves tokens from wallet to FastPay system
- Enables offline payments

### 5. **Make Offline Payments**
- Use FastPay balance for offline transactions
- Works through the existing FastPay network
- Transactions confirmed by committee consensus

## Development

Start the development server:

```bash
cd frontend
npm run dev
```

The wallet page will be available at [http://localhost:3000/wallet](http://localhost:3000/wallet)

## Troubleshooting

### Common Issues

1. **"Contract addresses not configured"**
   - Ensure `.env.local` file exists with correct contract addresses
   - Restart development server after changing environment variables

2. **"Please connect your wallet"**
   - Configure Privy App ID correctly
   - Check browser wallet connections

3. **"Register your account with FastPay"**
   - Click the Register button in the alert
   - Ensure wallet has enough XTZ for gas fees

4. **Transaction failures**
   - Check network connectivity
   - Ensure sufficient token balance
   - Verify contract addresses are correct

### Network Information

- **Etherlink Testnet**: Chain ID 128123
- **Etherlink Mainnet**: Chain ID 42793
- **RPC URLs**: Configured in `src/config/chains.ts`

## Smart Contract Functions Used

The frontend integrates with these FastPay contract functions:

- `registerAccount()` - Register with FastPay system
- `isAccountRegistered(address)` - Check registration status  
- `getAccountBalance(address, token)` - Get FastPay balance
- `handleFundingTransaction(token, amount)` - Deposit to FastPay
- `createTransferCertificate(...)` - Create offline payment certificate

## Security Notes

- Contract addresses are stored in environment variables
- Private keys managed by Privy or user's wallet
- All transactions require user approval
- FastPay system provides additional security through committee consensus

For more information, see the smart contract documentation in `../smart-contract/GETTING_STARTED.md`. 