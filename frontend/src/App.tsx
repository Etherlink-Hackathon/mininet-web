import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { createConfig } from 'wagmi';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import NetworkMap from './pages/NetworkMap';
import Wallet from './pages/Wallet';
import Transactions from './pages/Transactions';
import { WebSocketProvider } from './context/WebSocketContext';
import { WalletProvider } from './context/WalletContext';
import { PRIVY_APP_ID, privyConfig } from './config/privy';
import { etherlink, etherlinkTestnet } from './config/chains';

// Etherlink-inspired theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00D2FF', // Etherlink blue
      light: '#33DAFF',
      dark: '#0093B3',
    },
    secondary: {
      main: '#6C5CE7', // Purple accent
      light: '#A29BFE',
      dark: '#5F3DC4',
    },
    background: {
      default: '#0F1419', // Dark background
      paper: '#1A1F2E',
    },
    success: {
      main: '#00B894', // Green for online status
    },
    error: {
      main: '#E84393', // Pink for errors
    },
    warning: {
      main: '#FDCB6E', // Yellow for warnings
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1A1F2E 0%, #16213E 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
          },
        },
      },
    },
  },
});

// Create Wagmi config
const wagmiConfig = createConfig({
  chains: [etherlink, etherlinkTestnet],
  transports: {
    [etherlink.id]: http(),
    [etherlinkTestnet.id]: http(),
  },
});

// Create Query Client for React Query
const queryClient = new QueryClient();

function App(): JSX.Element {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <WalletProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <WebSocketProvider>
                <Router>
                <Box sx={{ 
                  minHeight: '100vh',
                  background: 'linear-gradient(180deg, #0F1419 0%, #1A1F2E 100%)',
                }}>
                  <Navbar />
                  <Box component="main" sx={{ pt: 8 }}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/map" element={<NetworkMap />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/transactions" element={<Transactions />} />
                    </Routes>
                  </Box>
                </Box>
                </Router>
              </WebSocketProvider>
            </ThemeProvider>
          </WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App; 