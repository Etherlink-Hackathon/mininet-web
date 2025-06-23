"""Authority management API endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.models.base import AuthorityInfo, NetworkTopology, NetworkMetrics
from app.services.authority_client import get_authority_client, AuthorityClient

router = APIRouter()


@router.get("/", response_model=List[AuthorityInfo])
async def get_authorities(
    client: AuthorityClient = Depends(get_authority_client)
) -> List[AuthorityInfo]:
    """Get list of discovered FastPay authorities.
    
    Returns:
        List of authority information including status, position, and shards
    """
    authorities = await client.get_authorities()
    return authorities


@router.get("/{authority_name}", response_model=AuthorityInfo)
async def get_authority(
    authority_name: str,
    client: AuthorityClient = Depends(get_authority_client)
) -> AuthorityInfo:
    """Get specific authority information.
    
    Args:
        authority_name: Name of the authority to retrieve
        
    Returns:
        Authority information
        
    Raises:
        HTTPException: If authority not found
    """
    authority = await client.get_authority(authority_name)
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")
    return authority


@router.get("/{authority_name}/shards")
async def get_authority_shards(
    authority_name: str,
    client: AuthorityClient = Depends(get_authority_client)
):
    """Get shard information for a specific authority.
    
    Args:
        authority_name: Name of the authority
        
    Returns:
        Shard information for the authority
        
    Raises:
        HTTPException: If authority not found
    """
    authority = await client.get_authority(authority_name)
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")
    
    return {
        "authority_name": authority_name,
        "shards": authority.shards,
        "total_shards": len(authority.shards),
        "status": authority.status
    }


@router.get("/network/topology", response_model=NetworkTopology)
async def get_network_topology(
    client: AuthorityClient = Depends(get_authority_client)
) -> NetworkTopology:
    """Get network topology information.
    
    Returns:
        Network topology including authorities and their connections
    """
    authorities = await client.get_authorities()
    
    # Create connections map (simplified for demo)
    connections = {}
    for authority in authorities:
        # Mock connections to other online authorities
        online_authorities = [a.name for a in authorities if a.status == "online" and a.name != authority.name]
        connections[authority.name] = online_authorities
    
    return NetworkTopology(
        authorities=authorities,
        clients=[],  # No client discovery yet
        connections=connections
    )


@router.get("/network/metrics", response_model=NetworkMetrics)
async def get_network_metrics(
    client: AuthorityClient = Depends(get_authority_client)
) -> NetworkMetrics:
    """Get network performance metrics.
    
    Returns:
        Network performance metrics and statistics
    """
    authorities = await client.get_authorities()
    
    online_authorities = [a for a in authorities if a.status == "online"]
    
    # Mock metrics for demo
    return NetworkMetrics(
        total_authorities=len(authorities),
        online_authorities=len(online_authorities),
        total_transactions=1250,  # Mock data
        successful_transactions=1180,  # Mock data
        average_confirmation_time=2.5,  # Mock data
        network_latency=45.0  # Mock data in ms
    )


@router.post("/{authority_name}/ping")
async def ping_authority(
    authority_name: str,
    client: AuthorityClient = Depends(get_authority_client)
):
    """Ping a specific authority to check connectivity.
    
    Args:
        authority_name: Name of the authority to ping
        
    Returns:
        Ping result with latency information
        
    Raises:
        HTTPException: If authority not found
    """
    authority = await client.get_authority(authority_name)
    if not authority:
        raise HTTPException(status_code=404, detail="Authority not found")
    
    # Mock ping implementation
    if authority.status == "online":
        return {
            "authority_name": authority_name,
            "status": "success",
            "latency_ms": 15.2,  # Mock latency
            "timestamp": "2025-01-08T15:30:00Z"
        }
    else:
        return {
            "authority_name": authority_name,
            "status": "failed",
            "error": "Authority offline",
            "timestamp": "2025-01-08T15:30:00Z"
        } 