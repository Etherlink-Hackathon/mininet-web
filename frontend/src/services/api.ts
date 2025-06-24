// API service for communicating with the FastAPI backend

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthorityInfo, 
  NetworkMetrics, 
  TransactionRecord, 
  WalletBalance, 
  NetworkTopology,
  Certificate,
  PaymentFormData
} from '../types/api';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login or clear token
          localStorage.removeItem('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  // Authority endpoints
  async getAuthorities(): Promise<AuthorityInfo[]> {
    const response = await this.client.get<AuthorityInfo[]>('/authorities');
    return response.data;
  }

  async getAuthority(authorityName: string): Promise<AuthorityInfo> {
    const response = await this.client.get<AuthorityInfo>(`/authorities/${authorityName}`);
    return response.data;
  }

  async getAuthorityShards(authorityName: string): Promise<any> {
    const response = await this.client.get(`/authorities/${authorityName}/shards`);
    return response.data;
  }

  async pingAuthority(authorityName: string): Promise<any> {
    const response = await this.client.post(`/authorities/${authorityName}/ping`);
    return response.data;
  }

  // Network endpoints
  async getNetworkTopology(): Promise<NetworkTopology> {
    const response = await this.client.get<NetworkTopology>('/authorities/network/topology');
    return response.data;
  }

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    const response = await this.client.get<NetworkMetrics>('/authorities/network/metrics');
    return response.data;
  }

  // Transaction endpoints
  async createTransfer(paymentData: PaymentFormData): Promise<TransactionRecord> {
    const response = await this.client.post<TransactionRecord>('/transactions/transfer', paymentData);
    return response.data;
  }

  async getTransaction(transactionId: string): Promise<TransactionRecord> {
    const response = await this.client.get<TransactionRecord>(`/transactions/${transactionId}`);
    return response.data;
  }

  async getTransactionCertificate(transactionId: string): Promise<Certificate> {
    const response = await this.client.get<Certificate>(`/transactions/${transactionId}/certificate`);
    return response.data;
  }

  // Wallet endpoints
  async getWalletBalance(): Promise<WalletBalance> {
    const response = await this.client.get<WalletBalance>('/wallet/balance');
    return response.data;
  }

  async getTransactionHistory(): Promise<TransactionRecord[]> {
    const response = await this.client.get<TransactionRecord[]>('/wallet/history');
    return response.data;
  }

  // Health check
  async getHealth(): Promise<any> {
    const response = await this.client.get('/health', {
      baseURL: API_BASE_URL, // Use base URL without /api/v1
    });
    return response.data;
  }

  // WebSocket connection helper
  createWebSocketConnection(): WebSocket {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws/updates';
    return new WebSocket(wsUrl);
  }

  // Error handling helper
  handleApiError(error: any): string {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const message = error.response.data?.message || error.response.data?.detail || 'An error occurred';
      return `Error ${error.response.status}: ${message}`;
    } else if (error.request) {
      // The request was made but no response was received
      return 'Network error: Unable to connect to the server';
    } else {
      // Something happened in setting up the request that triggered an Error
      return `Error: ${error.message}`;
    }
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Export for testing or alternative usage
export default ApiService; 