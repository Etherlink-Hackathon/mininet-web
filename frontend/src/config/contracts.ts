import { type Address } from 'viem';

// FastPay MVP Smart Contract Configuration
export const FASTPAY_CONTRACT = {
  address: (import.meta.env.VITE_FASTPAY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: [
    // Account Management
    {
      inputs: [],
      name: 'registerAccount',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
      name: 'isAccountRegistered',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        { internalType: 'address', name: 'account', type: 'address' },
        { internalType: 'address', name: 'token', type: 'address' },
      ],
      name: 'getAccountBalance',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
      name: 'getAccountInfo',
      outputs: [
        { internalType: 'bool', name: 'registered', type: 'bool' },
        { internalType: 'uint256', name: 'registrationTime', type: 'uint256' },
        { internalType: 'uint256', name: 'lastRedeemedSequence', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    // Funding Operations
    {
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
      ],
      name: 'handleFundingTransaction',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    // Transfer Certificates
    {
      inputs: [
        { internalType: 'address', name: 'recipient', type: 'address' },
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
        { internalType: 'uint256', name: 'sequenceNumber', type: 'uint256' },
      ],
      name: 'createTransferCertificate',
      outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    // Events
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'account', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      ],
      name: 'AccountRegistered',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'transactionIndex', type: 'uint256' },
      ],
      name: 'FundingCompleted',
      type: 'event',
    },
  ]
};

// FastPay Authority Manager Contract Configuration
export const FASTPAY_AUTHORITY_CONTRACT = {
  address: (import.meta.env.VITE_FASTPAY_AUTHORITY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: [
    // Authority Management
    {
      inputs: [
        { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
        { internalType: 'string', name: 'networkInfo', type: 'string' },
      ],
      name: 'stakeToBecomaAuthority',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'unstakeAuthority',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'authority', type: 'address' }],
      name: 'isAuthority',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'authority', type: 'address' }],
      name: 'getAuthorityInfo',
      outputs: [
        {
          components: [
            { internalType: 'bool', name: 'isActive', type: 'bool' },
            { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
            { internalType: 'uint256', name: 'stakingTime', type: 'uint256' },
            { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
            { internalType: 'uint256', name: 'rewardsClaimed', type: 'uint256' },
            { internalType: 'uint256', name: 'transactionsProcessed', type: 'uint256' },
            { internalType: 'uint256', name: 'validatorScore', type: 'uint256' },
            { internalType: 'uint256', name: 'uptime', type: 'uint256' },
            { internalType: 'string', name: 'networkInfo', type: 'string' },
            { internalType: 'uint256', name: 'lastRewardClaim', type: 'uint256' },
            { internalType: 'uint256', name: 'lastActiveTime', type: 'uint256' },
            { internalType: 'bool', name: 'isSlashed', type: 'bool' },
          ],
          internalType: 'struct FastPayAuthorityManager.AuthorityInfo',
          name: '',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'authority', type: 'address' }],
      name: 'getAuthorityMetrics',
      outputs: [
        {
          components: [
            { internalType: 'uint256', name: 'dailyRewards', type: 'uint256' },
            { internalType: 'uint256', name: 'weeklyRewards', type: 'uint256' },
            { internalType: 'uint256', name: 'monthlyRewards', type: 'uint256' },
            { internalType: 'uint256', name: 'totalEarnings', type: 'uint256' },
            { internalType: 'uint256', name: 'authorityRank', type: 'uint256' },
            { internalType: 'uint256', name: 'connectedPeers', type: 'uint256' },
          ],
          internalType: 'struct FastPayAuthorityManager.AuthorityMetrics',
          name: '',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getActiveAuthorities',
      outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'claimRewards',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'authority', type: 'address' }],
      name: 'calculateRewards',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getActiveAuthorityCount',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    // Constants
    {
      inputs: [],
      name: 'MINIMUM_STAKE',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'MAXIMUM_STAKE',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'MINIMUM_LOCK_DURATION',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'MAXIMUM_LOCK_DURATION',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    // Events
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'authority', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'duration', type: 'uint256' },
      ],
      name: 'AuthorityStaked',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'authority', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'rewards', type: 'uint256' },
      ],
      name: 'AuthorityUnstaked',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'authority', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      ],
      name: 'RewardsClaimed',
      type: 'event',
    },
  ]
};

// Token contracts (USDT, USDC)
export const TOKEN_CONTRACTS = {
  USDT: {
    address: (import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  USDC: {
    address: (import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
};

// Contract addresses by chain ID
export const CONTRACT_ADDRESSES = {
  // Etherlink Mainnet (Chain ID: 42793)
  42793: {
    fastPay: import.meta.env.VITE_FASTPAY_CONTRACT_ADDRESS as Address,
    authority: import.meta.env.VITE_FASTPAY_AUTHORITY_CONTRACT_ADDRESS as Address,
    usdt: import.meta.env.VITE_USDT_CONTRACT_ADDRESS as Address,
    usdc: import.meta.env.VITE_USDC_CONTRACT_ADDRESS as Address,
  },
  // Etherlink Testnet (Chain ID: 128123)
  128123: {
    fastPay: import.meta.env.VITE_FASTPAY_CONTRACT_ADDRESS_TESTNET as Address,
    authority: import.meta.env.VITE_FASTPAY_AUTHORITY_CONTRACT_ADDRESS_TESTNET as Address,
    usdt: import.meta.env.VITE_USDT_CONTRACT_ADDRESS_TESTNET as Address,
    usdc: import.meta.env.VITE_USDC_CONTRACT_ADDRESS_TESTNET as Address,
  },
};

// Helper function to get contract addresses for current chain
export function getContractAddresses(chainId: number) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
} 