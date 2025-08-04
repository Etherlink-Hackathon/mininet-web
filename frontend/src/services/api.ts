import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { cacheService } from './cacheService';

// Types used in the UI – keep existing imports working
import type {
  AuthorityInfo,
  NetworkMetrics,
  TransactionRecord,
  WalletBalances,
  NetworkTopology,
  Certificate,
  TransferOrder,
  ShardInfo,
  AccountInfo,
  ConfirmationOrder,
  CertifiedTransferOrder,
} from '../types/api';

// ---------------------------------------------------------------------------
// Axios client configuration
// ---------------------------------------------------------------------------
const API_BASE_URL = '/api';

// Cache TTL configurations (in milliseconds)
const CACHE_TTL = {
  SHARDS: 30 * 60 * 1000,        // 30 minutes
  AUTHORITIES: 30 * 1000,       // 30 seconds
  NETWORK_METRICS: 60 * 1000,   // 1 minute
  TRANSACTIONS: 5 * 60 * 1000,  // 5 minutes
  WALLET_BALANCE: 30 * 60 * 1000, // 30 minutes
  HEALTH: 10 * 1000,            // 10 seconds
};

// Fallback data for when API is unavailable
const FALLBACK_DATA = {
  shards: [] as ShardInfo[],
  authorities: [] as AuthorityInfo[],
  networkMetrics: {
    total_transactions: 0,
    successful_transactions: 0,
    average_confirmation_time: 0,
    online_authorities: 0,
    total_authorities: 0,
    network_latency: 0,
  } as NetworkMetrics,
  transactions: [] as TransactionRecord[],
  walletAccount: { address: '', balances: { XTZ: { token_symbol: 'XTZ', token_address: '0x0000000000000000000000000000000000000000', wallet_balance: 0, meshpay_balance: 0, total_balance: 0 }, WTZ: { token_symbol: 'WTZ', token_address: '0x0000000000000000000000000000000000000000', wallet_balance: 0, meshpay_balance: 0, total_balance: 0 }, USDT: { token_symbol: 'USDT', token_address: '0x0000000000000000000000000000000000000000', wallet_balance: 0, meshpay_balance: 0, total_balance: 0 }, USDC: { token_symbol: 'USDC', token_address: '0x0000000000000000000000000000000000000000', wallet_balance: 0, meshpay_balance: 0, total_balance: 0 } }, is_registered: false, registration_time: 0, last_redeemed_sequence: 0, sequence_number: 0 } as AccountInfo,
};

class ApiService {
  private client: AxiosInstance;
  private isOnline: boolean = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 3_000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach interceptors (kept from previous version)
    this.client.interceptors.request.use((cfg) => {
      const token = localStorage.getItem('auth_token');
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });

    this.client.interceptors.response.use(
      (res: AxiosResponse) => {
        this.isOnline = true;
        return res;
      },
      (err) => {
        this.isOnline = false;
        if (err.response?.status === 401) localStorage.removeItem('auth_token');
        return Promise.reject(err);
      },
    );
  }

  /**
   * Generic method to fetch data with caching and fallback
   */
  private async fetchWithCache<T>(
    endpoint: string,
    cacheKey: string,
    ttl: number,
    fallbackData?: T,
    params?: Record<string, any>
  ): Promise<T> {
    try {
      // Try to fetch fresh data from API
      const { data } = await this.client.get<T>(endpoint);

      // Cache the successful response
      cacheService.set(cacheKey, data, ttl, params);
 
      return data;
    } catch (error) {
      const cachedData = cacheService.get<T>(cacheKey, params);
      if (cachedData !== null) {
        return cachedData;
      }
      if (fallbackData) {
        return fallbackData;
      }
      throw error;
    }
  }

  /**
   * Get shards with caching and fallback
   */
  async getShards(): Promise<ShardInfo[]> {
    return this.fetchWithCache<ShardInfo[]>(
      '/shards',
      'shards',
      CACHE_TTL.SHARDS,
      FALLBACK_DATA.shards
    );
  }

  /**
   * Get authorities with caching and fallback
   */
  async getAuthorities(): Promise<AuthorityInfo[]> {
    return this.fetchWithCache<AuthorityInfo[]>(
      '/authorities',
      'authorities',
      CACHE_TTL.AUTHORITIES,
      FALLBACK_DATA.authorities
    );
  }

  /**
   * Get specific authority with caching
   */
  async getAuthority(name: string): Promise<AuthorityInfo> {
    return this.fetchWithCache<AuthorityInfo>(
      `/authorities/${name}`,
      'authority',
      CACHE_TTL.AUTHORITIES,
      {} as AuthorityInfo,
      { name }
    );
  }

  /**
   * Send transfer through chosen authority.
   * Backend signature: POST /transfer
   */
  async transfer(payload: {transfer_order: TransferOrder}): Promise<any> {
    try {
      const { data } = await this.client.post('/transfer', payload);
      return data;
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    }
  }

  /**
   * Broadcast transfer to the network.
   * Backend signature: POST /confirm
   */
  async confirm(payload: ConfirmationOrder): Promise<any> {
    try {
      const { data } = await this.client.post('/confirm', payload);
      return data;
    } catch (error) {
      console.error('Broadcast failed:', error);
      throw error;
    }
  }

  /**
   * Ping authority with caching
   */
  async pingAuthority(name: string): Promise<any> {
    return this.fetchWithCache<any>(
      `/ping/${name}`,
      'ping',
      CACHE_TTL.HEALTH,
      { status: 'offline', latency: -1 },
      { name }
    );
  }

  /**
   * Get health status with caching
   */
  async getHealth(): Promise<any> {
    return this.fetchWithCache<any>(
      '/health',
      'health',
      CACHE_TTL.HEALTH,
      { status: 'offline', timestamp: new Date().toISOString() }
    );
  }

  // -----------------------------------------------------------------------
  // 💤 Legacy methods – return placeholders so UI doesn't crash
  // -----------------------------------------------------------------------

  async getNetworkTopology(): Promise<NetworkTopology> {
    return this.fetchWithCache<NetworkTopology>(
      '/network/topology',
      'networkTopology',
      CACHE_TTL.NETWORK_METRICS,
      { authorities: [], clients: [], connections: {}, last_updated: new Date().toISOString() } as NetworkTopology
    );
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    return this.fetchWithCache<NetworkMetrics>(
      '/network/metrics',
      'networkMetrics',
      CACHE_TTL.NETWORK_METRICS,
      FALLBACK_DATA.networkMetrics
    );
  }

  async getTransactionHistory(): Promise<TransactionRecord[]> {
    return this.fetchWithCache<TransactionRecord[]>(
      '/transactions/history',
      'transactionHistory',
      CACHE_TTL.TRANSACTIONS,
      FALLBACK_DATA.transactions
    );
  }

  async getTransaction(transactionId: string): Promise<TransactionRecord> {
    return this.fetchWithCache<TransactionRecord>(
      `/transactions/${transactionId}`,
      'transaction',
      CACHE_TTL.TRANSACTIONS,
      {} as TransactionRecord,
      { transactionId }
    );
  }

  async getTransactionCertificate(transactionId: string): Promise<Certificate> {
    return this.fetchWithCache<Certificate>(
      `/transactions/${transactionId}/certificate`,
      'certificate',
      CACHE_TTL.TRANSACTIONS,
      {} as Certificate,
      { transactionId }
    );
  }

  async getWalletAccount(address: string): Promise<AccountInfo> {
    return this.fetchWithCache<AccountInfo>(
      `/accounts/${address}`,
      'walletAccount',
      CACHE_TTL.WALLET_BALANCE,
    );
  }

  // -----------------------------------------------------------------------
  // Cache management methods
  // -----------------------------------------------------------------------

  /**
   * Clear all cached data
   */
  clearCache(): void {
    cacheService.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Check if API is online
   */
  isApiOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Force refresh specific data type
   */
  async refreshData(dataType: 'shards' | 'authorities' | 'networkMetrics' | 'transactions'): Promise<void> {
    const cacheKeys = {
      shards: 'shards',
      authorities: 'authorities', 
      networkMetrics: 'networkMetrics',
      transactions: 'transactionHistory',
    };
    
    cacheService.remove(cacheKeys[dataType]);
  }

  // -----------------------------------------------------------------------
  // Shared error helper
  // -----------------------------------------------------------------------

  handleApiError(err: any): string {
    if (err.response) {
      const msg = err.response.data?.message || err.response.data?.detail || 'Error';
      return `Error ${err.response.status}: ${msg}`;
    }
    if (err.request) {
      // Check if we have cached data available
      const cacheStats = this.getCacheStats();
      if (cacheStats.totalEntries > 0) {
        return 'Network error: using cached data';
      }
      return 'Network error: cannot reach backend';
    }
    return `Error: ${err.message}`;
  }

  // WebSocket helper – not available yet; placeholder to avoid breaking imports
  createWebSocketConnection(): WebSocket {
    const url = import.meta.env.VITE_WS_URL || 'ws://192.168.1.142:8080/ws/updates';
    return new WebSocket(url);
  }
}

export const apiService = new ApiService();
export default ApiService; 