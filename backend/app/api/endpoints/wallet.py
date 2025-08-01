"""
Wallet management endpoints for MeshPay backend.
Handles account registration, balance queries, and transaction history.
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from ...services.blockchain_client import blockchain_client, AccountInfo, TokenBalance, ContractStats
from ...models.base import AccountInfo, TokenBalance
router = APIRouter()


@router.get("/{address}", response_model=AccountInfo)
async def get_wallet_account(address: str) -> AccountInfo:
    """
    Get account information from MeshPay smart contract.
    
    Args:
        address: Ethereum address to query
        
    Returns:
        Account information including registration status
    """
    try:
        account_info = await blockchain_client.get_wallet_account(address)
        if not account_info:
            raise HTTPException(status_code=404, detail="Account not found or contract unavailable")
        
        return AccountInfo(
            address=account_info.address,
            is_registered=account_info.is_registered,
            registration_time=account_info.registration_time,
            last_redeemed_sequence=account_info.last_redeemed_sequence,
            balances=account_info.balances
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get account info: {str(e)}")
