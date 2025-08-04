import axios from 'axios';
import { AccountInfo } from '../types/api';


export interface TokenBalance {
  token_symbol: string;
  token_address: string;
  wallet_balance: string;
  meshpay_balance: string;
  total_balance: string;
  decimals: number;
}

export interface WalletBalances {
  address: string;
  balances: TokenBalance[];
  total_value_usd?: string;
}

export interface RegistrationStatus {
  address: string;
  is_registered: boolean;
  can_register: boolean;
  message: string;
}

export interface ContractStats {
  total_accounts: number;
  total_native_balance: string;
  total_token_balances: Record<string, string>;
}

export interface RecentEvent {
  event: string;
  block_number: number;
  transaction_hash: string;
  args: Record<string, any>;
  timestamp?: number;
}

export interface HealthCheck {
  connected: boolean;
  chain_id?: number;
  latest_block?: number;
  meshpay_contract: boolean;
  total_accounts?: number;
  error?: string;
}

// Create axios instance for wallet API calls
const serverClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL,
  timeout: 3_000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Server service for wallet-related API calls
 */
export const serverService = {
  /**
   * Get account information from MeshPay smart contract
   * @param address - Ethereum address to query
   * @returns Account information including registration status
   */
  async getWalletAccount(address: string): Promise<AccountInfo> {
    try {
      const response = await serverClient.get(`/api/wallet/${address}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Check if an address is registered with MeshPay and can register if not
   * @param address - Ethereum address to check
   * @returns Registration status and guidance
   */
  async getRegistrationStatus(address: string): Promise<RegistrationStatus> {
    try {
      const response = await serverClient.get(`/wallet/registration-status/${address}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get registration status:', error);
      throw new Error(`Failed to get registration status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get overall MeshPay contract statistics
   * @returns Contract statistics including total accounts and balances
   */
  async getContractStats(): Promise<ContractStats> {
    try {
      const response = await serverClient.get('/wallet/contract-stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get contract stats:', error);
      throw new Error(`Failed to get contract stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get recent blockchain events from MeshPay contract
   * @param eventType - Type of event to query (AccountRegistered, FundingCompleted, etc.)
   * @param limit - Maximum number of events to return
   * @param fromBlock - Starting block number (defaults to recent blocks)
   * @returns List of recent events
   */
  async getRecentEvents(
    eventType: string = 'AccountRegistered',
    limit: number = 10,
    fromBlock?: number
  ): Promise<RecentEvent[]> {
    try {
      const params = new URLSearchParams({
        event_type: eventType,
        limit: limit.toString(),
        ...(fromBlock && { from_block: fromBlock.toString() })
      });
      
      const response = await serverClient.get(`/wallet/recent-events?${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recent events:', error);
      throw new Error(`Failed to get recent events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Check blockchain connection and contract health
   * @returns Health status of blockchain connection and MeshPay contract
   */
  async getHealthCheck(): Promise<HealthCheck> {
    try {
      const response = await serverClient.get('/wallet/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get health check:', error);
      throw new Error(`Failed to get health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Get root wallet endpoint with basic info
   * @returns Basic wallet service information
   */
  async getWalletInfo(): Promise<Record<string, any>> {
    try {
      const response = await serverClient.get('/wallet/');
      return response.data;
    } catch (error) {
      console.error('Failed to get wallet info:', error);
      throw new Error(`Failed to get wallet info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Legacy balance endpoint - redirects to contract stats
   * @returns Legacy balance format
   */
  async getLegacyBalance(): Promise<{ balance: number; token: string; total_accounts?: number }> {
    try {
      const response = await serverClient.get('/wallet/balance');
      return response.data;
    } catch (error) {
      console.error('Failed to get legacy balance:', error);
      throw new Error(`Failed to get legacy balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

export default serverService;
