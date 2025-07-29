import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useAccount,
  useChainId,
  useBalance,
} from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { 
  MESHPAY_CONTRACT,
  SUPPORTED_TOKENS, 
  ERC20_CONTRACT, 
  NATIVE_TOKEN, 
  getContractAddresses,
  type SupportedToken 
} from '../config/contracts';
import { useState, useEffect } from 'react';


// Types for MeshPay operations
export interface TokenBalance {
  wallet: string; // Regular wallet balance
  meshpay: string; // MeshPay system balance
  total: string; // Combined balance
}

export interface MeshPayBalance {
  XTZ: TokenBalance;
  WTZ: TokenBalance;
  USDT: TokenBalance;
  USDC: TokenBalance;
}

export interface DepositResult {
  success: boolean;
  error?: string;
}

// Extended type for all supported tokens including XTZ
export type TokenSymbol = SupportedToken;

// Gas override functions for different transaction types
const overrideGas = {
  // Base gas for simple operations
  base: () => BigInt(1_000_000),
  
  // Gas for token approval (ERC20) - more conservative
  approve: (amount: string) => BigInt(1_000_000),
  
  // Gas for token deposits (ERC20)
  deposit: (amount: string) => BigInt(1_500_000),
  
  // Gas for native XTZ deposits
  depositNative: (amount: string) => BigInt(1_500_000),
  
};

/**
 * Hook to get MeshPay balance for a specific token (including native XTZ)
 */
export function useMeshPayBalance(tokenSymbol: TokenSymbol) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();
  const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
  const tokenAddress = tokenConfig.isNative ? NATIVE_TOKEN : tokenConfig.address;

  return useReadContract({
    address: contractAddresses?.meshpay || MESHPAY_CONTRACT.address,
    abi: MESHPAY_CONTRACT.abi,
    functionName: 'getAccountBalance',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });
}

/**
 * Hook to get regular wallet balance for a token (ERC20 or native)
 */
export function useTokenBalance(tokenSymbol: TokenSymbol) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();
  const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];

  // For native XTZ, use native balance hook
  if (tokenConfig.isNative) {
    return useBalance({
      address,
      query: {
        enabled: !!address,
      },
    });
  }

  // For ERC20 tokens, use token balance hook
  return useBalance({
    address,
    token: tokenConfig.address,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to get token allowance (how much the MeshPay contract can spend)
 * Only applicable to ERC20 tokens, not native XTZ
 */
export function useTokenAllowance(tokenSymbol: Exclude<TokenSymbol, 'XTZ'>) {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();
  const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];

  return useReadContract({
    address: tokenConfig.address,
    abi: ERC20_CONTRACT.abi,
    functionName: 'allowance',
    args: address && contractAddresses?.meshpay ? [address, contractAddresses.meshpay] : undefined,
    query: {
      enabled: !!address && !tokenConfig.isNative && !!contractAddresses?.meshpay,
    },
  });
}

/**
 * Hook to check if account is registered with MeshPay
 */
export function useIsAccountRegistered() {
  const { address } = useAccount();
  const contractAddresses = getContractAddresses();

  return useReadContract({
    address: contractAddresses?.meshpay || MESHPAY_CONTRACT.address,
    abi: MESHPAY_CONTRACT.abi,
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
  const contractAddresses = getContractAddresses();

  return useReadContract({
    address: contractAddresses?.meshpay || MESHPAY_CONTRACT.address,
    abi: MESHPAY_CONTRACT.abi,
    functionName: 'getAccountInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Hook to approve token spending by MeshPay contract (ERC20 only)
 */
export function useApproveToken() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();
  const { address } = useAccount();
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const approveToken = async (tokenSymbol: Exclude<TokenSymbol, 'XTZ'>, amount: string) => {
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
    
    if (tokenConfig.isNative) {
      throw new Error('Native tokens do not require approval');
    }

    if (!contractAddresses?.meshpay) {
      throw new Error('Contract addresses not configured');
    }

    try {
      const parsedAmount = parseUnits(amount, tokenConfig.decimals);
      
      await writeContract({
        address: tokenConfig.address,
        abi: ERC20_CONTRACT.abi,
        functionName: 'approve',
        args: [contractAddresses.meshpay, parsedAmount],
        gas: overrideGas.approve(amount),
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
 * Hook to deposit tokens to MeshPay system (ERC20 tokens)
 */
export function useDepositToMeshPay() {
  const contractAddresses = getContractAddresses();
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (tokenSymbol: Exclude<TokenSymbol, 'XTZ'>, amount: bigint) => {
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
    
    if (tokenConfig.isNative) {
      throw new Error('Use depositNativeToMeshPay for XTZ deposits');
    }

    if (!contractAddresses?.meshpay) {
      throw new Error('Contract addresses not configured');
    }
    console.log({
      address: contractAddresses.meshpay,
      abi: MESHPAY_CONTRACT.abi,
      functionName: 'handleFundingTransaction',
      args: [tokenConfig.address, amount],
      gas: overrideGas.deposit(amount.toString()),
    })
    try {
      await writeContract({
        address: contractAddresses.meshpay,
        abi: MESHPAY_CONTRACT.abi,
        functionName: 'handleFundingTransaction',
        args: [tokenConfig.address, amount],
        gas: overrideGas.deposit(amount.toString()),
      });
    } catch (err) {
      console.error('Failed to deposit to MeshPay:', err);
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
 * Hook to deposit native XTZ to MeshPay system
 */
export function useDepositNativeToMeshPay() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();
  
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const depositNative = async (amount: string) => {
    if (!contractAddresses?.meshpay) {
      throw new Error('Contract addresses not configured');
    }

    try {
      const parsedAmount = parseUnits(amount, SUPPORTED_TOKENS.XTZ.decimals);
      
      await writeContract({
        address: contractAddresses.meshpay,
        abi: MESHPAY_CONTRACT.abi,
        functionName: 'handleNativeFundingTransaction',
        value: parsedAmount,
        gas: overrideGas.depositNative(amount),
      });
    } catch (err) {
      console.error('Failed to deposit native XTZ to MeshPay:', err);
      throw err;
    }
  };

  return {
    depositNative,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}


/**
 * Hook to handle complete deposit workflow with approval check
 */
export function useDepositFlow() {
  const { 
    approveToken, 
    isPending: isApprovePending, 
    isConfirmed: isApproveSuccess,
    error: approveError 
  } = useApproveToken();
  
  const { 
    deposit, 
    isPending: isDepositPending, 
    isConfirmed: isDepositSuccess,
    error: depositError 
  } = useDepositToMeshPay();
  
  const { 
    depositNative, 
    isPending: isNativeDepositPending, 
    isConfirmed: isNativeDepositSuccess,
    error: nativeDepositError 
  } = useDepositNativeToMeshPay();

  // Auto-deposit after approval success
  const [pendingDeposit, setPendingDeposit] = useState<{token: TokenSymbol, amount: bigint} | null>(null);
  const [currentToken, setCurrentToken] = useState<TokenSymbol>('XTZ');

  useEffect(() => {
    if (isApproveSuccess && pendingDeposit) {
      try {
        deposit(pendingDeposit.token as Exclude<TokenSymbol, 'XTZ'>, pendingDeposit.amount);
        setPendingDeposit(null);
      } catch (error) {
        console.error("Error initiating deposit after approval:", error);
        setPendingDeposit(null);
      }
    }
  }, [isApproveSuccess, pendingDeposit]);

  // Get allowance for current non-native token
  const allowanceQuery = useTokenAllowance(
    currentToken !== 'XTZ' ? (currentToken as Exclude<TokenSymbol, 'XTZ'>) : 'WTZ' 
  );

  const initiateDeposit = async (tokenSymbol: TokenSymbol, amount: string) => {
    setCurrentToken(tokenSymbol);
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
    
    if (tokenConfig.isNative) {
      await depositNative(amount);
      return;
    }

    // Check allowance for ERC20
    const parsedAmount = parseUnits(amount, tokenConfig.decimals);
    const currentAllowance = (tokenSymbol === currentToken ? allowanceQuery.data : BigInt(0)) || BigInt(0);

    if (currentAllowance < parsedAmount) {
      // Set pending deposit for after approval
      setPendingDeposit({ token: tokenSymbol, amount: parsedAmount });
      await approveToken(tokenSymbol as Exclude<TokenSymbol, 'XTZ'>, amount);
    } else {
      // Direct deposit
      await deposit(tokenSymbol as Exclude<TokenSymbol, 'XTZ'>, parsedAmount);
    }
  };
    
    return { 
    initiateDeposit,
    isLoading: isApprovePending || isDepositPending || isNativeDepositPending,
    isApprovePending,
    isDepositPending: isDepositPending || isNativeDepositPending,
    isSuccess: isDepositSuccess || isNativeDepositSuccess,
    isApproveSuccess,
    error: approveError || depositError || nativeDepositError,
  };
} 