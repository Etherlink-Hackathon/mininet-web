import { PrivyClientConfig } from '@privy-io/react-auth';
import { etherlink, etherlinkTestnet } from './chains';

export const privyConfig: PrivyClientConfig = {
  // You'll need to replace this with your actual Privy App ID
  // Sign up at https://console.privy.io/ to get your App ID
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
  },
  loginMethods: ['wallet', 'email', 'sms'],
  appearance: {
    theme: 'dark',
    accentColor: '#00D2FF',
    logo: '/logo.png',
    showWalletLoginFirst: true,
  },
  defaultChain: etherlink,
  supportedChains: [etherlink, etherlinkTestnet],
  // Optional: Configure funding methods if needed
  // fiatOnRamp: {
  //   useSandbox: false, // Set to true for testing
  // },
};

// Environment variables for configuration - Updated for Vite
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'your-privy-app-id-here';

// You can set this in your .env file:
// VITE_PRIVY_APP_ID=your-actual-app-id 