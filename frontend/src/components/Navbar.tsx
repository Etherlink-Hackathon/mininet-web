import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Dashboard as DashboardIcon,
  Map as MapIcon,
  AccountBalanceWallet as WalletIcon,
  Receipt as TransactionsIcon,
  NetworkCheck
} from '@mui/icons-material';
import WalletConnect from './WalletConnect';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/map', label: 'Network Map', icon: <MapIcon /> },
    { path: '/wallet', label: 'Wallet', icon: <WalletIcon /> },
    { path: '/transactions', label: 'Transactions', icon: <TransactionsIcon /> },
  ];

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        background: 'linear-gradient(135deg, #0F1419 0%, #1A1F2E 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Toolbar>
        {/* Logo and Title */}
        <Box display="flex" alignItems="center" flexGrow={1}>
          <IconButton 
            color="primary" 
            sx={{ mr: 2 }}
            onClick={() => navigate('/')}
          >
            <NetworkCheck sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Etherlink Offline Payments
          </Typography>
        </Box>

        {/* Navigation Items */}
        <Box display="flex" gap={1}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                color: location.pathname === item.path ? '#00D2FF' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: location.pathname === item.path ? 600 : 400,
                borderBottom: location.pathname === item.path ? '2px solid #00D2FF' : 'none',
                borderRadius: 0,
                px: 2,
                py: 1,
                '&:hover': {
                  color: '#00D2FF',
                  backgroundColor: 'rgba(0, 210, 255, 0.1)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Wallet Connect */}
        <Box ml={2}>
          <WalletConnect />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 