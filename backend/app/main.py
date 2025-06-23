"""Main FastAPI application for Etherlink Offline Payment System.

This is the entry point for the web API that interfaces with FastPay authorities
running on mininet-wifi to enable offline stablecoin payments.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import structlog

from app.core.config import get_settings
from app.api.v1.router import api_router
from app.services.authority_client import authority_client

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application lifespan events.
    
    Args:
        app: FastAPI application instance
        
    Yields:
        None during application lifetime
    """
    logger.info("Starting Etherlink Offline Payment API", version=settings.app_version)
    
    # Start authority client for discovering and communicating with FastPay authorities
    await authority_client.start()
    logger.info("Authority client started")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down Etherlink Offline Payment API")
    await authority_client.stop()
    logger.info("Authority client stopped")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    **Etherlink Offline Payment API** enables offline stablecoin payments using the FastPay protocol.
    
    This API interfaces with FastPay authorities running on mininet-wifi to provide:
    
    - 🗺️ **Network Discovery**: Discover and monitor nearby payment authorities
    - 💰 **Wallet Management**: Check balances and transaction history  
    - 📱 **Offline Payments**: Send USDT/USDC without internet connectivity
    - 🔒 **Transaction Certificates**: Cryptographic proof of payments
    - 📊 **Real-time Updates**: Live network status via WebSocket
    
    Perfect for **Etherlink Summer Camp** participants building offline-first payment solutions!
    """,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with API information.
    
    Returns:
        API information and status
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Etherlink Offline Payment API for FastPay integration",
        "docs_url": "/docs",
        "status": "online",
        "features": [
            "FastPay Authority Discovery",
            "Offline Stablecoin Payments", 
            "Transaction Certificates",
            "Real-time Network Monitoring",
            "WebSocket Updates"
        ]
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint.
    
    Returns:
        Application health status
    """
    authorities = await authority_client.get_authorities()
    
    return {
        "status": "healthy",
        "timestamp": structlog.processors.TimeStamper()._make_stamper("iso")(),
        "authority_count": len(authorities),
        "online_authorities": len([a for a in authorities if a.status == "online"]),
        "supported_tokens": settings.supported_tokens,
        "version": settings.app_version
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=settings.workers,
        log_level=settings.log_level.lower()
    ) 