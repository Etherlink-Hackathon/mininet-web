"""Mesh network API endpoints for FastPay mesh integration.

This module provides REST API endpoints for interacting with the mesh network
through the internet gateway bridge, enabling seamless web integration
with the mesh authorities.
"""

from __future__ import annotations

import time
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
import structlog

from app.models.base import (
    AuthorityInfo,
    TransferOrder,
    TransactionStatus,
)
from app.services.mesh_authority_client import (
    MeshAuthorityClient,
    get_mesh_authority_client,
    MeshGatewayError,
    MeshAuthorityDiscoveryError,
    MeshAuthorityCommunicationError,
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/mesh", tags=["mesh"])


@router.get("/", response_model=List[AuthorityInfo])
async def get_mesh_authorities(
    refresh: bool = Query(False, description="Force refresh authority discovery"),
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> List[AuthorityInfo]:
    """Get list of mesh authorities via gateway bridge.
    
    Args:
        refresh: Force refresh of authority discovery
        client: Mesh authority client instance
        
    Returns:
        List of discovered mesh authorities
        
    Raises:
        HTTPException: If discovery fails
    """
    try:
        if refresh:
            logger.info("Forcing mesh authority discovery refresh")
            await client.discover_mesh_authorities()
        
        authorities = await client.get_authorities()
        logger.info(f"Retrieved {len(authorities)} mesh authorities")
        return authorities
        
    except MeshAuthorityDiscoveryError as e:
        logger.error(f"Mesh authority discovery failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to discover mesh authorities: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error getting mesh authorities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/{authority_name}", response_model=AuthorityInfo)
async def get_mesh_authority(
    authority_name: str,
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> AuthorityInfo:
    """Get specific mesh authority information.
    
    Args:
        authority_name: Name of the authority to retrieve
        client: Mesh authority client instance
        
    Returns:
        Authority information
        
    Raises:
        HTTPException: If authority not found
    """
    try:
        authority = await client.get_authority(authority_name)
        if authority is None:
            # Try refreshing discovery
            await client.discover_mesh_authorities()
            authority = await client.get_authority(authority_name)
            
        if authority is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mesh authority '{authority_name}' not found"
            )
        
        logger.info(f"Retrieved mesh authority: {authority_name}")
        return authority
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting mesh authority {authority_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/{authority_name}/transfer")
async def send_mesh_transfer(
    authority_name: str,
    transfer_data: Dict[str, Any],
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Send transfer order to mesh authority via gateway.
    
    Args:
        authority_name: Name of the target authority
        transfer_data: Transfer order data
        client: Mesh authority client instance
        
    Returns:
        Transfer response from authority
        
    Raises:
        HTTPException: If transfer fails
    """
    try:
        logger.info(f"Sending transfer to mesh authority: {authority_name}")
        
        # Validate required fields
        required_fields = ['sender', 'recipient', 'amount']
        missing_fields = [field for field in required_fields if field not in transfer_data]
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required fields: {missing_fields}"
            )
        
        # Add timestamp and metadata
        transfer_data.update({
            'timestamp': time.time(),
            'api_endpoint': 'mesh_transfer',
            'target_authority': authority_name
        })
        
        result = await client.send_mesh_transfer(authority_name, transfer_data)
        
        if result.get('success'):
            logger.info(f"Transfer sent successfully to {authority_name}")
            return result
        else:
            error_msg = result.get('error', 'Transfer failed')
            logger.error(f"Transfer failed for {authority_name}: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer failed: {error_msg}"
            )
            
    except HTTPException:
        raise
    except MeshAuthorityCommunicationError as e:
        logger.error(f"Communication error with mesh authority {authority_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to communicate with authority: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error sending transfer to {authority_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/{authority_name}/ping")
async def ping_mesh_authority(
    authority_name: str,
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Ping mesh authority through gateway bridge.
    
    Args:
        authority_name: Name of the authority to ping
        client: Mesh authority client instance
        
    Returns:
        Ping result with latency and status
        
    Raises:
        HTTPException: If ping fails
    """
    try:
        logger.debug(f"Pinging mesh authority: {authority_name}")
        
        result = await client.ping_mesh_authority(authority_name)
        
        if result.get('success'):
            logger.debug(f"Ping successful to {authority_name}: {result.get('latency_ms')}ms")
            return result
        else:
            error_msg = result.get('error', 'Ping failed')
            logger.warning(f"Ping failed for {authority_name}: {error_msg}")
            return result  # Return the error result instead of raising exception
            
    except MeshAuthorityCommunicationError as e:
        logger.error(f"Communication error pinging {authority_name}: {e}")
        return {
            'success': False,
            'authority': authority_name,
            'error': str(e),
            'timestamp': time.time()
        }
    except Exception as e:
        logger.error(f"Unexpected error pinging {authority_name}: {e}")
        return {
            'success': False,
            'authority': authority_name,
            'error': str(e),
            'timestamp': time.time()
        }


@router.post("/ping-all")
async def ping_all_mesh_authorities(
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Ping all discovered mesh authorities.
    
    Args:
        client: Mesh authority client instance
        
    Returns:
        Ping results for all authorities
    """
    try:
        logger.info("Pinging all mesh authorities")
        
        results = await client.ping_all_authorities()
        
        # Calculate summary statistics
        successful_pings = sum(1 for result in results.values() if result.get('success'))
        total_authorities = len(results)
        average_latency = 0.0
        
        if successful_pings > 0:
            total_latency = sum(
                result.get('latency_ms', 0) 
                for result in results.values() 
                if result.get('success')
            )
            average_latency = total_latency / successful_pings
        
        summary = {
            'results': results,
            'summary': {
                'total_authorities': total_authorities,
                'successful_pings': successful_pings,
                'failed_pings': total_authorities - successful_pings,
                'success_rate': successful_pings / total_authorities if total_authorities > 0 else 0.0,
                'average_latency_ms': round(average_latency, 2),
                'timestamp': time.time()
            }
        }
        
        logger.info(f"Ping all completed: {successful_pings}/{total_authorities} successful")
        return summary
        
    except Exception as e:
        logger.error(f"Error pinging all authorities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ping authorities: {str(e)}"
        )


@router.get("/gateway/status")
async def get_mesh_gateway_status(
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Get mesh gateway bridge status and health.
    
    Args:
        client: Mesh authority client instance
        
    Returns:
        Gateway status information
        
    Raises:
        HTTPException: If gateway is unreachable
    """
    try:
        logger.debug("Checking mesh gateway status")
        
        gateway_status = await client.get_mesh_gateway_status()
        
        # Add client-side information
        authorities = await client.get_authorities()
        gateway_status.update({
            'client_authorities_count': len(authorities),
            'client_bridge_url': client.mesh_bridge_url,
            'client_status': 'connected'
        })
        
        logger.debug("Gateway status retrieved successfully")
        return gateway_status
        
    except MeshGatewayError as e:
        logger.error(f"Gateway unreachable: {e}")
        # Return partial status instead of raising exception
        return {
            'status': 'unreachable',
            'error': str(e),
            'client_bridge_url': client.mesh_bridge_url,
            'client_authorities_count': len(await client.get_authorities()),
            'client_status': 'disconnected',
            'timestamp': time.time()
        }
    except Exception as e:
        logger.error(f"Error getting gateway status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get gateway status: {str(e)}"
        )


@router.get("/gateway/health")
async def check_mesh_gateway_health(
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Check overall mesh gateway health including authorities.
    
    Args:
        client: Mesh authority client instance
        
    Returns:
        Comprehensive health check results
    """
    try:
        logger.info("Performing comprehensive mesh gateway health check")
        
        # Check gateway status
        try:
            gateway_status = await client.get_mesh_gateway_status()
            gateway_healthy = True
            gateway_error = None
        except Exception as e:
            gateway_status = {}
            gateway_healthy = False
            gateway_error = str(e)
        
        # Ping all authorities
        ping_results = await client.ping_all_authorities()
        
        # Calculate health metrics
        total_authorities = len(ping_results)
        healthy_authorities = sum(1 for result in ping_results.values() if result.get('success'))
        authority_health_rate = healthy_authorities / total_authorities if total_authorities > 0 else 0.0
        
        # Determine overall health
        overall_healthy = gateway_healthy and authority_health_rate >= 0.5  # At least 50% authorities responsive
        
        health_report = {
            'overall_status': 'healthy' if overall_healthy else 'unhealthy',
            'gateway': {
                'status': 'healthy' if gateway_healthy else 'unhealthy',
                'error': gateway_error,
                'details': gateway_status
            },
            'authorities': {
                'total': total_authorities,
                'healthy': healthy_authorities,
                'unhealthy': total_authorities - healthy_authorities,
                'health_rate': authority_health_rate,
                'details': ping_results
            },
            'timestamp': time.time()
        }
        
        logger.info(f"Health check completed: Overall={'healthy' if overall_healthy else 'unhealthy'}, "
                   f"Gateway={'healthy' if gateway_healthy else 'unhealthy'}, "
                   f"Authorities={healthy_authorities}/{total_authorities}")
        
        return health_report
        
    except Exception as e:
        logger.error(f"Error during health check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.post("/discovery/refresh")
async def refresh_mesh_discovery(
    client: MeshAuthorityClient = Depends(get_mesh_authority_client)
) -> Dict[str, Any]:
    """Force refresh of mesh authority discovery.
    
    Args:
        client: Mesh authority client instance
        
    Returns:
        Discovery refresh results
        
    Raises:
        HTTPException: If discovery fails
    """
    try:
        logger.info("Forcing mesh authority discovery refresh")
        
        start_time = time.time()
        authorities = await client.discover_mesh_authorities()
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
        
    except MeshAuthorityDiscoveryError as e:
        logger.error(f"Discovery refresh failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Discovery refresh failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during discovery refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        ) 