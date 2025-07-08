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
    // Transfer Certificate Creation
    {
      inputs: [
        { internalType: 'address', name: 'recipient', type: 'address' },
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
        { internalType: 'uint256', name: 'sequenceNumber', type: 'uint256' },
      ],
      name: 'createTransferCertificate',
      outputs: [{ internalType: 'bytes32', name: 'certificateHash', type: 'bytes32' }],
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
  ] as const,
} as const;

// Standard ERC20 ABI for token operations
export const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token configurations for Etherlink
export const SUPPORTED_TOKENS = {
  USDT: {
    address: (import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    abi: ERC20_ABI,
  },
  USDC: {
    address: (import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    abi: ERC20_ABI,
  },
} as const;

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Etherlink Mainnet
  42793: {
    fastPay: import.meta.env.VITE_FASTPAY_CONTRACT_ADDRESS as Address,
    usdt: import.meta.env.VITE_USDT_CONTRACT_ADDRESS as Address,
    usdc: import.meta.env.VITE_USDC_CONTRACT_ADDRESS as Address,
  },
  // Etherlink Testnet
  128123: {
    fastPay: import.meta.env.VITE_FASTPAY_CONTRACT_ADDRESS_TESTNET as Address,
    usdt: import.meta.env.VITE_USDT_CONTRACT_ADDRESS_TESTNET as Address,
    usdc: import.meta.env.VITE_USDC_CONTRACT_ADDRESS_TESTNET as Address,
  },
} as const;

// Helper function to get contract addresses for current chain
export const getContractAddresses = (chainId: number) => {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[128123]; // fallback to testnet
}; 