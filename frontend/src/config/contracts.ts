import { type Address } from 'viem';
import { MeshPayMVP } from '../abis/MeshPayMVP';
import { MeshPayAuthorities } from '../abis/MeshPayAuthorities';
// Native token address (used for XTZ)
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as Address;

// MeshPay MVP Contract Configuration
export const SMARTPAY_CONTRACT = {
  address: (import.meta.env.VITE_SMARTPAY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: MeshPayMVP.abi,
} as const;

// MeshPay Authority Manager Contract Configuration
export const FASTPAY_AUTHORITY_CONTRACT = {
  address: (import.meta.env.VITE_SMARTPAY_AUTHORITY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: MeshPayAuthorities.abi,
} as const;

// ERC20 Token ABI
export const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
] as const;

// Supported tokens configuration for MeshPay
export const SUPPORTED_TOKENS = {
  XTZ: {
    address: NATIVE_TOKEN,
    decimals: 18,
    symbol: 'XTZ',
    name: 'Tezos',
    isNative: true,
    icon: '/xtz.svg',
  },
  WTZ: {
    address: (import.meta.env.VITE_WTZ_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    decimals: 18,
    symbol: 'WTZ',
    name: 'Wrapped Tezos',
    isNative: false,
    icon: '/xtz.svg',
  },
  USDT: {
    address: (import.meta.env.VITE_USDT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    isNative: false,
    icon: '/usdt.svg',
  },
  USDC: {
    address: (import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    isNative: false,
    icon: '/usdc.svg',
  },
} as const;

// Type for supported token symbols
export type SupportedToken = keyof typeof SUPPORTED_TOKENS;
export type TokenSymbol = SupportedToken; // Alias for backwards compatibility

// Network Configuration
export const ETHERLINK_CHAIN_CONFIG = {
  id: parseInt(import.meta.env.VITE_CHAIN_ID || '128123'),
  name: import.meta.env.VITE_CHAIN_NAME || 'Etherlink Testnet',
  network: 'etherlink-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Tezos',
    symbol: 'XTZ',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'https://node.ghostnet.etherlink.com'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Etherlink Explorer', 
      url: 'https://testnet.explorer.etherlink.com' 
    },
  },
  testnet: true,
} as const;

// Contract addresses by chain ID
export const CONTRACT_ADDRESSES = {
  [ETHERLINK_CHAIN_CONFIG.id]: {
    meshpay: SMARTPAY_CONTRACT.address,
    authority: FASTPAY_AUTHORITY_CONTRACT.address,
    tokens: {
      USDT: SUPPORTED_TOKENS.USDT.address,
      USDC: SUPPORTED_TOKENS.USDC.address,
      WTZ: SUPPORTED_TOKENS.WTZ.address,
    },
  },
} as const;

// Helper function to get contract addresses for current chain
export function getContractAddresses(chainId: number) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
} 