// TypeScript interfaces for the Etherlink Offline Payment API

import { UUID } from "crypto";

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
  state: {
    last_sync_time: string; // ISO date string
    performance_metrics: Record<string, number>;
    stake: number;
  };
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
  order_id?: string;
  sender: string;
  recipient: string;
  amount: number;
  token_address: string;
  sequence_number: number;
  signature: string | null;
  timestamp?: string; 
}

export interface CertifiedTransferOrder {
  transfer_order: TransferOrder;
  authority_signatures: string[];
}

export interface ConfirmationOrder {
  order_id: string;
  transfer_order: TransferOrder;
  authority_signatures: string[];
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
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

export type TokenBalance = {
  token_symbol: string;
  token_address: string;
  wallet_balance: number;
  meshpay_balance: number;
  total_balance: number;
}

export type AccountInfo = {
  address: string;
  balances: Record<string, TokenBalance>;
  sequence_number: number;
  is_registered: boolean;
  registration_time: number;
  last_redeemed_sequence: number;
}



export type WalletBalances = {
  address: string;
  balances: TokenBalance[];
  total_value_usd: number;
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

export interface AuthoritySelectionData {
  authority_name: string;
  selected: boolean;
  reason?: string;
} 