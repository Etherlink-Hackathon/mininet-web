import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  Button,
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  AccountBalanceWallet,
  KeyboardArrowDown,
  ContentCopy,
  ExitToApp,
  Launch,
} from '@mui/icons-material';

const WalletConnect: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    handleMenuClose();
    // You could add a toast notification here
  };

  const handleViewExplorer = (address: string) => {
    window.open(`https://explorer.etherlink.com/address/${address}`, '_blank');
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get wallet info
  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address;

  if (!ready) {
    return (
      <Button
        variant="outlined"
        disabled
        startIcon={<AccountBalanceWallet />}
      >
        Loading...
      </Button>
    );
  }

  if (!authenticated || !user) {
    return (
      <Button
        variant="contained"
        onClick={login}
        startIcon={<AccountBalanceWallet />}
        sx={{
          background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
          },
        }}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {/* Wallet button */}
      <Button
        variant="outlined"
        onClick={handleMenuOpen}
        endIcon={<KeyboardArrowDown />}
        sx={{
          borderColor: 'rgba(0, 210, 255, 0.3)',
          color: '#00D2FF',
          '&:hover': {
            borderColor: '#00D2FF',
            bgcolor: 'rgba(0, 210, 255, 0.1)',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar
            sx={{
              width: 20,
              height: 20,
              bgcolor: '#00D2FF',
              fontSize: '0.75rem',
            }}
          >
            {user.wallet?.address?.slice(2, 4).toUpperCase() || 'W'}
          </Avatar>
          <Typography variant="body2">
            {walletAddress ? formatAddress(walletAddress) : 'Connected'}
          </Typography>
        </Box>
      </Button>

      {/* Wallet menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1A1F2E',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            mt: 1,
          },
        }}
      >
        {walletAddress && (
          <MenuItem onClick={() => handleCopyAddress(walletAddress)}>
            <ContentCopy fontSize="small" sx={{ mr: 2 }} />
            Copy Address
          </MenuItem>
        )}
        
        {walletAddress && (
          <MenuItem onClick={() => handleViewExplorer(walletAddress)}>
            <Launch fontSize="small" sx={{ mr: 2 }} />
            View on Explorer
          </MenuItem>
        )}
        
        <MenuItem onClick={handleLogout}>
          <ExitToApp fontSize="small" sx={{ mr: 2 }} />
          Disconnect
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WalletConnect; 