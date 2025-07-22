// TypeScript interfaces for the Etherlink Offline Payment API

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Address {
  node_id: string;
  ip_address: string;
  port: number;
  node_type: 'authority' | 'client';
}

export interface ShardInfo {
  shard_id: string;
  account_count: number;
  total_transactions: number;
  center?: [number, number];
  color?: string;
  total_stake: number;
  last_sync: string; // ISO date string
  authorities: AuthorityInfo[];
}

export interface AuthorityInfo {
  name: string;
  address: Address;
  position?: Position;
  status: 'online' | 'offline' | 'syncing' | 'unknown';
  shards: ShardInfo[];
  committee_members: string[];
  last_heartbeat: string; // ISO date string
  performance_metrics: Record<string, number>;
  stake: number;
  network_info: {
    host: string;
    port: number;
  };
}

export interface NetworkMetrics {
  total_authorities: number;
  online_authorities: number;
  total_transactions: number;
  successful_transactions: number;
  average_confirmation_time: number;
  network_latency: number;
  last_calculated: string; // ISO date string
}

export interface TransferOrder {
  order_id: string;
  sender: string;
  recipient: string;
  amount: number;
  token: 'USDT' | 'USDC';
  sequence_number: number;
  timestamp: string; // ISO date string
  signature?: string;
}

export interface ConfirmationOrder {
  confirmation_id: string;
  transfer_order_id: string;
  authority_name: string;
  confirmed: boolean;
  signature: string;
  timestamp: string; // ISO date string
  certificate?: string;
}

export interface TransactionRecord {
  transaction_id: string;
  transfer_order: TransferOrder;
  confirmations: ConfirmationOrder[];
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  created_at: string; // ISO date string
  completed_at?: string; // ISO date string
  error_message?: string;
}

export interface Certificate {
  certificate_id: string;
  transaction_id: string;
  transfer_order: TransferOrder;
  authority_signatures: ConfirmationOrder[];
  quorum_achieved: boolean;
  issued_at: string; // ISO date string
  valid_until?: string; // ISO date string
  certificate_hash: string;
}

export interface WalletBalance {
  USDT: number;
  USDC: number;
}

// Enhanced balance interface for MeshPay integration
export interface EnhancedWalletBalance {
  USDT: {
    wallet: number;      // Regular wallet balance
    meshpay: number;     // MeshPay system balance  
    total: number;       // Combined balance
  };
  USDC: {
    wallet: number;
    meshpay: number;
    total: number;
  };
}

// MeshPay account registration status
export interface MeshPayAccountStatus {
  registered: boolean;
  registrationTime?: number;
  lastRedeemedSequence?: number;
}

// Deposit transaction data
export interface DepositTransaction {
  token: 'XTZ' | 'USDT' | 'USDC';
  amount: string;
  status: 'pending' | 'confirming' | 'completed' | 'failed';
  transactionHash?: string;
  timestamp: string;
  error?: string;
}

export interface NetworkTopology {
  authorities: AuthorityInfo[];
  clients: any[]; // ClientState interface would go here
  connections: Record<string, string[]>;
  last_updated: string; // ISO date string
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'authority_update' | 'transaction_update' | 'network_metrics' | 'heartbeat';
  data: any;
  timestamp: string;
}

// Form types
export interface PaymentFormData {
  recipient: string;
  amount: number;
  token: 'USDT' | 'USDC';
  selectedAuthorities?: string[];
}

export interface AuthoritySelectionData {
  authority_name: string;
  selected: boolean;
  reason?: string;
} 