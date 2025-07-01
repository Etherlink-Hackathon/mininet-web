# 🚀 Getting Started with FastPay MVP

Welcome to the **FastPay MVP** - a minimal viable implementation of the groundbreaking FastPay system originally designed by **Facebook/Meta**. This contract brings the core FastPay concepts to EVM blockchains like **Etherlink**.

## 🎯 What is FastPay?

FastPay is a **Byzantine fault-tolerant payment system** that enables **offline payments** with eventual settlement on the blockchain. Originally designed by Facebook (now Meta), it allows users to make payments even when disconnected from the network.

### Core FastPay Concepts

- **Primary Blockchain**: The main blockchain (Etherlink) where final settlement occurs
- **FastPay System**: Off-chain payment system for fast, offline transactions  
- **Funding**: Moving tokens from Primary to FastPay system
- **Redemption**: Settling FastPay transactions back to Primary blockchain
- **Transfer Certificates**: Cryptographic proofs of off-chain payments
- **Sequence Numbers**: Ensures ordering and prevents replay attacks

## 🏗️ Architecture Overview

```
Primary Blockchain (Etherlink)          FastPay Off-Chain System
┌─────────────────────────┐            ┌──────────────────────────┐
│  FastPay Smart Contract │◄──────────►│   Off-Chain Certificates │
│                         │   Fund/    │                          │
│  • Account Registration │   Redeem    │  • Fast Payments         │
│  • Token Funding        │            │  • Certificate Creation  │
│  • Certificate Redeem   │            │  • Offline Operation     │
│  • Sequence Tracking    │            │  • Eventual Settlement   │
└─────────────────────────┘            └──────────────────────────┘
```

## 📋 Core Functions

The FastPay MVP provides these essential operations:

```solidity
// Account management (maps to original FastPay concepts)
registerAccount()                                // Register FastPay account
isAccountRegistered(account)                     // Check registration
getAccountInfo(account)                          // Get account details

// Funding operations (Primary → FastPay)
handleFundingTransaction(token, amount)          // Fund FastPay account
getAccountBalance(account, token)                // Check FastPay balance
totalBalance(token)                              // Total system balance

// Transfer certificate operations (Off-chain FastPay)
createTransferCertificate(recipient, token, amount, sequenceNumber)  // Create payment certificate
getLastRedeemedSequence(account)                // Get last redeemed sequence

// Redemption operations (FastPay → Primary) 
handleRedeemTransaction(redeemTransaction)       // Settle certificate to Primary
isCertificateRedeemed(certificateHash)          // Check if certificate was processed
```

## 🏃‍♂️ Quick Start (Choose Your Platform)

### Windows (PowerShell) 
```powershell
# 1. Setup everything automatically
.\scripts\setup.ps1

# 2. Run comprehensive tests
.\scripts\test.ps1

# 3. Deploy to testnet
.\scripts\deploy.ps1 testnet
```

### Linux/Mac (Bash)
```bash
# 1. Setup everything automatically
./scripts/setup.sh

# 2. Run comprehensive tests
./scripts/test.sh

# 3. Deploy to testnet
./scripts/deploy.sh testnet
```

## 🔧 Manual Setup (If Needed)

If you prefer manual setup or the scripts don't work:

### 1. Install Foundry
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Setup Environment
```bash
# Copy environment template
cp env.example .env

# Edit .env with your private key
# PRIVATE_KEY=your_private_key_here
```

### 3. Install Dependencies & Build
```bash
forge install
forge build
```

### 4. Run Tests
```bash
forge test -vv
```

## 💡 Usage Examples

### Basic FastPay Workflow

```solidity
// 1. Register FastPay account (free, one-time setup)
fastPay.registerAccount();

// 2. Fund FastPay account from Primary blockchain
token.approve(address(fastPay), fundAmount);
fastPay.handleFundingTransaction(address(token), fundAmount);

// 3. Create transfer certificate for off-chain payment
// This is typically done offline/off-chain
bytes32 certHash = fastPay.createTransferCertificate(
    recipientAddress,
    tokenAddress,
    paymentAmount,
    sequenceNumber  // Must be > last redeemed sequence
);

// 4. Redeem certificate to Primary blockchain (settlement)
FastPay.RedeemTransaction memory redeemTx = FastPay.RedeemTransaction({
    transferCertificate: FastPay.TransferCertificate({
        sender: senderAddress,
        recipient: recipientAddress,
        token: tokenAddress,
        amount: paymentAmount,
        sequenceNumber: sequenceNumber,
        timestamp: certificateTimestamp
    }),
    signature: "" // Empty in MVP, would contain committee signatures in full system
});
fastPay.handleRedeemTransaction(redeemTx);
```

### JavaScript/TypeScript Integration

```javascript
// Connect to FastPay contract
const fastPay = new ethers.Contract(
    contractAddress,
    FastPayMVP_ABI,
    signer
);

// Register account
await fastPay.registerAccount();

// Fund FastPay account  
await token.approve(fastPay.address, fundAmount);
await fastPay.handleFundingTransaction(token.address, fundAmount);

// Check FastPay balance
const balance = await fastPay.getAccountBalance(userAddress, token.address);

// Get next sequence number
const lastSequence = await fastPay.getLastRedeemedSequence(userAddress);
const nextSequence = lastSequence + 1;

// Create transfer certificate
const certHash = await fastPay.createTransferCertificate(
    recipientAddress,
    token.address,
    amount,
    nextSequence
);

// Redeem certificate (when back online)
const redeemTx = {
    transferCertificate: {
        sender: senderAddress,
        recipient: recipientAddress,
        token: token.address,
        amount: amount,
        sequenceNumber: nextSequence,
        timestamp: Math.floor(Date.now() / 1000)
    },
    signature: "0x" // Empty for MVP
};
await fastPay.handleRedeemTransaction(redeemTx);
```

## 🌐 Network Deployment

### Local Development
```bash
# Start Anvil (local blockchain)
anvil

# Deploy to local network  
./scripts/deploy.sh local  # or .\scripts\deploy.ps1 local
```

### Etherlink Testnet (Recommended)
```bash
# Deploy to Etherlink testnet
./scripts/deploy.sh testnet  # or .\scripts\deploy.ps1 testnet
```

### Etherlink Mainnet (Production)
```bash
# Deploy to Etherlink mainnet (with confirmation)
./scripts/deploy.sh mainnet  # or .\scripts\deploy.ps1 mainnet
```

## 💰 Gas Costs on Etherlink

| Operation | Est. Gas | Cost @ $0.001 | Description |
|-----------|----------|---------------|-------------|
| Register Account | ~50K | ~$0.00005 | One-time account setup |
| Fund Account | ~80K | ~$0.00008 | Transfer tokens Primary → FastPay |
| Create Certificate | ~60K | ~$0.00006 | Generate off-chain payment proof |
| Redeem Certificate | ~100K | ~$0.0001 | Settle FastPay → Primary |

**Total cost for complete payment cycle: ~$0.0003 (nearly free!)**

## 🔒 Security & Validation

### Built-in Security Features
✅ **Sequence Number Validation** - Prevents replay attacks like original FastPay  
✅ **Balance Validation** - Ensures sufficient funds at all times  
✅ **Certificate Uniqueness** - Each certificate can only be redeemed once  
✅ **Account Registration** - Only registered accounts can participate  
✅ **Reentrancy Protection** - Safe against reentrancy attacks  
✅ **Safe Token Transfers** - Using OpenZeppelin SafeERC20  

### FastPay Security Model
The original FastPay design includes committee-based validation for maximum security. This MVP simplifies that model while maintaining core security properties:

- **Sequence Numbers**: Like original FastPay, prevents double-spending
- **Certificate Hashing**: Ensures certificate integrity
- **Balance Tracking**: Maintains system invariants
- **Time-based Validation**: Certificates expire after 24 hours

## 🧪 Testing Coverage

The MVP includes comprehensive tests covering original FastPay concepts:
- ✅ Account registration and management
- ✅ Funding transactions (Primary → FastPay)  
- ✅ Transfer certificate creation and validation
- ✅ Redemption transactions (FastPay → Primary)
- ✅ Sequence number validation and replay protection
- ✅ Edge cases and error conditions
- ✅ Fuzz testing for robustness

Run tests:
```bash
forge test                    # Basic tests
forge test -vv               # Verbose output
forge test --gas-report      # Gas usage report
forge coverage               # Coverage report
```

## 🔗 Integration Patterns

### Off-Chain Certificate Generation
```javascript
// Generate certificate off-chain (when offline)
function generateOfflinePayment(sender, recipient, token, amount) {
    const sequenceNumber = getNextSequenceNumber(sender);
    const certificate = {
        sender: sender,
        recipient: recipient, 
        token: token,
        amount: amount,
        sequenceNumber: sequenceNumber,
        timestamp: Date.now()
    };
    
    // Store certificate locally for later redemption
    storeOfflineCertificate(certificate);
    return certificate;
}

// Redeem certificates when back online
async function redeemOfflineCertificates() {
    const certificates = getStoredCertificates();
    for (const cert of certificates) {
        const redeemTx = {
            transferCertificate: cert,
            signature: "0x" // MVP doesn't use signatures
        };
        await fastPay.handleRedeemTransaction(redeemTx);
    }
}
```

### Backend Integration
```javascript
// Monitor FastPay events
fastPay.on('FundingCompleted', (sender, token, amount, txIndex) => {
    console.log(`Account ${sender} funded ${amount} ${token}`);
    updateAccountBalance(sender, token, amount);
});

fastPay.on('RedemptionCompleted', (sender, recipient, token, amount, sequence) => {
    console.log(`Payment ${amount} ${token} from ${sender} to ${recipient}`);
    recordPayment(sender, recipient, token, amount, sequence);
});

fastPay.on('TransferCertificateCreated', (sender, recipient, certHash) => {
    console.log(`Certificate created: ${certHash}`);
    trackCertificate(certHash, sender, recipient);
});
```

## 🛠️ Troubleshooting FastPay Issues

### Common FastPay-Specific Issues

**Q: "Invalid sequence number" error**  
A: Sequence numbers must be strictly increasing. Check `getLastRedeemedSequence()` and use the next number.

**Q: "Certificate already redeemed" error**  
A: Each certificate can only be redeemed once. Check `isCertificateRedeemed()` first.

**Q: "Account not registered" error**  
A: Call `registerAccount()` before any other operations.

**Q: "Insufficient balance" error**  
A: Use `handleFundingTransaction()` to move tokens from Primary to FastPay first.

### Debug Commands
```bash
# Check account status
cast call $CONTRACT_ADDRESS "getAccountInfo(address)" $ACCOUNT_ADDRESS

# Check balance
cast call $CONTRACT_ADDRESS "getAccountBalance(address,address)" $ACCOUNT_ADDRESS $TOKEN_ADDRESS

# Check last redeemed sequence
cast call $CONTRACT_ADDRESS "getLastRedeemedSequence(address)" $ACCOUNT_ADDRESS

# Check if certificate is redeemed
cast call $CONTRACT_ADDRESS "isCertificateRedeemed(bytes32)" $CERT_HASH
```

## 📚 FastPay Resources

### Original FastPay Paper
- **Title**: "FastPay: High-Performance Byzantine Fault Tolerant Settlement"
- **Authors**: Mathieu Baudet, Alberto Sonnino, Mahimna Kelkar, George Danezis
- **Organization**: Facebook (Meta)

### Key FastPay Concepts
- **Byzantine Fault Tolerance**: Resilient to malicious actors
- **Causal Order**: Transactions maintain causal relationships  
- **Committee Consensus**: Distributed validation (simplified in MVP)
- **Offline Capability**: Payments work without network connectivity

## 🚀 Next Steps

1. **Deploy MVP** - Get FastPay running on Etherlink testnet
2. **Test Offline Flows** - Implement certificate generation/redemption
3. **Integrate Backend** - Connect with your existing systems
4. **Scale to Production** - Deploy to Etherlink mainnet
5. **Enhance Features** - Add committee validation for production use

---

**🎉 You now have FastPay running on Etherlink!**

This MVP captures the essential spirit of Facebook's FastPay design while being deployable today. The simplified architecture makes it perfect for understanding FastPay concepts and building real offline payment systems.

**FastPay + Etherlink = Fast, Fair, and (Nearly) Free Offline Payments** 🌟 