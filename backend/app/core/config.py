"""Configuration settings for the Etherlink Offline Payment Backend.

This module contains all configuration settings, including FastPay authority
network settings, stablecoin configuration, and application settings.
"""

from typing import Dict, List, Optional, Set
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application settings
    app_name: str = "Etherlink Offline Payment API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    
    # FastPay Authority Network Configuration
    authority_discovery_port: int = Field(8080, description="Port for authority discovery")
    authority_timeout: float = Field(5.0, description="Timeout for authority communication in seconds")
    min_quorum_size: int = Field(3, description="Minimum number of authorities for quorum")
    max_authorities: int = Field(10, description="Maximum number of authorities to track")
    
    # Authority discovery settings
    authority_discovery_interval: int = Field(30, description="Authority discovery interval in seconds")
    authority_heartbeat_interval: int = Field(10, description="Authority heartbeat interval in seconds")
    
    # Network settings
    network_scan_range: str = Field("10.0.0.0/8", description="IP range to scan for authorities")
    tcp_connection_timeout: float = Field(3.0, description="TCP connection timeout in seconds")
    max_concurrent_connections: int = Field(50, description="Maximum concurrent connections")
    
    # Stablecoin Configuration
    supported_tokens: List[str] = Field(["USDT", "USDC"], description="Supported stablecoin tokens")
    default_token: str = Field("USDT", description="Default stablecoin token")
    
    # Token contract addresses (for Etherlink)
    token_contracts: Dict[str, str] = Field(
        default={
            "USDT": "0x1234567890123456789012345678901234567890",  # Mock address
            "USDC": "0x0987654321098765432109876543210987654321",  # Mock address
        },
        description="Token contract addresses on Etherlink"
    )
    
    # Transaction settings
    max_transaction_amount: int = Field(10000000, description="Maximum transaction amount (in smallest unit)")
    min_transaction_amount: int = Field(1, description="Minimum transaction amount (in smallest unit)")
    transaction_timeout: float = Field(30.0, description="Transaction timeout in seconds")
    
    # WebSocket Settings
    ws_heartbeat_interval: int = Field(30, description="WebSocket heartbeat interval in seconds")
    ws_max_connections: int = Field(100, description="Maximum WebSocket connections")
    
    # Database settings (for transaction history and caching)
    database_url: str = Field("sqlite:///./etherlink_payments.db", description="Database URL")
    redis_url: Optional[str] = Field(None, description="Redis URL for caching")
    
    # Security settings
    secret_key: str = Field("your-secret-key-change-in-production", description="Secret key for JWT")
    algorithm: str = Field("HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(30, description="Access token expiry in minutes")
    
    # CORS settings
    allowed_origins: List[str] = Field(
        ["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    # Logging settings
    log_level: str = Field("INFO", description="Logging level")
    log_format: str = Field("%(asctime)s - %(name)s - %(levelname)s - %(message)s", description="Log format")
    
    # Map and visualization settings
    default_map_center: List[float] = Field([37.7749, -122.4194], description="Default map center (San Francisco)")
    default_map_zoom: int = Field(12, description="Default map zoom level")
    map_update_interval: int = Field(5, description="Map update interval in seconds")
    
    # Authority visualization settings
    authority_marker_colors: Dict[str, str] = Field(
        default={
            "online": "#22c55e",     # Green
            "offline": "#ef4444",    # Red
            "syncing": "#f59e0b",    # Amber
            "unknown": "#6b7280",    # Gray
        },
        description="Authority status marker colors"
    )
    
    # Performance settings
    cache_ttl: int = Field(300, description="Cache TTL in seconds")
    rate_limit_requests: int = Field(100, description="Rate limit requests per minute")
    rate_limit_window: int = Field(60, description="Rate limit window in seconds")
    
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


class FastPaySettings:
    """FastPay protocol specific settings."""
    
    # Message types that we handle
    SUPPORTED_MESSAGE_TYPES = {
        "TRANSFER_REQUEST",
        "TRANSFER_RESPONSE", 
        "CONFIRMATION_REQUEST",
        "CONFIRMATION_RESPONSE",
        "SYNC_REQUEST",
        "SYNC_RESPONSE",
    }
    
    # Authority states
    AUTHORITY_STATES = {
        "ONLINE",
        "OFFLINE", 
        "SYNCING",
        "UNKNOWN",
    }
    
    # Transaction statuses
    TRANSACTION_STATUSES = {
        "PENDING",
        "CONFIRMED",
        "FAILED",
        "TIMEOUT",
    }
    
    # Default committee configuration
    DEFAULT_COMMITTEE_SIZE = 4
    DEFAULT_QUORUM_THRESHOLD = 0.67  # 2/3 + 1
    
    # Network discovery settings
    DISCOVERY_BROADCAST_ADDRESS = "255.255.255.255"
    DISCOVERY_MESSAGE_MAGIC = b"FASTPAY_DISCOVERY"
    
    # Protocol timeouts
    TRANSFER_TIMEOUT = 30.0
    CONFIRMATION_TIMEOUT = 15.0
    SYNC_TIMEOUT = 10.0


# Global settings instance
settings = Settings()
fastpay_settings = FastPaySettings()


def get_settings() -> Settings:
    """Get application settings.
    
    Returns:
        Settings: Application settings instance
    """
    return settings


def get_fastpay_settings() -> FastPaySettings:
    """Get FastPay protocol settings.
    
    Returns:
        FastPaySettings: FastPay protocol settings instance
    """
    return fastpay_settings 