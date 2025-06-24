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

        {/* Status Indicator */}
        <Box 
          ml={2} 
          display="flex" 
          alignItems="center" 
          gap={1}
          px={2}
          py={0.5}
          borderRadius={1}
          bgcolor="rgba(0, 184, 148, 0.1)"
          border="1px solid rgba(0, 184, 148, 0.3)"
        >
          <Box
            width={8}
            height={8}
            borderRadius="50%"
            bgcolor="#00B894"
            sx={{
              boxShadow: '0 0 8px rgba(0, 184, 148, 0.6)',
              animation: 'pulse 2s infinite',
            }}
          />
          <Typography variant="caption" color="#00B894" fontWeight={500}>
            Online
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 