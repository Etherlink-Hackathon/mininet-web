"""Transaction API endpoints."""

from fastapi import APIRouter

router = APIRouter()

@router.post("/transfer")
async def create_transfer():
    """Create a new transfer transaction."""
    return {"message": "Transfer endpoint - coming soon"}

@router.get("/{transaction_id}")
async def get_transaction(transaction_id: str):
    """Get transaction details."""
    return {"transaction_id": transaction_id, "status": "pending"} 