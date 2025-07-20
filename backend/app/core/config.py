"""Simplified configuration settings for the Etherlink Offline Payment Backend.

This module contains streamlined configuration settings focused on core functionality
without the complexity of advanced features like circuit breakers, connection pooling, etc.
"""

from typing import Dict, List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    """Simplified application settings focused on core functionality."""
    
    # Application settings
    app_name: str = os.getenv("APP_NAME", "Etherlink Offline Payment API")
    app_version: str = os.getenv("APP_VERSION", "2.0.0-simple")
    debug: bool = os.getenv("DEBUG", False)
    
    # Server settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = os.getenv("PORT", 8000)
    workers: int = os.getenv("WORKERS", 1)
    
    # Basic FastPay Network Configuration
    authority_discovery_port: int = os.getenv("AUTHORITY_DISCOVERY_PORT", 8080)
    authority_timeout: float = os.getenv("AUTHORITY_TIMEOUT", 10.0)
    min_quorum_size: int = os.getenv("MIN_QUORUM_SIZE", 3)
    max_authorities: int = os.getenv("MAX_AUTHORITIES", 10)
    
    # Network settings
    network_scan_range: str = os.getenv("NETWORK_SCAN_RANGE", "10.0.0.0/8")
    
    # Simplified Mesh Configuration
    mesh_bridge_url: str = os.getenv("MESH_BRIDGE_URL", "http://10.0.0.254:8080")
    mesh_timeout: float = os.getenv("MESH_TIMEOUT", 10.0)
    
    # Stablecoin Configuration
    supported_tokens: List[str] = os.getenv("SUPPORTED_TOKENS", ["USDT", "USDC"])
    default_token: str = os.getenv("DEFAULT_TOKEN", "USDT")
    
    # Transaction settings
    max_transaction_amount: int = os.getenv("MAX_TRANSACTION_AMOUNT", 10000000)
    min_transaction_amount: int = os.getenv("MIN_TRANSACTION_AMOUNT", 1)
    transaction_timeout: float = os.getenv("TRANSACTION_TIMEOUT", 30.0)
    
    # WebSocket Settings
    ws_heartbeat_interval: int = os.getenv("WS_HEARTBEAT_INTERVAL", 30)
    ws_max_connections: int = os.getenv("WS_MAX_CONNECTIONS", 100)
    
    # Database settings
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./etherlink_payments.db")
    
    # Security settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    
    # CORS settings
    allowed_origins: List[str] = os.getenv("ALLOWED_ORIGINS", ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"])
    
    # Logging settings
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_format: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    
    # Map and visualization settings
    default_map_center: List[float] = os.getenv("DEFAULT_MAP_CENTER", [37.7749, -122.4194])
    default_map_zoom: int = os.getenv("DEFAULT_MAP_ZOOM", 12)
    map_update_interval: int = os.getenv("MAP_UPDATE_INTERVAL", 5)
    
    # Authority visualization settings
    authority_marker_colors: Dict[str, str] = os.getenv("AUTHORITY_MARKER_COLORS", {
        "online": "#22c55e",     # Green
        "offline": "#ef4444",    # Red
        "syncing": "#f59e0b",    # Amber
        "unknown": "#6b7280",    # Gray
    })
    
    # Basic performance settings
    cache_ttl: int = os.getenv("CACHE_TTL", 300)
    rate_limit_requests: int = os.getenv("RATE_LIMIT_REQUESTS", 100)
    rate_limit_window: int = os.getenv("RATE_LIMIT_WINDOW", 60)
    
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


class FastPaySettings:
    """Simplified FastPay protocol specific settings."""
    
    # Message types that we handle
    SUPPORTED_MESSAGE_TYPES = {
        "TRANSFER_REQUEST",
        "TRANSFER_RESPONSE", 
        "CONFIRMATION_REQUEST",
        "CONFIRMATION_RESPONSE",
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
    
    # Protocol timeouts (simplified)
    TRANSFER_TIMEOUT = 30.0
    CONFIRMATION_TIMEOUT = 15.0


# Global settings instances
settings = Settings()
fastpay_settings = FastPaySettings()


def get_settings() -> Settings:
    """Get simplified application settings.
    
    Returns:
        Settings: Application settings instance
    """
    return settings


def get_fastpay_settings() -> FastPaySettings:
    """Get simplified FastPay protocol settings.
    
    Returns:
        FastPaySettings: FastPay protocol settings instance
    """
    return fastpay_settings


# Backward compatibility aliases
SimpleSettings = Settings  # type: ignore
SimpleFastPaySettings = FastPaySettings  # type: ignore
simple_settings = settings  # type: ignore
simple_fastpay_settings = fastpay_settings  # type: ignore 