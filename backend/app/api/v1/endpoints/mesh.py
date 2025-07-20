"""Simplified Mesh network API endpoints for FastPay mesh integration.

This module provides clean, simple REST API endpoints for interacting with the mesh network
through the gateway bridge, focusing on core functionality without complexity.
"""

from __future__ import annotations

import time
from typing import Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
import structlog

from app.models.base import AuthorityInfo
from app.services.simple_mesh_client import SimpleMeshClient, get_simple_mesh_client, MeshClientError

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/mesh", tags=["mesh"])


@router.get("/", response_model=List[AuthorityInfo])
async def get_authorities(
    refresh: bool = Query(False, description="Force refresh authority discovery"),
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> List[AuthorityInfo]:
    """Get list of mesh authorities from gateway.
    
    Args:
        refresh: Force refresh of authority discovery
        client: Simple mesh client instance
        
    Returns:
        List of discovered mesh authorities
    """
    try:
        if refresh:
            logger.info("Forcing authority discovery refresh")
            await client.discover_authorities()
        
        authorities = await client.get_authorities()
        logger.info(f"Retrieved {len(authorities)} authorities")
        return authorities
        
    except MeshClientError as e:
        logger.error(f"Mesh client error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get authorities: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        )


@router.get("/{authority_name}", response_model=AuthorityInfo)
async def get_authority(
    authority_name: str,
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> AuthorityInfo:
    """Get specific mesh authority information.
    
    Args:
        authority_name: Name of the authority to retrieve
        client: Simple mesh client instance
        
    Returns:
        Authority information
    """
    try:
        authority = await client.get_authority(authority_name)
        if authority is None:
            # Try refreshing
            await client.discover_authorities()
            authority = await client.get_authority(authority_name)
            
        if authority is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Authority '{authority_name}' not found"
            )
        
        logger.info(f"Retrieved authority: {authority_name}")
        return authority
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting authority {authority_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        )


@router.post("/{authority_name}/transfer")
async def send_transfer(
    authority_name: str,
    transfer_data: Dict[str, Any],
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> Dict[str, Any]:
    """Send transfer order to mesh authority via gateway.
    
    Args:
        authority_name: Name of the target authority
        transfer_data: Transfer order data
        client: Simple mesh client instance
        
    Returns:
        Transfer response from authority
    """
    try:
        # Validate required fields
        required_fields = ['sender', 'recipient', 'amount']
        missing_fields = [field for field in required_fields if field not in transfer_data]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required fields: {missing_fields}"
            )
        
        logger.info(f"Sending transfer to authority: {authority_name}")
        result = await client.send_transfer(authority_name, transfer_data)
        
        logger.info(f"Transfer result: {result.get('success', False)}")
        return result
        
    except MeshClientError as e:
        logger.error(f"Mesh client error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        )


@router.post("/{authority_name}/ping")
async def ping_authority(
    authority_name: str,
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> Dict[str, Any]:
    """Ping mesh authority through gateway.
    
    Args:
        authority_name: Name of the authority to ping
        client: Simple mesh client instance
        
    Returns:
        Ping result with latency and status
    """
    try:
        logger.debug(f"Pinging authority: {authority_name}")
        result = await client.ping_authority(authority_name)
        
        logger.debug(f"Ping result: {result.get('success', False)}")
        return result
        
    except Exception as e:
        logger.error(f"Error pinging {authority_name}: {e}")
        return {
            'success': False,
            'authority': authority_name,
            'error': str(e),
            'timestamp': time.time()
        }


@router.post("/ping-all")
async def ping_all_authorities(
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> Dict[str, Dict[str, Any]]:
    """Ping all discovered mesh authorities.
    
    Args:
        client: Simple mesh client instance
        
    Returns:
        Dictionary mapping authority names to ping results
    """
    try:
        logger.info("Pinging all authorities")
        results = await client.ping_all_authorities()
        
        successful_pings = sum(1 for result in results.values() if result.get('success'))
        logger.info(f"Pinged {len(results)} authorities, {successful_pings} successful")
        
        return results
        
    except Exception as e:
        logger.error(f"Error pinging all authorities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ping authorities: {str(e)}"
        )


@router.get("/gateway/status")
async def get_gateway_status(
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> Dict[str, Any]:
    """Get mesh gateway status and health.
    
    Args:
        client: Simple mesh client instance
        
    Returns:
        Gateway status information
    """
    try:
        logger.debug("Checking gateway status")
        
        gateway_status = await client.get_gateway_status()
        authorities = await client.get_authorities()
        
        # Build comprehensive status
        status_info = {
            'gateway': gateway_status,
            'authorities': {
                'total': len(authorities),
                'online': len([auth for auth in authorities if auth.status == "online"]),
                'names': [auth.name for auth in authorities]
            },
            'client': {
                'gateway_url': client.gateway_url,
                'running': client._running
            },
            'timestamp': time.time()
        }
        
        logger.debug("Gateway status retrieved successfully")
        return status_info
        
    except Exception as e:
        logger.error(f"Error getting gateway status: {e}")
        return {
            'gateway': {'status': 'error', 'error': str(e)},
            'authorities': {'total': 0, 'online': 0, 'names': []},
            'client': {'gateway_url': client.gateway_url, 'running': False},
            'timestamp': time.time()
        }


@router.post("/discovery/refresh")
async def refresh_discovery(
    client: SimpleMeshClient = Depends(get_simple_mesh_client)
) -> Dict[str, Any]:
    """Force refresh of mesh authority discovery.
    
    Args:
        client: Simple mesh client instance
        
    Returns:
        Discovery refresh results
    """
    try:
        logger.info("Forcing authority discovery refresh")
        
        start_time = time.time()
        authorities = await client.discover_authorities()
        end_time = time.time()
        
        result = {
            'success': True,
            'authorities_discovered': len(authorities),
            'discovery_time_ms': round((end_time - start_time) * 1000, 2),
            'authorities': [auth.name for auth in authorities],
            'timestamp': end_time
        }
        
        logger.info(f"Discovery refresh completed: {len(authorities)} authorities discovered")
        return result
        
    except MeshClientError as e:
        logger.error(f"Discovery refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Discovery refresh failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during discovery refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        ) 