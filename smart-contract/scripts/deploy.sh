#!/bin/bash

# FastPay MVP Deployment Script
# This script deploys the MVP smart contract to different networks

echo "🚀 FastPay MVP Deployment Script"
echo "================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    print_error "Foundry not found. Please install Foundry first:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please create it from env.example"
    echo "cp env.example .env"
    echo "Then edit .env with your configuration"
    exit 1
fi

# Load environment variables
source .env

# Check network argument
NETWORK=${1:-"local"}

print_info "Deploying to network: $NETWORK"

# Set RPC URL and other parameters based on network
case $NETWORK in
    "local")
        RPC_URL="http://localhost:8545"
        VERIFY_FLAG=""
        print_info "Using local Anvil node"
        ;;
    "testnet")
        RPC_URL="https://node.ghostnet.etherlink.com"
        VERIFY_FLAG="--verify"
        print_info "Using Etherlink Testnet"
        ;;
    "mainnet")
        RPC_URL="https://node.mainnet.etherlink.com"
        VERIFY_FLAG="--verify"
        print_warning "Deploying to MAINNET! Are you sure? (y/N)"
        read -r response
        if [[ ! $response =~ ^[Yy]$ ]]; then
            print_info "Deployment cancelled"
            exit 0
        fi
        ;;
    *)
        print_error "Invalid network. Use: local, testnet, or mainnet"
        exit 1
        ;;
esac

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    print_error "PRIVATE_KEY not set in .env file"
    exit 1
fi

# Build contracts first
echo ""
echo "🔨 Building contracts..."
if forge build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Run tests before deployment
echo ""
echo "🧪 Running tests before deployment..."
if forge test; then
    print_status "All tests passed"
else
    print_error "Tests failed. Deployment cancelled."
    exit 1
fi

# Deploy the contract
echo ""
echo "🚀 Deploying FastPayMVP contract..."
print_info "Network: $NETWORK"
print_info "RPC URL: $RPC_URL"

DEPLOY_COMMAND="forge script script/DeployMVP.s.sol:DeployMVP --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast $VERIFY_FLAG"

print_info "Running deployment command..."
if eval $DEPLOY_COMMAND; then
    print_status "Deployment successful!"
else
    print_error "Deployment failed"
    exit 1
fi

echo ""
print_status "FastPay MVP deployed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "- Network: $NETWORK"
echo "- RPC URL: $RPC_URL"
echo "- Contract: FastPayMVP"
echo "- Verification: $([ -n "$VERIFY_FLAG" ] && echo "✅ Enabled" || echo "❌ Disabled")"
echo ""
echo "📄 Check the broadcast directory for deployment details"
echo "📄 Contract address and transaction hash are logged above"
echo ""
print_info "Next steps:"
echo "1. Save the contract address for your application"
echo "2. Update your frontend/backend with the new address"
echo "3. Test the deployed contract with your application" 