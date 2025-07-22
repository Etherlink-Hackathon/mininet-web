import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { SMARTPAY_CONTRACT, SUPPORTED_TOKENS, ERC20_ABI, type TokenSymbol } from '../config/contracts';
import { MeshPayBalance } from '../services/meshpay';

// --- API Response Types (from backend) ---
interface BackendAccountInfo {
  address: string;
  is_registered: boolean;
  registration_time: number;
  last_redeemed_sequence: number;
}

interface BackendTokenBalance {
  token_symbol: string;
  token_address: string;
  wallet_balance: string;
  meshpay_balance: string;
  total_balance: string;
  decimals: number;
}

interface BackendWalletBalances {
  address: string;
  balances: BackendTokenBalance[];
}

interface BackendContractStats {
  total_accounts: number;
  total_native_balance: string;
  total_token_balances: Record<string, string>;
}

// --- Clean Context State Types ---
interface AccountInfo {
  isRegistered: boolean;
  registrationTime: number;
  lastRedeemedSequence: number;
}

interface ContractStats {
  totalAccounts: number;
  totalNativeBalance: string;
  totalTokenBalances: Record<string, string>;
}

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

interface WalletContextType {
  // Connection status
  isConnected: boolean;
  address: Address | undefined;
  
  // Unified State
  accountInfo: AccountInfo | null;
  balances: MeshPayBalance | null;
  stats: ContractStats | null;
  loading: boolean;
    error: string | null;
  fetchData: () => Promise<void>;

  // Deposits
  depositStatus: DepositStatus;
  depositToMeshPay: (token: TokenSymbol, amount: string) => Promise<{ success: boolean; txHash?: string }>;
  
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
  
  // --- State for wallet data ---
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [balances, setBalances] = useState<MeshPayBalance | null>(null);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for deposits
  const [depositStatus, setDepositStatus] = useState<DepositStatus>({
    isPending: false,
    isConfirming: false,
    currentStep: 'idle',
    error: null,
  });
  
  // Contract write hooks
  const { writeContract: writeFunding, data: fundingHash, isPending: isFundingPending, error: fundingError } = useWriteContract();
  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovalPending, error: approvalError } = useWriteContract();

  // Transaction receipt hooks
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isLoading: isFundingConfirming, isSuccess: isFundingSuccess } = useWaitForTransactionReceipt({ hash: fundingHash });

  // --- Data Fetching and Transformation ---
  const fetchData = async () => {
    if (!isConnected || !address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [accountResponse, statsResponse, balancesResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/account/${address}`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/contract-stats`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/balances/${address}`),
      ]);


      const accountData: BackendAccountInfo = await accountResponse.json();
      const statsData: BackendContractStats = await statsResponse.json();
      const balancesData: BackendWalletBalances = await balancesResponse.json();

      // Transform and set state
      setAccountInfo({
        isRegistered: accountData.is_registered,
        registrationTime: accountData.registration_time,
        lastRedeemedSequence: accountData.last_redeemed_sequence,
      });

      setStats({
        totalAccounts: statsData.total_accounts,
        totalNativeBalance: statsData.total_native_balance,
        totalTokenBalances: statsData.total_token_balances,
      });

      const newBalances: MeshPayBalance = {
        XTZ: { wallet: '0', meshpay: '0', total: '0' },
        WTZ: { wallet: '0', meshpay: '0', total: '0' },
        USDT: { wallet: '0', meshpay: '0', total: '0' },
        USDC: { wallet: '0', meshpay: '0', total: '0' },
      };
      balancesData.balances.forEach(token => {
        const symbol = token.token_symbol as TokenSymbol;
        if (newBalances[symbol]) {
          newBalances[symbol] = {
            wallet: token.wallet_balance,
            meshpay: token.meshpay_balance,
            total: token.total_balance,
          };
        }
      });
      setBalances(newBalances);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  const depositToMeshPay = async (token: TokenSymbol, amount: string): Promise<{ success: boolean; txHash?: string }> => {
    if (!address) throw new Error('No wallet connected');

    // Ensure MeshPay contract address is configured
    if (SMARTPAY_CONTRACT.address === '0x0000000000000000000000000000000000000000') {
      throw new Error('MeshPay contract address is not configured. Please set VITE_SMARTPAY_CONTRACT_ADDRESS in your environment.');
    }

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
        writeFunding({
          address: SMARTPAY_CONTRACT.address,
          abi: SMARTPAY_CONTRACT.abi,
          functionName: 'handleNativeFundingTransaction',
          value: amountWei,
        });
      } else {
        writeApproval({
          address: tokenConfig.address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [SMARTPAY_CONTRACT.address, amountWei],
        });
      }

      return { success: true };
    } catch (err) {
      setDepositStatus(prev => ({ ...prev, isPending: false, error: err instanceof Error ? err.message : 'Deposit failed' }));
      return { success: false };
    }
  };
  
  const clearErrors = (): void => {
    setDepositStatus(prev => ({ ...prev, error: null }));
    setError(null);
  };

  // Effects for handling transaction states
  useEffect(() => {
    if (isApprovalSuccess && depositStatus.currentStep === 'approving') {
      // Logic for multi-step ERC20 deposit
    }
  }, [isApprovalSuccess]);
  
  useEffect(() => {
    if (isFundingSuccess) {
      fetchData(); // Refresh all data after a successful transaction
    }
  }, [isFundingSuccess]);

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
    balances,
    stats,
    loading,
    error,
    fetchData,
    depositStatus,
    depositToMeshPay,
    clearErrors,
  };

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}; 