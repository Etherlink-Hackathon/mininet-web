"""Authority client service for communicating with FastPay authorities.

This service handles TCP communication with the WiFi authorities running in
mininet-wifi, translating between the web API and the FastPay protocol.
"""

import asyncio
import json
import socket
import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

import structlog
from pydantic import ValidationError

from app.core.config import get_settings, get_fastpay_settings
from app.models.base import (
    Address,
    AuthorityInfo,
    AuthorityStatus,
    ConfirmationOrder,
    Position,
    ShardInfo,
    TransferOrder,
    TransactionStatus,
)

logger = structlog.get_logger(__name__)
settings = get_settings()
fastpay_settings = get_fastpay_settings()


class AuthorityDiscoveryError(Exception):
    """Exception raised when authority discovery fails."""
    pass


class AuthorityCommunicationError(Exception):
    """Exception raised when communication with authority fails."""
    pass


class AuthorityClient:
    """Simple client for communicating with FastPay authorities."""
    
    def __init__(self) -> None:
        """Initialize the authority client."""
        self.authorities: Dict[str, AuthorityInfo] = {}
        self._running = False
        
    async def start(self) -> None:
        """Start the authority client services."""
        self._running = True
        # Initialize with mock authorities for demo
        await self._initialize_mock_authorities()
        
    async def stop(self) -> None:
        """Stop the authority client services."""
        self._running = False
        
    async def get_authorities(self) -> List[AuthorityInfo]:
        """Get list of discovered authorities."""
        return list(self.authorities.values())
        
    async def get_authority(self, authority_name: str) -> Optional[AuthorityInfo]:
        """Get specific authority information."""
        return self.authorities.get(authority_name)
        
    async def _initialize_mock_authorities(self) -> None:
        """Initialize with mock authorities for demo purposes."""
        mock_authorities = [
            {
                "name": "authority_1",
                "ip": "10.0.0.1",
                "port": 8080,
                "position": {"x": 37.7749, "y": -122.4194, "z": 0},
                "status": "online"
            },
            {
                "name": "authority_2", 
                "ip": "10.0.0.2",
                "port": 8080,
                "position": {"x": 37.7849, "y": -122.4094, "z": 0},
                "status": "online"
            },
            {
                "name": "authority_3",
                "ip": "10.0.0.3", 
                "port": 8080,
                "position": {"x": 37.7649, "y": -122.4294, "z": 0},
                "status": "offline"
            },
            {
                "name": "authority_4",
                "ip": "10.0.0.4",
                "port": 8080,
                "position": {"x": 37.7949, "y": -122.4394, "z": 0},
                "status": "syncing"
            }
        ]
        
        for auth_data in mock_authorities:
            address = Address(
                node_id=auth_data["name"],
                ip_address=auth_data["ip"], 
                port=auth_data["port"],
                node_type="authority"
            )
            
            position = Position(
                x=auth_data["position"]["x"],
                y=auth_data["position"]["y"],
                z=auth_data["position"]["z"]
            )
            
            authority_info = AuthorityInfo(
                name=auth_data["name"],
                address=address,
                position=position,
                status=AuthorityStatus(auth_data["status"]),
                shards=[],
                committee_members=set(),
                performance_metrics={}
            )
            
            self.authorities[authority_info.name] = authority_info


# Global authority client instance
authority_client = AuthorityClient()


async def get_authority_client() -> AuthorityClient:
    """Get the global authority client instance.
    
    Returns:
        Authority client instance
    """
    return authority_client 