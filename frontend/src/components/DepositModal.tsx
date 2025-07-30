import React, { useState, useEffect } from 'react';
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
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ open, onClose }) => {
  const {
    accountInfo,
    depositStatus,
    setDepositStatus,
    depositToMeshPay,
    clearErrors,
    getCachedBalance,
    fetchData,
    updateCachedBalance,
  } = useWalletContext();

  const [token, setToken] = useState<TokenSymbol>('XTZ');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isTransactionPending = depositStatus.isPending;
  const isTransactionCompleted = depositStatus.currentStep === 'completed';

  useEffect(() => {
    if (
      accountInfo &&
      accountInfo.balances &&
      SUPPORTED_TOKENS[token] &&
      typeof SUPPORTED_TOKENS[token].address === 'string' &&
      Object.prototype.hasOwnProperty.call(
        accountInfo.balances,
        SUPPORTED_TOKENS[token].address
      )
    ) {
      setBalance(
        accountInfo.balances[
          SUPPORTED_TOKENS[token].address as keyof typeof accountInfo.balances
        ]
      );
    } else {
      setBalance(null);
    }
  }, [accountInfo, token]);

  useEffect(() => {
    if (depositStatus.currentStep === 'completed') {
      setAmount('');
      updateCachedBalance(SUPPORTED_TOKENS[token].address, amount);
      refreshBalanceWithCache();
    }
  }, [depositStatus.currentStep]);

  // Enhanced balance refresh with cache fallback
  const refreshBalanceWithCache = async () => {
    setIsRefreshing(true);
    try {
      // Try to get cached data first for immediate UI update
      const cachedBalance = getCachedBalance();
      if (
        cachedBalance &&
        cachedBalance.balances &&
        SUPPORTED_TOKENS[token] &&
        typeof SUPPORTED_TOKENS[token].address === 'string' &&
        Object.prototype.hasOwnProperty.call(
          cachedBalance.balances,
          SUPPORTED_TOKENS[token].address
        )
      ) {
        setBalance(
          cachedBalance.balances[SUPPORTED_TOKENS[token].address as keyof typeof cachedBalance.balances]
        );
      }

      // Then refresh from API
      await fetchData();
    } catch (error) {
      console.warn('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSteps = () => {
    if (token === 'XTZ') {
      return ['Deposit to MeshPay', 'Completed'];
    }
    return ['Approve Token', 'Deposit to MeshPay', 'Completed'];
  };

  const getActiveStep = () => {
    switch (depositStatus.currentStep) {
      case 'approving': return 0;
      case 'depositing': return 1;
      case 'completed': return 2;
      default: return -1;
    }
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

    if (accountInfo.address && accountInfo.balances && accountInfo.balances[token] && parseFloat(amount) > parseFloat(accountInfo.balances[token].wallet_balance.toString())) {
      setError('Insufficient wallet balance');
      return false;
    }
    setError(null);
    return true;
  };

  const handleDeposit = async () => {
    if (!validateForm()) return;
    
    clearErrors();

    await depositToMeshPay(token, amount);
  };
  
  const handleClose = () => {
    // Allow closing if transaction is completed or not pending
    if (depositStatus.isPending && depositStatus.currentStep !== 'completed') return;
    setDepositStatus({
      isPending: false,
      isConfirming: false,
      currentStep: 'idle',
      error: null,
      transactionHash: undefined,
    });
    setAmount('');
    setError(null);
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
            Deposit to MeshPay
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
            Deposit completed successfully! Your {getTokenConfig(token).symbol} is now available in MeshPay.
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
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
                    {tokenConfig.symbol}
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
            error={!!error}
            helperText={error}
            type="number"
            disabled={isTransactionPending}
            sx={{ mb: 2 }}
          />

          {balance ? (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Balances ({getTokenConfig(token).symbol})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceWallet fontSize="small" />
                    <Typography variant="body2">Wallet:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formatBalance(balance.wallet_balance.toString())}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp fontSize="small" />
                    <Typography variant="body2">MeshPay:</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formatBalance(balance.meshpay_balance.toString())}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Typography>Loading balances...</Typography>
          )}

          <Typography variant="body2" color="text.secondary">
            {accountInfo && !accountInfo.is_registered && (
              "Your account will be automatically registered with your first deposit. "
            )}
            {token === 'XTZ'
              ? 'This requires one transaction to transfer XTZ to the MeshPay system.'
              : 'This process requires two transactions: first to approve the MeshPay contract, then to transfer the tokens.'
            }
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Button 
          onClick={handleClose}
          disabled={isTransactionPending && !isTransactionCompleted}
        >
          {isTransactionCompleted ? 'Cancel' : (isTransactionPending ? 'In Progress...' : 'Cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleDeposit}
          disabled={isTransactionPending || !amount || isTransactionCompleted}
          startIcon={isTransactionPending ? <CircularProgress size={16} /> : undefined}
          sx={{
            background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
            },
          }}
        >
          {isTransactionPending
          ? isTransactionCompleted
            ? 'Deposit Completed'
            : `${depositStatus.currentStep === 'approving' ? 'Approving...' : 'Depositing...'}`
          : 'Deposit Now'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepositModal; 