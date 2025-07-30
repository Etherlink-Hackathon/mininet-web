import { type Address } from 'viem';
import { MeshPayMVP } from '../abis/MeshPayMVP';
import { MeshPayAuthorities } from '../abis/MeshPayAuthorities';
import { ERC20 } from '../abis/ERC20';
// Native token address (used for XTZ)
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as Address;

// MeshPay MVP Contract Configuration
export const MESHPAY_CONTRACT = {
  address: (import.meta.env.VITE_MESHPAY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: MeshPayMVP.abi,
} as const;

// MeshPay Authority Manager Contract Configuration
export const FASTPAY_AUTHORITY_CONTRACT = {
  address: (import.meta.env.VITE_SMARTPAY_AUTHORITY_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: MeshPayAuthorities.abi,
} as const;

// ERC20 Token ABI
export const ERC20_CONTRACT = {
  address: (import.meta.env.VITE_ERC20_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  abi: ERC20.abi,
} as const;

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
    address: import.meta.env.VITE_WTZ_CONTRACT_ADDRESS as Address,
    decimals: 18,
    symbol: 'WTZ',
    name: 'Wrapped Tezos',
    isNative: false,
    icon: '/wtz.webp',
  },
  USDT: {
    address: import.meta.env.VITE_USDT_CONTRACT_ADDRESS as Address,
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    isNative: false,
    icon: '/usdt.svg',
  },
  USDC: {
    address: import.meta.env.VITE_USDC_CONTRACT_ADDRESS as Address,
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
    meshpay: MESHPAY_CONTRACT.address,
    erc20: ERC20_CONTRACT.address,
    authority: FASTPAY_AUTHORITY_CONTRACT.address,
    tokens: {
      USDT: SUPPORTED_TOKENS.USDT.address,
      USDC: SUPPORTED_TOKENS.USDC.address,
      WTZ: SUPPORTED_TOKENS.WTZ.address,
    },
}as const;

// Helper function to get contract addresses for current chain
export function getContractAddresses() {
  return CONTRACT_ADDRESSES
} 