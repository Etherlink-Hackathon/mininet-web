#!/bin/bash

# Etherlink Offline Payment Development Startup Script

echo "🚀 Starting Etherlink Offline Payment System"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available (V2 uses 'docker compose')
if ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"

# Start the services
echo "🔧 Starting services..."
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
echo "=================="
docker compose ps

echo ""
echo "🎉 Etherlink Offline Payment System is ready!"
echo ""
echo "📖 Access the application:"
echo "   • Web App:     http://localhost:3000"
echo "   • API Docs:    http://localhost:8000/docs"
echo "   • API Health:  http://localhost:8000/health"
echo ""
echo "🔧 Development commands:"
echo "   • View logs:   docker compose logs -f"
echo "   • Stop:        docker compose down"
echo "   • Rebuild:     docker compose up --build"
echo ""
echo "📚 Features available:"
echo "   ✅ Authority discovery and monitoring"
echo "   ✅ Interactive network map"
echo "   ✅ Mock offline payment system"
echo "   ✅ Real-time WebSocket updates"
echo "   ✅ Beautiful Material-UI interface"
echo ""
echo "🎯 Perfect for Etherlink Summer Camp!"
echo "Happy coding! 🚀" 