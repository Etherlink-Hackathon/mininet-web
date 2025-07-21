import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Dashboard as DashboardIcon,
  Map as MapIcon,
  AccountBalanceWallet as WalletIcon,
  Receipt as TransactionsIcon,
  Security as AuthorityIcon,
  NetworkCheck,
  Analytics as AnalyticsIcon,
  Groups as GroupsIcon,
  Wifi as MeshIcon,
  Add as DepositIcon,
  Lock as StakeIcon,
  Security as CertificateIcon,
  Send as PaymentIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Insights as OverviewIcon,
  Router as NetworkIcon,
  AccountBalance as WalletMainIcon,
  SwapHoriz as TransactionMainIcon
} from '@mui/icons-material';
import WalletConnect from './WalletConnect';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for dropdown menus
  const [anchorEls, setAnchorEls] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (category: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEls(prev => ({ ...prev, [category]: event.currentTarget }));
  };

  const handleMenuClose = (category: string) => {
    setAnchorEls(prev => ({ ...prev, [category]: null }));
  };

  const handleNavigate = (path: string, category: string) => {
    navigate(path);
    handleMenuClose(category);
  };

  // Navigation categories with dropdowns
  const navCategories = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <OverviewIcon />,
      items: [
        { path: '/', label: 'Dashboard', icon: <DashboardIcon />, description: 'Main control panel' },
        // Future: Analytics page
        // { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon />, description: 'Network statistics' },
      ]
    },
    {
      id: 'network',
      label: 'Network',
      icon: <NetworkIcon />,
      items: [
        { path: '/map', label: 'Network Map', icon: <MapIcon />, description: 'Visualize mesh network' },
        { path: '/authority', label: 'Authorities', icon: <AuthorityIcon />, description: 'Become an authority' },
        // Future: Mesh status page
        // { path: '/mesh', label: 'Mesh Status', icon: <MeshIcon />, description: 'Network health' },
      ]
    },
    {
      id: 'wallet',
      label: 'Wallet',
      icon: <WalletMainIcon />,
      items: [
        { path: '/wallet', label: 'Balance', icon: <WalletIcon />, description: 'View balances' },
        { path: '/wallet?tab=deposit', label: 'Deposit', icon: <DepositIcon />, description: 'Fund FastPay account' },
        { path: '/authority?action=stake', label: 'Stake', icon: <StakeIcon />, description: 'Stake to become authority' },
      ]
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <TransactionMainIcon />,
      items: [
        { path: '/transactions', label: 'History', icon: <TransactionsIcon />, description: 'Transaction history' },
        { path: '/transactions?tab=certificates', label: 'Certificates', icon: <CertificateIcon />, description: 'Payment certificates' },
        // { path: '/payments', label: 'Send Payment', icon: <PaymentIcon />, description: 'Make payments' },
      ]
    }
  ];

  const isActiveCategory = (category: any) => {
    return category.items.some((item: any) => {
      if (item.path === '/' && location.pathname === '/') return true;
      if (item.path !== '/' && location.pathname.startsWith(item.path.split('?')[0])) return true;
      return false;
    });
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        background: 'linear-gradient(135deg, #0F1419 0%, #1A1F2E 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo and Title */}
        <Box display="flex" alignItems="center" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <IconButton 
            color="primary" 
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
            SmartPay
          </Typography>
        </Box>

        {/* Navigation Categories (Center) */}
        <Box display="flex" alignItems="center" gap={1}>
          {navCategories.map((category) => (
            <Box key={category.id}>
              <Button
                endIcon={<ArrowDownIcon />}
                onClick={(e) => handleMenuOpen(category.id, e)}
                sx={{
                  color: isActiveCategory(category) ? '#00D2FF' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: isActiveCategory(category) ? 600 : 400,
                  borderBottom: isActiveCategory(category) ? '2px solid #00D2FF' : 'none',
                  borderRadius: 0,
                  px: 2,
                  py: 1,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#00D2FF',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                  },
                }}
              >
                {category.label}
              </Button>
              
              <Menu
                anchorEl={anchorEls[category.id]}
                open={Boolean(anchorEls[category.id])}
                onClose={() => handleMenuClose(category.id)}
                sx={{
                  '& .MuiPaper-root': {
                    backgroundColor: '#1A1F2E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    minWidth: 240,
                    mt: 1,
                  },
                }}
                transformOrigin={{ horizontal: 'center', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
              >
                {category.items.map((item, index) => (
                  <MenuItem 
                    key={item.path}
                    onClick={() => handleNavigate(item.path, category.id)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 210, 255, 0.1)',
                        color: '#00D2FF',
                      },
                      py: 1.5,
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label}
                      secondary={item.description}
                      sx={{
                        '& .MuiListItemText-secondary': {
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '0.75rem',
                        }
                      }}
                    />
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          ))}
        </Box>

        {/* Wallet Connect (Right) */}
        <Box>
          <WalletConnect />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 