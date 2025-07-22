import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { AccountBalanceWallet, TrendingUp } from '@mui/icons-material';
import { useWalletContext } from '../context/WalletContext';
import { SUPPORTED_TOKENS, type TokenSymbol, type SupportedToken } from '../config/contracts';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ open, onClose }) => {
  const {
    balances,
    isRegistered,
    depositStatus,
    depositToSmartPay,
    clearErrors,
  } = useWalletContext();

  const [token, setToken] = useState<TokenSymbol>('XTZ');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const getSteps = () => {
    if (token === 'XTZ') {
      return ['Deposit to SmartPay', 'Completed'];
    }
    return ['Approve Token', 'Deposit to SmartPay', 'Completed'];
  };

  const getActiveStep = () => {
    const steps = getSteps();
    if (token === 'XTZ') {
      // Native XTZ flow (no approval needed)
      switch (depositStatus.currentStep) {
        case 'depositing': return 0;
        case 'completed': return 1;
        default: return -1;
      }
    }
    // ERC20 token flow (requires approval)
    switch (depositStatus.currentStep) {
      case 'approving': return 0;
      case 'depositing': return 1;
      case 'completed': return 2;
      default: return -1;
    }
  };

  const validateForm = () => {
    const newErrors: { amount?: string } = {};
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (balances && parseFloat(amount) > parseFloat(balances[token].wallet)) {
      newErrors.amount = 'Insufficient wallet balance';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeposit = async () => {
    if (!validateForm()) return;
    
    clearErrors();
    
    try {
      const result = await depositToSmartPay(token, amount);
      if (result.success) {
        // Reset form on success
        setAmount('');
        setErrors({});
      }
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleClose = () => {
    if (depositStatus.isPending || depositStatus.isConfirming) {
      // Don't close while transaction is pending
      return;
    }
    
    // Reset form
    setAmount('');
    setErrors({});
    clearErrors();
    onClose();
  };

  const formatBalance = (value: string) => {
    return parseFloat(value).toFixed(6);
  };

  // Helper function to get token config safely
  const getTokenConfig = (tokenSymbol: TokenSymbol) => {
    return SUPPORTED_TOKENS[tokenSymbol as keyof typeof SUPPORTED_TOKENS];
  };

  const isTransactionPending = depositStatus.isPending || depositStatus.isConfirming;

  if (!isRegistered) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Account Not Registered</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You need to register your account with SmartPay before you can deposit tokens.
            Please register your account first.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(26, 31, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.1) 0%, rgba(108, 92, 231, 0.1) 100%)'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <AccountBalanceWallet color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Deposit to SmartPay
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Progress Stepper */}
        {isTransactionPending && (
          <Box mb={3}>
            <Stepper 
              activeStep={getActiveStep()}
              alternativeLabel
              sx={{
                '& .MuiStepLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiStepIcon-root': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  '&.Mui-active': {
                    color: '#00D2FF',
                  },
                  '&.Mui-completed': {
                    color: '#4CAF50',
                  },
                },
              }}
            >
              {getSteps().map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Transaction Status */}
        {depositStatus.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {depositStatus.error}
          </Alert>
        )}

        {depositStatus.currentStep === 'completed' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Deposit completed successfully! Your {getTokenConfig(token).symbol} is now available in SmartPay.
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Token</InputLabel>
            <Select
              value={token}
              onChange={(e) => setToken(e.target.value as TokenSymbol)}
              disabled={isTransactionPending}
            >
              {(Object.keys(SUPPORTED_TOKENS) as Array<keyof typeof SUPPORTED_TOKENS>).map((tokenSymbol) => {
                const tokenConfig = SUPPORTED_TOKENS[tokenSymbol];
                return (
                  <MenuItem key={tokenSymbol} value={tokenSymbol}>
                    <img 
                      src={tokenConfig.icon} 
                      alt={tokenConfig.symbol} 
                      width={20} 
                      height={20} 
                      style={{marginRight: '10px'}}
                    />
                    {tokenConfig.symbol} - {tokenConfig.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount}
            type="number"
            disabled={isTransactionPending}
            sx={{ mb: 2 }}
          />

          {balances && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" gutterBottom>
                  Current Balances ({getTokenConfig(token).symbol})
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceWallet fontSize="small" />
                    <Typography variant="body2">Wallet:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formatBalance(balances[token].wallet)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp fontSize="small" />
                    <Typography variant="body2">SmartPay:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formatBalance(balances[token].fastpay)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <Typography variant="body2" color="text.secondary">
            {token === 'XTZ' 
              ? 'Depositing native XTZ to SmartPay enables you to make offline payments. This requires one transaction to transfer XTZ to the SmartPay system.'
              : 'Depositing tokens to SmartPay enables you to make offline payments. This process requires two transactions: first approving the SmartPay contract to spend your tokens, then transferring them to the SmartPay system.'
            }
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Button 
          onClick={handleClose}
          disabled={isTransactionPending}
        >
          {isTransactionPending ? 'Transaction in Progress...' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleDeposit}
          disabled={isTransactionPending || !amount || parseFloat(amount) <= 0}
          startIcon={isTransactionPending ? <CircularProgress size={16} /> : undefined}
          sx={{
            background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
            },
          }}
        >
          {isTransactionPending 
            ? `${depositStatus.currentStep === 'approving' ? 'Approving...' : 'Depositing...'}` 
            : `Deposit ${getTokenConfig(token).symbol}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepositModal; 