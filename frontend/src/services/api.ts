// Updated API service for the *flat-route* backend (no /api/v1 prefix)
// Only essential endpoints are wired; unimplemented ones return safe defaults

import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Types used in the UI – keep existing imports working
import type {
  AuthorityInfo,
  NetworkMetrics,
  TransactionRecord,
  WalletBalance,
  NetworkTopology,
  Certificate,
  PaymentFormData,
  ShardInfo,
} from '../types/api';

// ---------------------------------------------------------------------------
// Axios client configuration
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach interceptors (kept from previous version)
    this.client.interceptors.request.use((cfg) => {
      const token = localStorage.getItem('auth_token');
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });

    this.client.interceptors.response.use(
      (res: AxiosResponse) => res,
      (err) => {
        if (err.response?.status === 401) localStorage.removeItem('auth_token');
        return Promise.reject(err);
      },
    );
  }

  async getShards(): Promise<ShardInfo[]> {
    const { data } = await this.client.get<ShardInfo[]>('/api/shards');
    console.log('data', data);
    return data;
  }

  async getAuthorities(): Promise<AuthorityInfo[]> {
    const { data } = await this.client.get<AuthorityInfo[]>('/api/authorities');
    return data;
  }

  async getAuthority(name: string): Promise<AuthorityInfo> {
    const { data } = await this.client.get<AuthorityInfo>(`/api/authorities/${name}`);
    return data;
  }

  /**
   * Send transfer through chosen authority.
   * Backend signature: POST /transfer?authority=NAME
   */
  async createTransfer(authority: string, payload: PaymentFormData): Promise<any> {
    const { data } = await this.client.post('/api/transfer', payload, {
      params: { authority },
    });
    return data;
  }

  async pingAuthority(name: string): Promise<any> {
    const { data } = await this.client.post(`/api/ping/${name}`);
    return data;
  }

  async getHealth(): Promise<any> {
    const { data } = await this.client.get('/api/health');
    return data;
  }

  // -----------------------------------------------------------------------
  // 💤 Legacy methods – return placeholders so UI doesn’t crash
  // -----------------------------------------------------------------------

  async getNetworkTopology(): Promise<NetworkTopology> {
    return { nodes: [], links: [] } as unknown as NetworkTopology;
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    // Backend not implemented yet – return safe defaults
    return {
      total_transactions: 0,
      successful_transactions: 0,
      average_confirmation_time: 0,
      online_authorities: 0,
      total_authorities: 0,
      network_latency: 0,
    } as NetworkMetrics;
  }

  async getTransactionHistory(): Promise<TransactionRecord[]> {
    return [];
  }

  async getTransaction(transactionId: string): Promise<TransactionRecord> {
    throw new Error('getTransaction not implemented in new backend');
  }

  async getTransactionCertificate(transactionId: string): Promise<Certificate> {
    throw new Error('getTransactionCertificate not implemented in new backend');
  }

  async getWalletBalance(): Promise<WalletBalance> {
    return { balance: 0, token: 'USDT' } as unknown as WalletBalance;
  }

  // -----------------------------------------------------------------------
  // Shared error helper
  // -----------------------------------------------------------------------

  handleApiError(err: any): string {
    if (err.response) {
      const msg = err.response.data?.message || err.response.data?.detail || 'Error';
      return `Error ${err.response.status}: ${msg}`;
    }
    if (err.request) return 'Network error: cannot reach backend';
    return `Error: ${err.message}`;
  }

  // WebSocket helper – not available yet; placeholder to avoid breaking imports
  createWebSocketConnection(): WebSocket {
    const url = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/updates';
    return new WebSocket(url);
  }
}

export const apiService = new ApiService();
export default ApiService; 