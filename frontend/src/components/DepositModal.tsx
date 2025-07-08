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
  CircularProgress,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { Close, AccountBalanceWallet, TrendingUp } from '@mui/icons-material';
import { useWalletContext } from '../context/WalletContext';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ open, onClose }) => {
  const {
    balances,
    isRegistered,
    depositStatus,
    depositToFastPay,
    clearErrors,
  } = useWalletContext();

  const [token, setToken] = useState<'USDT' | 'USDC'>('USDT');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const steps = ['Approve Token', 'Deposit to FastPay', 'Completed'];

  const getActiveStep = () => {
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
      const result = await depositToFastPay(token, amount);
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

  const isTransactionPending = depositStatus.isPending || depositStatus.isConfirming;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Deposit to FastPay</Typography>
        <IconButton 
          onClick={handleClose} 
          disabled={isTransactionPending}
          sx={{ color: 'text.secondary' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {!isRegistered && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You need to register your account with FastPay before making deposits.
          </Alert>
        )}

        {depositStatus.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {depositStatus.error}
          </Alert>
        )}

        {depositStatus.currentStep !== 'idle' && depositStatus.currentStep !== 'failed' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Transaction Progress
            </Typography>
            <Stepper activeStep={getActiveStep()} sx={{ mb: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {isTransactionPending && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  {depositStatus.isConfirming 
                    ? 'Confirming transaction...' 
                    : depositStatus.currentStep === 'approving'
                    ? 'Approving token...'
                    : 'Processing deposit...'
                  }
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Token</InputLabel>
            <Select
              value={token}
              onChange={(e) => setToken(e.target.value as 'USDT' | 'USDC')}
              disabled={isTransactionPending}
            >
              <MenuItem value="USDT">USDT</MenuItem>
              <MenuItem value="USDC">USDC</MenuItem>
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
                  Current Balances ({token})
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
                    <Typography variant="body2">FastPay:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formatBalance(balances[token].fastpay)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <Typography variant="body2" color="text.secondary">
            Depositing tokens to FastPay enables you to make offline payments. This process requires two transactions: 
            first approving the FastPay contract to spend your tokens, then transferring them to the FastPay system.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={handleClose} 
          disabled={isTransactionPending}
        >
          {isTransactionPending ? 'Transaction Pending' : 'Cancel'}
        </Button>
        <Button 
          onClick={handleDeposit}
          variant="contained"
          disabled={
            !isRegistered || 
            !amount || 
            !!errors.amount || 
            isTransactionPending ||
            depositStatus.currentStep === 'completed'
          }
        >
          {isTransactionPending ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Processing...
            </>
          ) : depositStatus.currentStep === 'completed' ? (
            'Completed'
          ) : (
            'Deposit'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepositModal; 