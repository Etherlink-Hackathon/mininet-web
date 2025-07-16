"""Mesh Authority client service for communicating with FastPay authorities via gateway bridge.

This service handles HTTP communication with the mesh internet gateway bridge,
translating between the web API and the FastPay mesh protocol while maintaining
real-time connectivity with the mesh network.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple, Any, Union

import httpx
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


class MeshGatewayError(Exception):
    """Exception raised when mesh gateway communication fails."""
    pass


class MeshAuthorityDiscoveryError(Exception):
    """Exception raised when mesh authority discovery fails."""
    pass


class MeshAuthorityCommunicationError(Exception):
    """Exception raised when communication with mesh authority fails."""
    pass


class MeshAuthorityClient:
    """Enhanced client for communicating with mesh FastPay authorities via gateway.
    
    This client communicates with authorities through the mesh internet gateway bridge,
    providing seamless integration between the web backend and the mesh network.
    """
    
    def __init__(self, bridge_url: str = "http://10.0.0.254:8080") -> None:
        """Initialize the mesh authority client.
        
        Args:
            bridge_url: URL of the mesh internet gateway bridge
        """
        self.mesh_bridge_url = bridge_url
        self.authorities: Dict[str, AuthorityInfo] = {}
        self.discovery_file = "/tmp/mesh_authorities.json"
        self._running = False
        self._http_client: Optional[httpx.AsyncClient] = None
        self._last_discovery_time = 0.0
        self._discovery_cache_duration = 30.0  # Cache for 30 seconds
        
    async def start(self) -> None:
        """Start the mesh authority client services."""
        self._running = True
        self._http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0))
        
        # Initial discovery
        try:
            await self.discover_mesh_authorities()
        except Exception as e:
            logger.warning(f"Initial mesh authority discovery failed: {e}")
            # Fallback to mock authorities
            await self._initialize_fallback_authorities()
        
    async def stop(self) -> None:
        """Stop the mesh authority client services."""
        self._running = False
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
        
    async def get_authorities(self) -> List[AuthorityInfo]:
        """Get list of discovered mesh authorities.
        
        Returns:
            List of authority information
        """
        # Refresh discovery if cache is stale
        current_time = time.time()
        if current_time - self._last_discovery_time > self._discovery_cache_duration:
            try:
                await self.discover_mesh_authorities()
            except Exception as e:
                logger.warning(f"Authority discovery refresh failed: {e}")
        
        return list(self.authorities.values())
        
    async def get_authority(self, authority_name: str) -> Optional[AuthorityInfo]:
        """Get specific mesh authority information.
        
        Args:
            authority_name: Name of the authority to retrieve
            
        Returns:
            Authority information if found, None otherwise
        """
        return self.authorities.get(authority_name)
        
    async def discover_mesh_authorities(self) -> List[AuthorityInfo]:
        """Discover authorities from mesh gateway bridge.
        
        Returns:
            List of discovered authorities
            
        Raises:
            MeshAuthorityDiscoveryError: If discovery fails
        """
        if not self._http_client:
            raise MeshAuthorityDiscoveryError("Client not started")
            
        try:
            logger.info(f"Discovering mesh authorities via {self.mesh_bridge_url}")
            
            # Query gateway bridge for authority list
            response = await self._http_client.get(f"{self.mesh_bridge_url}/authorities")
            response.raise_for_status()
            authorities_data = response.json()
            
            # Parse and create AuthorityInfo objects
            authorities = []
            for auth_data in authorities_data.get('authorities', []):
                try:
                    authority_info = AuthorityInfo(
                        name=auth_data['name'],
                        address=Address(
                            node_id=auth_data['name'],
                            ip_address=auth_data['ip'],
                            port=auth_data['port'],
                            node_type="authority"
                        ),
                        position=Position(
                            x=auth_data['position']['x'], 
                            y=auth_data['position']['y'], 
                            z=auth_data['position']['z']
                        ),
                        status=AuthorityStatus(auth_data['status']),
                        shards=[],  # TODO: Implement sharding support
                        committee_members=set(auth_data.get('committee_members', [])),
                        performance_metrics={}
                    )
                    authorities.append(authority_info)
                    self.authorities[authority_info.name] = authority_info
                    
                except (KeyError, ValueError) as e:
                    logger.warning(f"Failed to parse authority data {auth_data}: {e}")
                    continue
            
            self._last_discovery_time = time.time()
            logger.info(f"Discovered {len(authorities)} mesh authorities")
            
            # Save to discovery file for fallback
            await self._save_discovery_file(authorities)
            
            return authorities
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during mesh authority discovery: {e}")
            raise MeshAuthorityDiscoveryError(f"HTTP error: {e}")
        except Exception as e:
            logger.error(f"Failed to discover mesh authorities: {e}")
            # Try fallback from file
            fallback_authorities = await self._load_discovery_file()
            if fallback_authorities:
                logger.info(f"Using fallback authorities from file: {len(fallback_authorities)}")
                return fallback_authorities
            
            raise MeshAuthorityDiscoveryError(f"Discovery failed: {e}")
    
    async def send_mesh_transfer(
        self, 
        authority_name: str, 
        transfer_order: Union[TransferOrder, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Send transfer order to mesh authority via gateway bridge.
        
        Args:
            authority_name: Name of the target authority
            transfer_order: Transfer order data to send
            
        Returns:
            Response from the authority
            
        Raises:
            MeshAuthorityCommunicationError: If communication fails
        """
        if not self._http_client:
            raise MeshAuthorityCommunicationError("Client not started")
            
        if authority_name not in self.authorities:
            await self.discover_mesh_authorities()  # Refresh discovery
            if authority_name not in self.authorities:
                raise MeshAuthorityCommunicationError(f"Authority {authority_name} not found")
        
        try:
            # Convert TransferOrder to dict if necessary
            if isinstance(transfer_order, TransferOrder):
                transfer_data = transfer_order.dict()
            else:
                transfer_data = transfer_order
                
            # Add metadata
            transfer_data.update({
                'timestamp': time.time(),
                'gateway_client': 'mesh_authority_client',
                'target_authority': authority_name
            })
            
            logger.info(f"Sending transfer to mesh authority {authority_name}")
            
            # Send transfer request through gateway bridge
            response = await self._http_client.post(
                f"{self.mesh_bridge_url}/authorities/{authority_name}/transfer",
                json=transfer_data,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get('success'):
                logger.info(f"Transfer sent successfully to {authority_name}")
                return result
            else:
                error_msg = result.get('error', 'Unknown error')
                logger.error(f"Transfer failed for {authority_name}: {error_msg}")
                raise MeshAuthorityCommunicationError(f"Transfer failed: {error_msg}")
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error sending transfer to {authority_name}: {e}")
            raise MeshAuthorityCommunicationError(f"HTTP error: {e}")
        except Exception as e:
            logger.error(f"Failed to send transfer to {authority_name}: {e}")
            raise MeshAuthorityCommunicationError(f"Communication error: {e}")
    
    async def ping_mesh_authority(self, authority_name: str) -> Dict[str, Any]:
        """Ping mesh authority through gateway bridge.
        
        Args:
            authority_name: Name of the authority to ping
            
        Returns:
            Ping result with latency and status
            
        Raises:
            MeshAuthorityCommunicationError: If ping fails
        """
        if not self._http_client:
            raise MeshAuthorityCommunicationError("Client not started")
            
        if authority_name not in self.authorities:
            await self.discover_mesh_authorities()  # Refresh discovery
            if authority_name not in self.authorities:
                raise MeshAuthorityCommunicationError(f"Authority {authority_name} not found")
        
        try:
            logger.debug(f"Pinging mesh authority {authority_name}")
            
            # Send ping request through gateway bridge
            response = await self._http_client.post(
                f"{self.mesh_bridge_url}/authorities/{authority_name}/ping",
                json={'timestamp': time.time()},
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            result = response.json()
            
            if result.get('success'):
                logger.debug(f"Ping successful to {authority_name}: {result.get('latency_ms', 0)}ms")
                return result
            else:
                error_msg = result.get('error', 'Unknown error')
                logger.warning(f"Ping failed for {authority_name}: {error_msg}")
                raise MeshAuthorityCommunicationError(f"Ping failed: {error_msg}")
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error pinging {authority_name}: {e}")
            raise MeshAuthorityCommunicationError(f"HTTP error: {e}")
        except Exception as e:
            logger.error(f"Failed to ping {authority_name}: {e}")
            raise MeshAuthorityCommunicationError(f"Ping error: {e}")
    
    async def get_mesh_gateway_status(self) -> Dict[str, Any]:
        """Get mesh gateway bridge status and health.
        
        Returns:
            Gateway status information
            
        Raises:
            MeshGatewayError: If gateway is unreachable
        """
        if not self._http_client:
            raise MeshGatewayError("Client not started")
            
        try:
            response = await self._http_client.get(f"{self.mesh_bridge_url}/health")
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error getting gateway status: {e}")
            raise MeshGatewayError(f"Gateway unreachable: {e}")
        except Exception as e:
            logger.error(f"Failed to get gateway status: {e}")
            raise MeshGatewayError(f"Gateway error: {e}")
    
    async def ping_all_authorities(self) -> Dict[str, Dict[str, Any]]:
        """Ping all discovered mesh authorities.
        
        Returns:
            Dictionary mapping authority names to ping results
        """
        authorities = await self.get_authorities()
        results = {}
        
        # Ping all authorities concurrently
        ping_tasks = []
        for auth in authorities:
            task = asyncio.create_task(self._safe_ping_authority(auth.name))
            ping_tasks.append((auth.name, task))
        
        # Collect results
        for auth_name, task in ping_tasks:
            try:
                result = await task
                results[auth_name] = result
            except Exception as e:
                results[auth_name] = {
                    'success': False,
                    'error': str(e),
                    'authority': auth_name,
                    'timestamp': time.time()
                }
        
        return results
    
    async def _safe_ping_authority(self, authority_name: str) -> Dict[str, Any]:
        """Safely ping an authority with error handling.
        
        Args:
            authority_name: Name of authority to ping
            
        Returns:
            Ping result
        """
        try:
            return await self.ping_mesh_authority(authority_name)
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'authority': authority_name,
                'timestamp': time.time()
            }
    
    async def _initialize_fallback_authorities(self) -> None:
        """Initialize with fallback mock authorities when gateway is unavailable."""
        logger.warning("Initializing fallback mock authorities")
        
        mock_authorities = [
            {
                "name": "auth1",
                "ip": "10.0.0.11",
                "port": 8001,
                "position": {"x": 45.0, "y": 40.0, "z": 0.0},
                "status": "offline",
                "committee_members": ["auth2", "auth3", "auth4", "auth5"]
            },
            {
                "name": "auth2", 
                "ip": "10.0.0.12",
                "port": 8002,
                "position": {"x": 70.0, "y": 40.0, "z": 0.0},
                "status": "offline",
                "committee_members": ["auth1", "auth3", "auth4", "auth5"]
            },
            {
                "name": "auth3",
                "ip": "10.0.0.13", 
                "port": 8003,
                "position": {"x": 95.0, "y": 40.0, "z": 0.0},
                "status": "offline",
                "committee_members": ["auth1", "auth2", "auth4", "auth5"]
            },
            {
                "name": "auth4",
                "ip": "10.0.0.14",
                "port": 8004,
                "position": {"x": 120.0, "y": 40.0, "z": 0.0},
                "status": "offline",
                "committee_members": ["auth1", "auth2", "auth3", "auth5"]
            },
            {
                "name": "auth5",
                "ip": "10.0.0.15",
                "port": 8005,
                "position": {"x": 145.0, "y": 40.0, "z": 0.0},
                "status": "offline",
                "committee_members": ["auth1", "auth2", "auth3", "auth4"]
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
                committee_members=set(auth_data["committee_members"]),
                performance_metrics={}
            )
            
            self.authorities[authority_info.name] = authority_info
    
    async def _save_discovery_file(self, authorities: List[AuthorityInfo]) -> None:
        """Save discovered authorities to file for fallback.
        
        Args:
            authorities: List of authorities to save
        """
        try:
            authorities_data = []
            for auth in authorities:
                authorities_data.append({
                    'name': auth.name,
                    'ip': auth.address.ip_address,
                    'port': auth.address.port,
                    'position': {
                        'x': auth.position.x,
                        'y': auth.position.y,
                        'z': auth.position.z
                    },
                    'status': auth.status.value,
                    'committee_members': list(auth.committee_members),
                    'timestamp': time.time()
                })
            
            with open(self.discovery_file, 'w') as f:
                json.dump(authorities_data, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to save discovery file: {e}")
    
    async def _load_discovery_file(self) -> Optional[List[AuthorityInfo]]:
        """Load authorities from discovery file.
        
        Returns:
            List of authorities from file, or None if loading fails
        """
        try:
            with open(self.discovery_file, 'r') as f:
                authorities_data = json.load(f)
            
            authorities = []
            for auth_data in authorities_data:
                authority_info = AuthorityInfo(
                    name=auth_data['name'],
                    address=Address(
                        node_id=auth_data['name'],
                        ip_address=auth_data['ip'],
                        port=auth_data['port'],
                        node_type="authority"
                    ),
                    position=Position(
                        x=auth_data['position']['x'], 
                        y=auth_data['position']['y'], 
                        z=auth_data['position']['z']
                    ),
                    status=AuthorityStatus("offline"),  # Assume offline when loading from file
                    shards=[],
                    committee_members=set(auth_data.get('committee_members', [])),
                    performance_metrics={}
                )
                authorities.append(authority_info)
                self.authorities[authority_info.name] = authority_info
            
            return authorities
            
        except Exception as e:
            logger.warning(f"Failed to load discovery file: {e}")
            return None


# Global mesh authority client instance
mesh_authority_client = MeshAuthorityClient()


async def get_mesh_authority_client() -> MeshAuthorityClient:
    """Get the global mesh authority client instance.
    
    Returns:
        Mesh authority client instance
    """
    return mesh_authority_client 