import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, type Address } from 'viem';
import { FASTPAY_CONTRACT, SUPPORTED_TOKENS, ERC20_ABI, type TokenSymbol } from '../config/contracts';
import { TokenBalance, SmartPayBalance } from '../services/fastpay';

// Enhanced types for registration and deposit status
interface RegistrationStatus {
  isPending: boolean;
  isConfirming: boolean;
  isComplete: boolean;
  error: string | null;
  transactionHash?: string;
}

interface DepositStatus {
  isPending: boolean;
  isConfirming: boolean;
  currentStep: 'idle' | 'approving' | 'depositing' | 'completed';
  error: string | null;
  transactionHash?: string;
}

interface ContractAccountInfo {
  isRegistered: boolean;
  registrationTime: bigint;
  lastRedeemedSequence: bigint;
}

interface WalletContextType {
  // Connection status
  isConnected: boolean;
  address: Address | undefined;
  
  // Account registration
  isRegistered: boolean;
  accountInfo: ContractAccountInfo | null;
  registrationStatus: RegistrationStatus;
  registerAccount: () => Promise<void>;
  
  // Balances
  balances: SmartPayBalance | null;
  balancesLoading: boolean;
  balancesError: string | null;
  refreshBalances: () => Promise<void>;
  
  // Deposits
  depositStatus: DepositStatus;
  depositToSmartPay: (token: TokenSymbol, amount: string) => Promise<{ success: boolean; txHash?: string }>;
  
  // Recent activity
  recentDeposits: any[];
  
  // Error management
  clearErrors: () => void;
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
  
  // State for registration
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
    isPending: false,
    isConfirming: false,
    isComplete: false,
    error: null,
  });
  
  // State for deposits
  const [depositStatus, setDepositStatus] = useState<DepositStatus>({
    isPending: false,
    isConfirming: false,
    currentStep: 'idle',
    error: null,
  });
  
  // State for balances and account info
  const [balances, setBalances] = useState<SmartPayBalance | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  
  // Contract read hooks for account info
  const { data: isRegistered, refetch: refetchRegistration } = useReadContract({
    address: FASTPAY_CONTRACT.address,
    abi: FASTPAY_CONTRACT.abi,
    functionName: 'isAccountRegistered',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: accountInfoData, refetch: refetchAccountInfo } = useReadContract({
    address: FASTPAY_CONTRACT.address,
    abi: FASTPAY_CONTRACT.abi,
    functionName: 'getAccountInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Parse account info with proper typing
  const accountInfo: ContractAccountInfo | null = accountInfoData && Array.isArray(accountInfoData)
    ? {
        isRegistered: accountInfoData[0] as boolean,
        registrationTime: accountInfoData[1] as bigint,
        lastRedeemedSequence: accountInfoData[2] as bigint,
      }
    : null;

  // Native balance hook
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  // Contract write hooks
  const { writeContract: writeRegister, data: registerHash, isPending: isRegisterPending } = useWriteContract();
  const { writeContract: writeFunding, data: fundingHash, isPending: isFundingPending } = useWriteContract();
  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovalPending } = useWriteContract();

  // Transaction receipt hooks
  const { isLoading: isRegisterConfirming, isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({
    hash: registerHash,
  });
  
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });
  
  const { isLoading: isFundingConfirming, isSuccess: isFundingSuccess } = useWaitForTransactionReceipt({
    hash: fundingHash,
  });

  // Register account function
  const registerAccount = async (): Promise<void> => {
    if (!address) throw new Error('No wallet connected');
    
    try {
      setRegistrationStatus({
        isPending: true,
        isConfirming: false,
        isComplete: false,
        error: null,
      });

      writeRegister({
        address: FASTPAY_CONTRACT.address,
        abi: FASTPAY_CONTRACT.abi,
        functionName: 'registerAccount',
      });
    } catch (error) {
      setRegistrationStatus(prev => ({
        ...prev,
        isPending: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }));
    }
  };

  // Deposit to SmartPay function
  const depositToSmartPay = async (token: TokenSymbol, amount: string): Promise<{ success: boolean; txHash?: string }> => {
    if (!address) throw new Error('No wallet connected');
    if (!isRegistered) throw new Error('Account not registered');

    const tokenConfig = SUPPORTED_TOKENS[token];
    const amountWei = parseEther(amount);

    try {
      setDepositStatus({
        isPending: true,
        isConfirming: false,
        currentStep: tokenConfig.isNative ? 'depositing' : 'approving',
        error: null,
      });

      if (tokenConfig.isNative) {
        // Handle native XTZ funding
        writeFunding({
          address: FASTPAY_CONTRACT.address,
          abi: FASTPAY_CONTRACT.abi,
          functionName: 'handleNativeFundingTransaction',
          value: amountWei,
        });
      } else {
        // Handle ERC20 token funding (requires approval first)
        writeApproval({
          address: tokenConfig.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [FASTPAY_CONTRACT.address, amountWei],
        });
      }

      return { success: true };
    } catch (error) {
      setDepositStatus(prev => ({
        ...prev,
        isPending: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      }));
      return { success: false };
    }
  };

  // Refresh balances function using wagmi hooks
  const refreshBalances = async (): Promise<void> => {
    if (!address || !isConnected) return;

    try {
      setBalancesLoading(true);
      setBalancesError(null);

      // Build balances for each token
      const newBalances: SmartPayBalance = {} as SmartPayBalance;
      
      for (const [symbol, config] of Object.entries(SUPPORTED_TOKENS)) {
        const tokenSymbol = symbol as TokenSymbol;
        
        // Get wallet balance
        let walletBalance = '0';
        if (config.isNative) {
          // Use native balance from hook
          walletBalance = nativeBalance ? formatEther(nativeBalance.value) : '0';
        } else {
          // For ERC20 tokens, we'll use a simpler approach for now
          try {
            // This will be handled by separate contract reads in the future
            walletBalance = '0'; // Placeholder - implement proper ERC20 balance reading
          } catch {
            walletBalance = '0';
          }
        }

        // Get SmartPay balance - placeholder for now
        const fastpayBalance = '0'; // This will be implemented with proper contract reads

        newBalances[tokenSymbol] = {
          wallet: walletBalance,
          fastpay: fastpayBalance,
          total: (parseFloat(walletBalance) + parseFloat(fastpayBalance)).toString(),
        };
      }

      setBalances(newBalances);
    } catch (error) {
      setBalancesError(error instanceof Error ? error.message : 'Failed to load balances');
    } finally {
      setBalancesLoading(false);
    }
  };

  // Clear errors function
  const clearErrors = (): void => {
    setRegistrationStatus(prev => ({ ...prev, error: null }));
    setDepositStatus(prev => ({ ...prev, error: null }));
    setBalancesError(null);
  };

  // Effects for handling transaction states
  useEffect(() => {
    setRegistrationStatus(prev => ({
      ...prev,
      isPending: isRegisterPending,
      isConfirming: isRegisterConfirming,
      isComplete: isRegisterSuccess,
      transactionHash: registerHash,
    }));
  }, [isRegisterPending, isRegisterConfirming, isRegisterSuccess, registerHash]);

  useEffect(() => {
    if (isApprovalSuccess && depositStatus.currentStep === 'approving') {
      // After approval success, proceed with funding
      setDepositStatus(prev => ({ ...prev, currentStep: 'depositing' }));
    }
  }, [isApprovalSuccess, depositStatus.currentStep]);

  // Separate effect for handling the funding transaction after approval
  useEffect(() => {
    if (depositStatus.currentStep === 'depositing' && !isFundingPending) {
      // This would need to store the amount and token from the original deposit call
      // For now, this is a placeholder for the ERC20 funding flow
    }
  }, [depositStatus.currentStep, isFundingPending]);

  useEffect(() => {
    if (isFundingSuccess) {
      setDepositStatus(prev => ({
        ...prev,
        isPending: false,
        isConfirming: false,
        currentStep: 'completed',
      }));
      
      // Refresh balances after successful funding
      refreshBalances();
    }
  }, [isFundingSuccess]);

  // Refresh data when account changes
  useEffect(() => {
    if (isConnected && address) {
      refreshBalances();
      refetchRegistration();
      refetchAccountInfo();
      refetchNativeBalance();
    }
  }, [isConnected, address]);

  const contextValue: WalletContextType = {
    isConnected,
    address,
    isRegistered: Boolean(isRegistered),
    accountInfo,
    registrationStatus,
    registerAccount,
    balances,
    balancesLoading,
    balancesError,
    refreshBalances,
    depositStatus,
    depositToSmartPay,
    recentDeposits,
    clearErrors,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}; 