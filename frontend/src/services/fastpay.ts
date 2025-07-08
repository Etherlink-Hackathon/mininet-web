import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount,
  useChainId,
  useBalance
} from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { FASTPAY_CONTRACT, SUPPORTED_TOKENS, ERC20_ABI, getContractAddresses } from '../config/contracts';

// Types for FastPay operations
export interface FastPayBalance {
  USDT: {
    wallet: string; // Regular wallet balance
    fastpay: string; // FastPay system balance
    total: string; // Combined balance
  };
  USDC: {
    wallet: string;
    fastpay: string;
    total: string;
  };
}

export interface AccountInfo {
  registered: boolean;
  registrationTime: number;
  lastRedeemedSequence: number;
}

export interface DepositResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Custom hooks for FastPay contract interactions

/**
 * Hook to check if the current account is registered with FastPay
 */
export function useIsAccountRegistered() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);

  return useReadContract({
    address: contractAddresses?.fastPay || FASTPAY_CONTRACT.address,
    abi: FASTPAY_CONTRACT.abi,
    functionName: 'isAccountRegistered',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to get account information
 */
export function useAccountInfo() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);

  return useReadContract({
    address: contractAddresses?.fastPay || FASTPAY_CONTRACT.address,
    abi: FASTPAY_CONTRACT.abi,
    functionName: 'getAccountInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to get FastPay balance for a specific token
 */
export function useFastPayBalance(tokenSymbol: 'USDT' | 'USDC') {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = tokenSymbol === 'USDT' ? contractAddresses?.usdt : contractAddresses?.usdc;

  return useReadContract({
    address: contractAddresses?.fastPay || FASTPAY_CONTRACT.address,
    abi: FASTPAY_CONTRACT.abi,
    functionName: 'getAccountBalance',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });
}

/**
 * Hook to get regular wallet balance for a token
 */
export function useTokenBalance(tokenSymbol: 'USDT' | 'USDC') {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = tokenSymbol === 'USDT' ? contractAddresses?.usdt : contractAddresses?.usdc;

  return useBalance({
    address,
    token: tokenAddress,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });
}

/**
 * Hook to get token allowance (how much the FastPay contract can spend)
 */
export function useTokenAllowance(tokenSymbol: 'USDT' | 'USDC') {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  const tokenAddress = tokenSymbol === 'USDT' ? contractAddresses?.usdt : contractAddresses?.usdc;

  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && contractAddresses?.fastPay ? [address, contractAddresses.fastPay] : undefined,
    query: {
      enabled: !!address && !!tokenAddress && !!contractAddresses?.fastPay,
    },
  });
}

/**
 * Hook to register account with FastPay
 */
export function useRegisterAccount() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAccount = async () => {
    try {
      await writeContract({
        address: contractAddresses?.fastPay || FASTPAY_CONTRACT.address,
        abi: FASTPAY_CONTRACT.abi,
        functionName: 'registerAccount',
      });
    } catch (err) {
      console.error('Failed to register account:', err);
      throw err;
    }
  };

  return {
    registerAccount,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook to approve token spending by FastPay contract
 */
export function useApproveToken() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const approveToken = async (tokenSymbol: 'USDT' | 'USDC', amount: string) => {
    const tokenAddress = tokenSymbol === 'USDT' ? contractAddresses?.usdt : contractAddresses?.usdc;
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
    
    if (!tokenAddress || !contractAddresses?.fastPay) {
      throw new Error('Contract addresses not configured');
    }

    try {
      const parsedAmount = parseUnits(amount, tokenConfig.decimals);
      
      await writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddresses.fastPay, parsedAmount],
      });
    } catch (err) {
      console.error('Failed to approve token:', err);
      throw err;
    }
  };

  return {
    approveToken,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook to deposit tokens to FastPay system
 */
export function useDepositToFastPay() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (tokenSymbol: 'USDT' | 'USDC', amount: string) => {
    const tokenAddress = tokenSymbol === 'USDT' ? contractAddresses?.usdt : contractAddresses?.usdc;
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
    
    if (!tokenAddress || !contractAddresses?.fastPay) {
      throw new Error('Contract addresses not configured');
    }

    try {
      const parsedAmount = parseUnits(amount, tokenConfig.decimals);
      
      await writeContract({
        address: contractAddresses.fastPay,
        abi: FASTPAY_CONTRACT.abi,
        functionName: 'handleFundingTransaction',
        args: [tokenAddress, parsedAmount],
      });
    } catch (err) {
      console.error('Failed to deposit to FastPay:', err);
      throw err;
    }
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Utility function to format balance with proper decimals
 */
export function formatBalance(balance: bigint, decimals: number): string {
  return formatUnits(balance, decimals);
}

/**
 * Utility function to get combined balance data
 */
export function useCombinedBalances(): {
  balances: FastPayBalance | null;
  isLoading: boolean;
  error: string | null;
} {
  // Regular wallet balances
  const { data: usdtWallet, isLoading: usdtWalletLoading } = useTokenBalance('USDT');
  const { data: usdcWallet, isLoading: usdcWalletLoading } = useTokenBalance('USDC');
  
  // FastPay balances
  const { data: usdtFastPay, isLoading: usdtFastPayLoading } = useFastPayBalance('USDT');
  const { data: usdcFastPay, isLoading: usdcFastPayLoading } = useFastPayBalance('USDC');

  const isLoading = usdtWalletLoading || usdcWalletLoading || usdtFastPayLoading || usdcFastPayLoading;

  if (isLoading) {
    return { balances: null, isLoading: true, error: null };
  }

  try {
    const balances: FastPayBalance = {
      USDT: {
        wallet: usdtWallet ? formatBalance(usdtWallet.value, SUPPORTED_TOKENS.USDT.decimals) : '0',
        fastpay: usdtFastPay ? formatBalance(usdtFastPay as bigint, SUPPORTED_TOKENS.USDT.decimals) : '0',
        total: '0', // Will be calculated below
      },
      USDC: {
        wallet: usdcWallet ? formatBalance(usdcWallet.value, SUPPORTED_TOKENS.USDC.decimals) : '0',
        fastpay: usdcFastPay ? formatBalance(usdcFastPay as bigint, SUPPORTED_TOKENS.USDC.decimals) : '0',
        total: '0', // Will be calculated below
      },
    };

    // Calculate totals
    balances.USDT.total = (parseFloat(balances.USDT.wallet) + parseFloat(balances.USDT.fastpay)).toFixed(6);
    balances.USDC.total = (parseFloat(balances.USDC.wallet) + parseFloat(balances.USDC.fastpay)).toFixed(6);

    return { balances, isLoading: false, error: null };
  } catch (err) {
    return { balances: null, isLoading: false, error: `Failed to load balances: ${err}` };
  }
}

/**
 * Complete deposit workflow (approve + deposit)
 */
export async function performDeposit(
  tokenSymbol: 'USDT' | 'USDC',
  amount: string,
  approveToken: (token: 'USDT' | 'USDC', amount: string) => Promise<void>,
  deposit: (token: 'USDT' | 'USDC', amount: string) => Promise<void>
): Promise<DepositResult> {
  try {
    // Step 1: Approve token spending
    await approveToken(tokenSymbol, amount);
    
    // Step 2: Deposit to FastPay
    await deposit(tokenSymbol, amount);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 