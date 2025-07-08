import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { 
  useCombinedBalances, 
  useIsAccountRegistered, 
  useAccountInfo,
  useRegisterAccount,
  useApproveToken,
  useDepositToFastPay,
  FastPayBalance,
  AccountInfo,
  DepositResult 
} from '../services/fastpay';
import { FastPayAccountStatus, DepositTransaction } from '../types/api';

interface WalletContextType {
  // Account state
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  
  // FastPay account state
  isRegistered: boolean;
  accountInfo: AccountInfo | null;
  registrationStatus: {
    isPending: boolean;
    isConfirming: boolean;
    isConfirmed: boolean;
    error: string | null;
  };
  
  // Balance data
  balances: FastPayBalance | null;
  balancesLoading: boolean;
  balancesError: string | null;
  
  // Deposit state
  depositStatus: {
    isPending: boolean;
    isConfirming: boolean;
    currentStep: 'idle' | 'approving' | 'depositing' | 'completed' | 'failed';
    error: string | null;
  };
  
  // Recent deposits
  recentDeposits: DepositTransaction[];
  
  // Actions
  registerAccount: () => Promise<void>;
  depositToFastPay: (token: 'USDT' | 'USDC', amount: string) => Promise<DepositResult>;
  refreshBalances: () => void;
  clearErrors: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // FastPay registration hooks
  const { data: isRegistered, refetch: refetchRegistration } = useIsAccountRegistered();
  const { data: accountInfo, refetch: refetchAccountInfo } = useAccountInfo();
  const { 
    registerAccount: registerAccountTx, 
    isPending: registrationPending, 
    isConfirming: registrationConfirming, 
    isConfirmed: registrationConfirmed,
    error: registrationError 
  } = useRegisterAccount();
  
  // Balance hooks
  const { balances, isLoading: balancesLoading, error: balancesError } = useCombinedBalances();
  
  // Transaction hooks
  const { approveToken, isPending: approvePending, isConfirming: approveConfirming } = useApproveToken();
  const { deposit, isPending: depositPending, isConfirming: depositConfirming } = useDepositToFastPay();
  
  // Local state
  const [depositStatus, setDepositStatus] = useState({
    isPending: false,
    isConfirming: false,
    currentStep: 'idle' as const,
    error: null as string | null,
  });
  
  const [recentDeposits, setRecentDeposits] = useState<DepositTransaction[]>([]);

  // Effect to update deposit status based on transaction states
  useEffect(() => {
    if (approvePending) {
      setDepositStatus(prev => ({ ...prev, currentStep: 'approving', isPending: true }));
    } else if (approveConfirming) {
      setDepositStatus(prev => ({ ...prev, isConfirming: true }));
    } else if (depositPending) {
      setDepositStatus(prev => ({ ...prev, currentStep: 'depositing', isPending: true, isConfirming: false }));
    } else if (depositConfirming) {
      setDepositStatus(prev => ({ ...prev, isConfirming: true }));
    } else {
      setDepositStatus(prev => ({ 
        ...prev, 
        isPending: false, 
        isConfirming: false,
        currentStep: prev.currentStep === 'depositing' ? 'completed' : prev.currentStep
      }));
    }
  }, [approvePending, approveConfirming, depositPending, depositConfirming]);

  // Register account function
  const handleRegisterAccount = async () => {
    try {
      await registerAccountTx();
      // Refetch registration status after successful registration
      setTimeout(() => {
        refetchRegistration();
        refetchAccountInfo();
      }, 2000);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // Deposit function that handles the complete workflow
  const handleDepositToFastPay = async (token: 'USDT' | 'USDC', amount: string): Promise<DepositResult> => {
    try {
      setDepositStatus({
        isPending: true,
        isConfirming: false,
        currentStep: 'approving',
        error: null,
      });

      // Create deposit record
      const depositRecord: DepositTransaction = {
        token,
        amount,
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      
      setRecentDeposits(prev => [depositRecord, ...prev.slice(0, 9)]); // Keep last 10

      // Step 1: Approve token
      await approveToken(token, amount);
      
      setDepositStatus(prev => ({ ...prev, currentStep: 'depositing' }));
      
      // Step 2: Deposit to FastPay
      await deposit(token, amount);
      
      setDepositStatus({
        isPending: false,
        isConfirming: false,
        currentStep: 'completed',
        error: null,
      });

      // Update deposit record
      setRecentDeposits(prev => 
        prev.map(d => 
          d.timestamp === depositRecord.timestamp 
            ? { ...d, status: 'completed' as const }
            : d
        )
      );

      // Refresh balances after successful deposit
      setTimeout(() => {
        refreshBalances();
      }, 2000);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deposit failed';
      
      setDepositStatus({
        isPending: false,
        isConfirming: false,
        currentStep: 'failed',
        error: errorMessage,
      });

      // Update deposit record
      setRecentDeposits(prev => 
        prev.map(d => 
          d.timestamp === depositRecord.timestamp 
            ? { ...d, status: 'failed' as const, error: errorMessage }
            : d
        )
      );

      return { success: false, error: errorMessage };
    }
  };

  // Refresh balances
  const refreshBalances = () => {
    refetchRegistration();
    refetchAccountInfo();
    // Note: wagmi handles automatic refetching for balances
  };

  // Clear errors
  const clearErrors = () => {
    setDepositStatus(prev => ({ ...prev, error: null }));
  };

  const contextValue: WalletContextType = {
    // Account state
    isConnected,
    address,
    chainId,
    
    // FastPay account state
    isRegistered: Boolean(isRegistered),
    accountInfo: accountInfo ? {
      registered: accountInfo[0],
      registrationTime: Number(accountInfo[1]),
      lastRedeemedSequence: Number(accountInfo[2]),
    } : null,
    registrationStatus: {
      isPending: registrationPending,
      isConfirming: registrationConfirming,
      isConfirmed: registrationConfirmed,
      error: registrationError?.message || null,
    },
    
    // Balance data
    balances,
    balancesLoading,
    balancesError,
    
    // Deposit state
    depositStatus,
    
    // Recent deposits
    recentDeposits,
    
    // Actions
    registerAccount: handleRegisterAccount,
    depositToFastPay: handleDepositToFastPay,
    refreshBalances,
    clearErrors,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export default WalletContext; 