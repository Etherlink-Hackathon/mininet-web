import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { type Address } from 'viem';
import { MESHPAY_CONTRACT, SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import {
  MeshPayBalance,
  useDepositFlow,
} from '../services/meshpay';
import { apiService } from '../services/api';
import { serverService } from '../services/server';
import { cacheService } from '../services/cacheService';
import { AccountInfo, TokenBalance } from '../types/api';

// --- Clean Context State Types ---

interface DepositStatus {
  isPending: boolean;
  isConfirming: boolean;
  currentStep: 'idle' | 'approving' | 'depositing' | 'completed';
  error: string | null;
  transactionHash?: string;
}

interface WalletContextType {
  // Connection status
  isConnected: boolean;
  address: Address | undefined;
  
  // Unified State
  accountInfo: AccountInfo;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  fetchData: (forceRefresh?: boolean) => Promise<void>;

  // Deposits
  depositStatus: DepositStatus;
  setDepositStatus: (status: DepositStatus) => void;
  depositToMeshPay: (token: TokenSymbol, amount: string) => Promise<void>;
  
  // Error management
  clearErrors: () => void;
  
  // Cache management
  getCachedBalance: () => AccountInfo | null;
  updateCachedBalance: (tokenAddress: string, amount: string) => void;
  updateCachedSequenceNumber: (sequence_number: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const { wallets } = useWallets();
  // Get wallet info
  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address;

  // --- State for wallet data ---
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    address: '',
    sequence_number: 0,
    is_registered: false,
    registration_time: 0,
    last_redeemed_sequence: 0,
    balances: {
      [SUPPORTED_TOKENS["XTZ"].address]: { token_symbol: 'XTZ', token_address: SUPPORTED_TOKENS["XTZ"].address, wallet_balance: 0, meshpay_balance: 0, total_balance: 0 },
      [SUPPORTED_TOKENS["WTZ"].address]: { token_symbol: 'WTZ', token_address: SUPPORTED_TOKENS["WTZ"].address, wallet_balance: 0, meshpay_balance: 0, total_balance: 0 },
      [SUPPORTED_TOKENS["USDT"].address]: { token_symbol: 'USDT', token_address: SUPPORTED_TOKENS["USDT"].address, wallet_balance: 0, meshpay_balance: 0, total_balance: 0 },
      [SUPPORTED_TOKENS["USDC"].address]: { token_symbol: 'USDC', token_address: SUPPORTED_TOKENS["USDC"].address, wallet_balance: 0, meshpay_balance: 0, total_balance: 0 },
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for deposits
  const [depositStatus, setDepositStatus] = useState<DepositStatus>({
    isPending: false,
    isConfirming: false,
    currentStep: 'idle',
    error: null,
  });
  
  // MeshPay-specific hooks (reusable across app)
  const { 
    initiateDeposit, 
    isLoading: isDepositFlowLoading, 
    isApprovePending, 
    isDepositPending, 
    isSuccess: isDepositFlowSuccess,
    error: depositFlowError
  } = useDepositFlow();

  // Note: We rely on the status flags returned by these hooks if needed.

  // --- Data Fetching and Transformation ---
  const fetchData = async () => {
    console.log('fetchData', isConnected, address);
    if (!isConnected || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let accountData: AccountInfo;
      
      try {
        // Try apiService first
        const accountResponse = await apiService.getWalletAccount(address);
        console.log('Account data:', accountResponse);
        accountData = accountResponse;
      } catch (error) {
        console.warn('apiService.getWalletAccount failed, trying serverService:', error);
        
        // Fallback to serverService
        try {
          const serverAccountResponse = await serverService.getWalletAccount(address);
          
          // Convert server response to AccountInfo format
          accountData = {
            address: serverAccountResponse.address,
            balances: serverAccountResponse.balances, // Server doesn't return balances, will need to fetch separately
            sequence_number: 0, // Default sequence number
            is_registered: serverAccountResponse.is_registered,
            registration_time: serverAccountResponse.registration_time,
            last_redeemed_sequence: serverAccountResponse.last_redeemed_sequence,
          };
        } catch (serverError) {
          console.error('Both apiService and serverService failed:', serverError);
          throw new Error('Failed to fetch account data from both API and server services');
        }
      }
      
      setAccountInfo({
        address: accountData.address,
        balances: accountData.balances,
        sequence_number: accountData.sequence_number,
        is_registered: accountData.is_registered,
        registration_time: accountData.registration_time,
        last_redeemed_sequence: accountData.last_redeemed_sequence,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get cached balance data as fallback
   */
  const getCachedBalance = (): AccountInfo | null => {
    if (!address) return null;
    
    try {
      const cached = cacheService.get<AccountInfo>('walletAccount');
      return cached;
    } catch (error) {
      console.warn('Failed to get cached balance:', error);
      return null;
    }
  };
  
  const updateCachedBalance = (tokenAddress: string, amount: string) => {
    if (!accountInfo.balances) return;
    cacheService.set('walletAccount', {
      ...accountInfo,
      balances: {
        ...accountInfo.balances,
        ...(tokenAddress in accountInfo.balances
          ? {
              [tokenAddress]: {
                ...accountInfo.balances[tokenAddress as keyof typeof accountInfo.balances],
                wallet_balance: Math.max(
                  0,
                  Number(accountInfo.balances[tokenAddress as keyof typeof accountInfo.balances].wallet_balance) - parseFloat(amount)
                ),
                meshpay_balance:
                  (Number(accountInfo.balances[tokenAddress as keyof typeof accountInfo.balances].meshpay_balance) + parseFloat(amount)),
                total_balance: accountInfo.balances[tokenAddress as keyof typeof accountInfo.balances].total_balance,
              },
            }
          : {}),
      }
    });
  };
  const updateCachedSequenceNumber = (sequence_number: number) => {
    cacheService.set('walletAccount', {
      ...accountInfo,
      sequence_number: sequence_number,
    });
  };
  /**
   * Initiates a deposit to the MeshPay contract.
   *
   * @param token - The symbol of the token to deposit.
   * @param amount - The amount to deposit as a string.
   * @returns An object containing the transaction hash if available.
   * @throws Error if no wallet is connected or the MeshPay contract address is not configured.
   */
  const depositToMeshPay = async (token: TokenSymbol, amount: string): Promise<void> => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    // Ensure MeshPay contract address is configured
    if (MESHPAY_CONTRACT.address === '0x0000000000000000000000000000000000000000') {
      throw new Error('MeshPay contract address is not configured. Please set VITE_MESHPAY_CONTRACT_ADDRESS in your environment.');
    }

    try {
      setDepositStatus({
        isPending: true,
        isConfirming: false,
        currentStep: 'approving',
        error: null,
      });

      await initiateDeposit(token, amount);

    } catch (err) {
      setDepositStatus(prev => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        currentStep: 'idle',
        error: err instanceof Error ? err.message : 'Deposit failed',
      }));
    }
  };
  
  const clearErrors = (): void => {
    setDepositStatus(prev => ({ ...prev, error: null }));
    setError(null);
  };

  // Effects for handling transaction states
  // Watch for deposit flow completion
  useEffect(() => {
    if (isDepositFlowSuccess) {
      setDepositStatus(prev => ({ ...prev, isPending: false, currentStep: 'completed' }));
      fetchData();
    }
  }, [isDepositFlowSuccess]);

  // Update status based on deposit flow state
  useEffect(() => {
    if (isApprovePending) {
      setDepositStatus(prev => ({ ...prev, currentStep: 'approving', isPending: true }));
    } else if (isDepositPending) {
      setDepositStatus(prev => ({ ...prev, currentStep: 'depositing', isPending: true }));
    }
  }, [isApprovePending, isDepositPending]);

  // Handle user rejection or errors from deposit flow
  useEffect(() => {
    if (depositFlowError) {
      const errorMessage = depositFlowError.message || 'Transaction failed';
      
      // Check if user rejected the transaction
      const isUserRejection = errorMessage.includes('User rejected') || 
                             errorMessage.includes('user rejected') ||
                             errorMessage.includes('User denied') ||
                             errorMessage.includes('user denied') ||
                             errorMessage.includes('rejected') ||
                             errorMessage.includes('denied');
      
      setDepositStatus(prev => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        currentStep: 'idle', 
        error: isUserRejection ? 'Transaction rejected by user' : errorMessage,
      }));
    }
  }, [depositFlowError]);

  // Refresh data when account changes
  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [isConnected, address]);

  const contextValue: WalletContextType = {
    isConnected,
    address,
    accountInfo,
    loading,
    setLoading,
    error,
    fetchData,
    depositStatus,
    setDepositStatus,
    depositToMeshPay,
    clearErrors,
    getCachedBalance,
    updateCachedBalance,
    updateCachedSequenceNumber,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}; 