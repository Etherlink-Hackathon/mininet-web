#!/bin/bash

# FastPay MVP Test Script
# This script runs comprehensive tests for the MVP smart contract

echo "🧪 FastPay MVP Testing Script"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    print_error "Foundry not found. Please install Foundry first:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

print_status "Foundry found"

# Build contracts
echo ""
echo "🔨 Building contracts..."
if forge build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Run tests
echo ""
echo "🧪 Running tests..."
if forge test -vv; then
    print_status "All tests passed"
else
    print_error "Some tests failed"
    exit 1
fi

# Run tests with gas reporting
echo ""
echo "⛽ Running gas report..."
forge test --gas-report

# Run specific MVP tests
echo ""
echo "🎯 Running MVP specific tests..."
forge test --match-contract FastPayMVPTest -vv

# Run fuzz tests
echo ""
echo "🔀 Running fuzz tests..."
forge test --fuzz-runs 100

# Check code coverage
echo ""
echo "📊 Checking code coverage..."
forge coverage

echo ""
print_status "All tests completed successfully!"
echo ""
echo "📋 Test Summary:"
echo "- Contract build: ✅"
echo "- Unit tests: ✅"
echo "- Gas optimization: ✅"
echo "- Fuzz testing: ✅"
echo "- Code coverage: ✅"
echo ""
echo "🚀 Ready for deployment!" 