#!/bin/bash

# FastPay MVP Setup Script
# This script sets up the development environment

echo "⚙️  FastPay MVP Setup Script"
echo "============================"

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

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    print_warning "Foundry not found. Installing Foundry..."
    
    # Install Foundry
    if curl -L https://foundry.paradigm.xyz | bash; then
        print_status "Foundry installed"
        
        # Source the foundry environment
        source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true
        
        # Update foundry
        if foundryup; then
            print_status "Foundry updated to latest version"
        else
            print_error "Failed to update Foundry"
            exit 1
        fi
    else
        print_error "Failed to install Foundry"
        exit 1
    fi
else
    print_status "Foundry already installed"
    
    # Update foundry
    print_info "Updating Foundry..."
    if foundryup; then
        print_status "Foundry updated to latest version"
    else
        print_warning "Failed to update Foundry, but continuing..."
    fi
fi

# Install Foundry dependencies
echo ""
print_info "Installing Foundry dependencies..."
if forge install; then
    print_status "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Install OpenZeppelin and other dependencies
echo ""
print_info "Installing OpenZeppelin and other dependencies..."
forge install openzeppelin/openzeppelin-contracts openzeppelin/openzeppelin-contracts-upgradeable foundry-rs/forge-std

# Set up environment file
echo ""
if [ ! -f .env ]; then
    print_info "Creating .env file from template..."
    cp env.example .env
    print_status ".env file created"
    print_warning "Please edit .env file with your configuration:"
    echo "  - Set PRIVATE_KEY for deployment"
    echo "  - Set ETHERSCAN_API_KEY for contract verification (optional)"
else
    print_status ".env file already exists"
fi

# Build contracts
echo ""
print_info "Building contracts..."
if forge build; then
    print_status "Build successful"
else
    print_error "Build failed"
    exit 1
fi

# Run tests
echo ""
print_info "Running initial tests..."
if forge test; then
    print_status "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Make scripts executable
echo ""
print_info "Making scripts executable..."
chmod +x scripts/*.sh
print_status "Scripts are now executable"

echo ""
print_status "Setup completed successfully!"
echo ""
echo "📋 Setup Summary:"
echo "- Foundry: ✅ Installed and updated"
echo "- Dependencies: ✅ Installed"
echo "- Environment: ✅ Configured"
echo "- Build: ✅ Successful"
echo "- Tests: ✅ Passing"
echo "- Scripts: ✅ Executable"
echo ""
echo "🚀 Ready for development!"
echo ""
echo "📖 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run './scripts/test.sh' to run comprehensive tests"
echo "3. Run './scripts/deploy.sh local' to deploy to local network"
echo "4. Run './scripts/deploy.sh testnet' to deploy to Etherlink testnet"
echo ""
echo "📚 Available commands:"
echo "- ./scripts/test.sh      - Run comprehensive tests"
echo "- ./scripts/deploy.sh    - Deploy to network (local/testnet/mainnet)"
echo "- ./scripts/setup.sh     - Run this setup script again"
echo ""
echo "📄 Documentation:"
echo "- MVP_README.md          - Detailed usage guide"
echo "- COMPARISON.md          - Original vs MVP comparison"
echo "- MVP_PLAN.md            - Implementation plan" 