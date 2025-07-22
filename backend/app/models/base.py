"""Base data models for the Etherlink Offline Payment API.

This module contains Pydantic models that mirror the MeshPay data structures
from the mininet-wifi implementation, adapted for the web API.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Set, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, validator


class NodeType(str, Enum):
    """Node type enumeration."""
    AUTHORITY = "authority"
    CLIENT = "client"


class TransactionStatus(str, Enum):
    """Transaction status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class AuthorityStatus(str, Enum):
    """Authority status enumeration."""
    ONLINE = "online"
    OFFLINE = "offline"
    SYNCING = "syncing"
    UNKNOWN = "unknown"


class TokenType(str, Enum):
    """Supported stablecoin tokens."""
    USDT = "USDT"
    USDC = "USDC"


class BaseApiModel(BaseModel):
    """Base model with common configurations."""
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = True
        validate_assignment = True
        allow_population_by_field_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }


class Position(BaseApiModel):
    """Geographic position coordinates."""
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate") 
    z: float = Field(0.0, description="Z coordinate (elevation)")


class Address(BaseApiModel):
    """Network address for a node."""
    node_id: str = Field(..., description="Unique node identifier")
    ip_address: str = Field(..., description="IP address")
    port: int = Field(..., description="Port number")
    node_type: NodeType = Field(..., description="Type of node")


class KeyPair(BaseApiModel):
    """Cryptographic key pair representation."""
    public_key: str = Field(..., description="Public key")
    private_key: Optional[str] = Field(None, description="Private key (sensitive)")
    
    class Config:
        """Pydantic configuration."""
        exclude = {"private_key"}  # Don't serialize private keys by default


class TransferOrder(BaseApiModel):
    """Transfer order for payment transactions."""
    order_id: UUID = Field(default_factory=uuid4, description="Unique order identifier")
    sender: str = Field(..., description="Sender account identifier")
    recipient: str = Field(..., description="Recipient account identifier")
    amount: int = Field(..., ge=1, description="Transfer amount in smallest unit")
    token: TokenType = Field(TokenType.USDT, description="Token type")
    sequence_number: int = Field(..., ge=1, description="Sender's sequence number")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Order timestamp")
    signature: Optional[str] = Field(None, description="Cryptographic signature")
    
    @validator('amount')
    def validate_amount(cls, v: int) -> int:
        """Validate transfer amount."""
        if v <= 0:
            raise ValueError("Amount must be positive")
        if v > 10_000_000:  # 10M in smallest unit
            raise ValueError("Amount exceeds maximum limit")
        return v


class ConfirmationOrder(BaseApiModel):
    """Confirmation order from authorities."""
    confirmation_id: UUID = Field(default_factory=uuid4, description="Unique confirmation identifier")
    transfer_order_id: UUID = Field(..., description="Related transfer order ID")
    authority_name: str = Field(..., description="Authority that issued confirmation")
    confirmed: bool = Field(..., description="Whether transfer is confirmed")
    signature: str = Field(..., description="Authority signature")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Confirmation timestamp")
    certificate: Optional[str] = Field(None, description="Transaction certificate")


class AccountState(BaseApiModel):
    """Account state information."""
    account_id: str = Field(..., description="Account identifier")
    balance: Dict[TokenType, int] = Field(default_factory=dict, description="Token balances")
    sequence_number: int = Field(1, description="Current sequence number")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


class ShardInfo(BaseApiModel):
    """Shard information for an authority."""
    shard_id: str = Field(..., description="Shard identifier")
    account_count: int = Field(0, description="Number of accounts in shard")
    total_transactions: int = Field(0, description="Number of transactions processed")
    total_stake: int = Field(0, description="Total stake in shard")
    last_sync: datetime = Field(default_factory=datetime.utcnow, description="Last sync timestamp")
    authorities: List[AuthorityInfo] = Field(default_factory=list, description="Authorities in shard")


class AuthorityInfo(BaseApiModel):
    """Information about a MeshPay authority."""
    name: str = Field(..., description="Authority name")
    address: Address = Field(..., description="Network address")
    position: Optional[Position] = Field(None, description="Geographic position")
    status: AuthorityStatus = Field(AuthorityStatus.UNKNOWN, description="Current status")
    shards: List[ShardInfo] = Field(default_factory=list, description="Managed shards")
    committee_members: Set[str] = Field(default_factory=set, description="Committee member names")
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow, description="Last heartbeat")
    performance_metrics: Dict[str, Union[int, float]] = Field(default_factory=dict, description="Performance metrics")


class ClientState(BaseApiModel):
    """Client state information."""
    name: str = Field(..., description="Client name")
    address: Address = Field(..., description="Network address")
    position: Optional[Position] = Field(None, description="Geographic position")
    account_state: AccountState = Field(..., description="Account state")
    connected_authorities: List[str] = Field(default_factory=list, description="Connected authority names")
    pending_transactions: List[UUID] = Field(default_factory=list, description="Pending transaction IDs")


class TransactionRecord(BaseApiModel):
    """Transaction record for history tracking."""
    transaction_id: UUID = Field(..., description="Transaction identifier")
    transfer_order: TransferOrder = Field(..., description="Original transfer order")
    confirmations: List[ConfirmationOrder] = Field(default_factory=list, description="Authority confirmations")
    status: TransactionStatus = Field(TransactionStatus.PENDING, description="Current status")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class NetworkTopology(BaseApiModel):
    """Network topology information."""
    authorities: List[AuthorityInfo] = Field(default_factory=list, description="List of authorities")
    clients: List[ClientState] = Field(default_factory=list, description="List of clients")
    connections: Dict[str, List[str]] = Field(default_factory=dict, description="Network connections")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


class Certificate(BaseApiModel):
    """Transaction certificate for proof of payment."""
    certificate_id: UUID = Field(default_factory=uuid4, description="Certificate identifier")
    transaction_id: UUID = Field(..., description="Related transaction ID")
    transfer_order: TransferOrder = Field(..., description="Transfer order details")
    authority_signatures: List[ConfirmationOrder] = Field(..., description="Authority signatures")
    quorum_achieved: bool = Field(..., description="Whether quorum was achieved")
    issued_at: datetime = Field(default_factory=datetime.utcnow, description="Certificate issue timestamp")
    valid_until: Optional[datetime] = Field(None, description="Certificate expiry")
    certificate_hash: str = Field(..., description="Certificate hash for verification")


class NetworkMetrics(BaseApiModel):
    """Network performance metrics."""
    total_authorities: int = Field(0, description="Total number of authorities")
    online_authorities: int = Field(0, description="Number of online authorities")
    total_transactions: int = Field(0, description="Total transactions processed")
    successful_transactions: int = Field(0, description="Successfully completed transactions")
    average_confirmation_time: float = Field(0.0, description="Average confirmation time in seconds")
    network_latency: float = Field(0.0, description="Average network latency in milliseconds")
    last_calculated: datetime = Field(default_factory=datetime.utcnow, description="Last calculation timestamp") 