"""
Wallet management endpoints for SmartPay backend.
Handles account registration, balance queries, and transaction history.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from ...services.blockchain_client import blockchain_client, AccountInfo, TokenBalance, ContractStats

router = APIRouter()

# Pydantic models for API responses
class AccountInfoResponse(BaseModel):
    """Account information response model."""
    address: str
    is_registered: bool
    registration_time: int
    last_redeemed_sequence: int

class TokenBalanceResponse(BaseModel):
    """Token balance response model."""
    token_symbol: str
    token_address: str
    wallet_balance: str
    fastpay_balance: str
    total_balance: str
    decimals: int

class WalletBalancesResponse(BaseModel):
    """Complete wallet balances response."""
    address: str
    balances: List[TokenBalanceResponse]
    total_value_usd: Optional[str] = None  # Future enhancement for USD values

class ContractStatsResponse(BaseModel):
    """Contract statistics response model."""
    total_accounts: int
    total_native_balance: str
    total_token_balances: Dict[str, str]

class RegistrationStatusResponse(BaseModel):
    """Registration status response model."""
    address: str
    is_registered: bool
    can_register: bool
    message: str

class RecentEventResponse(BaseModel):
    """Recent blockchain event response."""
    event: str
    block_number: int
    transaction_hash: str
    args: Dict
    timestamp: Optional[int] = None

class HealthCheckResponse(BaseModel):
    """Blockchain health check response."""
    connected: bool
    chain_id: Optional[int] = None
    latest_block: Optional[int] = None
    fastpay_contract: bool
    total_accounts: Optional[int] = None
    error: Optional[str] = None

@router.get("/account/{address}", response_model=AccountInfoResponse)
async def get_account_info(address: str) -> AccountInfoResponse:
    """
    Get account information from SmartPay smart contract.
    
    Args:
        address: Ethereum address to query
        
    Returns:
        Account information including registration status
    """
    try:
        account_info = await blockchain_client.get_account_info(address)
        if not account_info:
            raise HTTPException(status_code=404, detail="Account not found or contract unavailable")
        
        return AccountInfoResponse(
            address=account_info.address,
            is_registered=account_info.is_registered,
            registration_time=account_info.registration_time,
            last_redeemed_sequence=account_info.last_redeemed_sequence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get account info: {str(e)}")

@router.get("/balances/{address}", response_model=WalletBalancesResponse)
async def get_wallet_balances(address: str) -> WalletBalancesResponse:
    """
    Get all token balances for a wallet address.
    
    Args:
        address: Ethereum address to query
        
    Returns:
        Complete balance information for all supported tokens
    """
    try:
        balances = await blockchain_client.get_account_balances(address)
        
        balance_responses = [
            TokenBalanceResponse(
                token_symbol=balance.token_symbol,
                token_address=balance.token_address,
                wallet_balance=balance.wallet_balance,
                fastpay_balance=balance.fastpay_balance,
                total_balance=balance.total_balance,
                decimals=balance.decimals
            )
            for balance in balances
        ]
        
        return WalletBalancesResponse(
            address=address,
            balances=balance_responses
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get wallet balances: {str(e)}")

@router.get("/registration-status/{address}", response_model=RegistrationStatusResponse)
async def get_registration_status(address: str) -> RegistrationStatusResponse:
    """
    Check if an address is registered with SmartPay and can register if not.
    
    Args:
        address: Ethereum address to check
        
    Returns:
        Registration status and guidance
    """
    try:
        is_registered = await blockchain_client.is_account_registered(address)
        
        if is_registered:
            message = "Account is already registered with SmartPay"
            can_register = False
        else:
            message = "Account is not registered. Call registerAccount() to register."
            can_register = True
        
        return RegistrationStatusResponse(
            address=address,
            is_registered=is_registered,
            can_register=can_register,
            message=message
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check registration status: {str(e)}")

@router.get("/contract-stats", response_model=ContractStatsResponse)
async def get_contract_stats() -> ContractStatsResponse:
    """
    Get overall SmartPay contract statistics.
    
    Returns:
        Contract statistics including total accounts and balances
    """
    try:
        stats = await blockchain_client.get_contract_stats()
        if not stats:
            raise HTTPException(status_code=503, detail="Contract stats unavailable")
        
        return ContractStatsResponse(
            total_accounts=stats.total_accounts,
            total_native_balance=stats.total_native_balance,
            total_token_balances=stats.total_token_balances
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get contract stats: {str(e)}")

@router.get("/recent-events", response_model=List[RecentEventResponse])
async def get_recent_events(
    event_type: str = Query("AccountRegistered", description="Event type to query"),
    limit: int = Query(10, ge=1, le=100, description="Number of events to return"),
    from_block: Optional[int] = Query(None, description="Starting block number")
) -> List[RecentEventResponse]:
    """
    Get recent blockchain events from SmartPay contract.
    
    Args:
        event_type: Type of event to query (AccountRegistered, FundingCompleted, etc.)
        limit: Maximum number of events to return
        from_block: Starting block number (defaults to recent blocks)
        
    Returns:
        List of recent events
    """
    try:
        events = await blockchain_client.get_recent_events(event_type, from_block, limit)
        
        return [
            RecentEventResponse(
                event=event['event'],
                block_number=event['block_number'],
                transaction_hash=event['transaction_hash'],
                args=event['args']
            )
            for event in events
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent events: {str(e)}")

@router.get("/health", response_model=HealthCheckResponse)
async def blockchain_health_check() -> HealthCheckResponse:
    """
    Check blockchain connection and contract health.
    
    Returns:
        Health status of blockchain connection and SmartPay contract
    """
    try:
        health_data = await blockchain_client.health_check()
        
        return HealthCheckResponse(
            connected=health_data['connected'],
            chain_id=health_data.get('chain_id'),
            latest_block=health_data.get('latest_block'),
            fastpay_contract=health_data['fastpay_contract'],
            total_accounts=health_data.get('total_accounts'),
            error=health_data.get('error')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# Legacy endpoints for backwards compatibility
@router.get("/balance", response_model=Dict)
async def get_balance_legacy():
    """Legacy balance endpoint - redirects to contract stats."""
    try:
        stats = await blockchain_client.get_contract_stats()
        if not stats:
            return {"balance": 0, "token": "XTZ"}
        
        return {
            "balance": float(stats.total_native_balance),
            "token": "XTZ",
            "total_accounts": stats.total_accounts
        }
    except Exception:
        return {"balance": 0, "token": "XTZ"}

@router.get("/", response_model=Dict)
async def wallet_root():
    """Root wallet endpoint with basic info."""
    try:
        health = await blockchain_client.health_check()
        return {
            "status": "operational" if health['connected'] else "offline",
            "chain_id": health.get('chain_id'),
            "fastpay_contract": health['fastpay_contract'],
            "endpoints": {
                "account_info": "/api/wallet/account/{address}",
                "balances": "/api/wallet/balances/{address}",
                "registration_status": "/api/wallet/registration-status/{address}",
                "contract_stats": "/api/wallet/contract-stats",
                "recent_events": "/api/wallet/recent-events",
                "health": "/api/wallet/health"
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "endpoints": {
                "account_info": "/api/wallet/account/{address}",
                "balances": "/api/wallet/balances/{address}",
                "registration_status": "/api/wallet/registration-status/{address}",
                "contract_stats": "/api/wallet/contract-stats",
                "recent_events": "/api/wallet/recent-events",
                "health": "/api/wallet/health"
            }
        } 