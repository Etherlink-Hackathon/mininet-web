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

export interface AccountInfo {
  registered: boolean;
  registrationTime: number;
  lastRedeemedSequence: number;
}

export interface DepositResult {
  success: boolean;
  error?: string;
}

// Extended type for all supported tokens including XTZ
export type TokenSymbol = SupportedToken;

// Helper function to format balance with proper decimals
function formatBalance(value: bigint, decimals: number): string {
  return formatUnits(value, decimals);
}

/**
 * Hook to check if account is registered with MeshPay
 */
export function useIsAccountRegistered() {
  const { address } = useAccount();
  // const chainId = useChainId();

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
  const chainId = useChainId();
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
 * Hook to register account with MeshPay
 */
export function useRegisterAccount() {
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAccount = async () => {
    await writeContract({
      address: contractAddresses?.meshpay || MESHPAY_CONTRACT.address,
      abi: MESHPAY_CONTRACT.abi,
      functionName: 'registerAccount',
    });
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
      console.log(parsedAmount, "parsedAmount")
      await writeContract({
        address: tokenConfig.address,
        abi: ERC20_CONTRACT.abi,
        functionName: 'approve',
        args: [contractAddresses.meshpay, parsedAmount],
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
  const chainId = useChainId();
  const contractAddresses = getContractAddresses();

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const deposit = async (tokenSymbol: Exclude<TokenSymbol, 'XTZ'>, amount: string) => {
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];

    if (tokenConfig.isNative) {
      throw new Error('Use depositNativeToMeshPay for XTZ deposits');
    }

    if (!contractAddresses?.meshpay) {
      throw new Error('Contract addresses not configured');
    }

    try {
      const parsedAmount = parseUnits(amount, tokenConfig.decimals);
      console.log(parsedAmount, "parsedAmount")
      await writeContract({
        address: contractAddresses.meshpay,
        abi: MESHPAY_CONTRACT.abi,
        functionName: 'handleFundingTransaction',
        args: [tokenConfig.address, parsedAmount],
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
 * Utility function to get combined balance data
 */
export function useCombinedBalances(): {
  balances: MeshPayBalance | null;
  isLoading: boolean;
  error: string | null;
} {
  // Regular wallet balances
  const { data: xtzWallet, isLoading: xtzWalletLoading } = useTokenBalance('XTZ');
  const { data: wtzWallet, isLoading: wtzWalletLoading } = useTokenBalance('WTZ');
  const { data: usdtWallet, isLoading: usdtWalletLoading } = useTokenBalance('USDT');
  const { data: usdcWallet, isLoading: usdcWalletLoading } = useTokenBalance('USDC');

  // MeshPay balances
  const { data: xtzMeshPay, isLoading: xtzMeshPayLoading } = useMeshPayBalance('XTZ');
  const { data: wtzMeshPay, isLoading: wtzMeshPayLoading } = useMeshPayBalance('WTZ');
  const { data: usdtMeshPay, isLoading: usdtMeshPayLoading } = useMeshPayBalance('USDT');
  const { data: usdcMeshPay, isLoading: usdcMeshPayLoading } = useMeshPayBalance('USDC');

  const isLoading = xtzWalletLoading || usdtWalletLoading || usdcWalletLoading ||
                   xtzMeshPayLoading || usdtMeshPayLoading || usdcMeshPayLoading;

  if (isLoading) {
    return { balances: null, isLoading: true, error: null };
  }

  try {
    const balances: MeshPayBalance = {
      XTZ: {
        wallet: xtzWallet ? formatBalance(xtzWallet.value, SUPPORTED_TOKENS.XTZ.decimals) : '0',
        meshpay: xtzMeshPay ? formatBalance(xtzMeshPay as bigint, SUPPORTED_TOKENS.XTZ.decimals) : '0',
        total: '0', // Will be calculated below
      },
      WTZ: {
        wallet: wtzWallet ? formatBalance(wtzWallet.value, SUPPORTED_TOKENS.WTZ.decimals) : '0',
        meshpay: wtzMeshPay ? formatBalance(wtzMeshPay as bigint, SUPPORTED_TOKENS.WTZ.decimals) : '0',
        total: '0', // Will be calculated below
      },
      USDT: {
        wallet: usdtWallet ? formatBalance(usdtWallet.value, SUPPORTED_TOKENS.USDT.decimals) : '0',
        meshpay: usdtMeshPay ? formatBalance(usdtMeshPay as bigint, SUPPORTED_TOKENS.USDT.decimals) : '0',
        total: '0', // Will be calculated below
      },
      USDC: {
        wallet: usdcWallet ? formatBalance(usdcWallet.value, SUPPORTED_TOKENS.USDC.decimals) : '0',
        meshpay: usdcMeshPay ? formatBalance(usdcMeshPay as bigint, SUPPORTED_TOKENS.USDC.decimals) : '0',
        total: '0', // Will be calculated below
      },
    };

    // Calculate totals
    balances.XTZ.total = (parseFloat(balances.XTZ.wallet) + parseFloat(balances.XTZ.meshpay)).toFixed(6);
    balances.WTZ.total = (parseFloat(balances.WTZ.wallet) + parseFloat(balances.WTZ.meshpay)).toFixed(6);
    balances.USDT.total = (parseFloat(balances.USDT.wallet) + parseFloat(balances.USDT.meshpay)).toFixed(6);
    balances.USDC.total = (parseFloat(balances.USDC.wallet) + parseFloat(balances.USDC.meshpay)).toFixed(6);

    return { balances, isLoading: false, error: null };
  } catch (err) {
    return { balances: null, isLoading: false, error: `Failed to load balances: ${err}` };
  }
}

/**
 * Complete deposit workflow (approve + deposit for ERC20, direct deposit for XTZ)
 */
export async function performDeposit(
  tokenSymbol: TokenSymbol,
  amount: string,
  approveToken?: (token: Exclude<TokenSymbol, 'XTZ'>, amount: string) => Promise<void>,
  deposit?: (token: Exclude<TokenSymbol, 'XTZ'>, amount: string) => Promise<void>,
  depositNative?: (amount: string) => Promise<void>
): Promise<DepositResult> {
  try {
    const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];

    if (tokenConfig.isNative) {
      // Native XTZ deposit
      if (!depositNative) {
        throw new Error('Native deposit function not provided');
      }
      await depositNative(amount);
    } else {
      // ERC20 token deposit
      if (!approveToken || !deposit) {
        throw new Error('ERC20 deposit functions not provided');
      }
      
      // Step 1: Approve token spending
      await approveToken(tokenSymbol as Exclude<TokenSymbol, 'XTZ'>, amount);

      // Step 2: Deposit to MeshPay
      await deposit(tokenSymbol as Exclude<TokenSymbol, 'XTZ'>, amount);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 