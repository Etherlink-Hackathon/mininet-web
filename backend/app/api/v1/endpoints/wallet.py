"""Wallet API endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/balance")
async def get_balance():
    """Get wallet balance."""
    return {"USDT": 1000000, "USDC": 500000}  # Mock balances

@router.get("/history")
async def get_transaction_history():
    """Get transaction history."""
    return {"transactions": []} 