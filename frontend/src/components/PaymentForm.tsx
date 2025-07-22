import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Send as SendIcon, AccountBalanceWallet } from '@mui/icons-material';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';

// Define payment form data structure
export interface PaymentFormData {
  recipient: string;
  amount: number;
  token: TokenSymbol;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  balance: {
    [K in TokenSymbol]: number;
  };
  loading?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, balance, loading = false }) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    recipient: '',
    amount: 0,
    token: 'XTZ',
  });
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.recipient.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (formData.amount > balance[formData.token]) {
      setError(`Insufficient ${SUPPORTED_TOKENS[formData.token].symbol} balance`);
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        recipient: '',
        amount: 0,
        token: 'XTZ',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  const handleChange = (field: keyof PaymentFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(''); // Clear error when user types
  };

  const handleSelectChange = (field: keyof PaymentFormData) => (
    event: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(''); // Clear error when user types
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        background: 'rgba(26, 31, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <SendIcon color="primary" />
        <Typography variant="h6" fontWeight={600}>
          Send Payment
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Current Balance */}
      <Box 
        mb={2} 
        p={2} 
        borderRadius={1} 
        bgcolor="rgba(0, 210, 255, 0.1)"
        border="1px solid rgba(0, 210, 255, 0.3)"
      >
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <AccountBalanceWallet sx={{ color: '#00D2FF', fontSize: 20 }} />
          <Typography variant="body2" color="#00D2FF" fontWeight={500}>
            Your Balance
          </Typography>
        </Box>
        <Box display="flex" gap={3} flexWrap="wrap">
          {Object.entries(balance).map(([tokenSymbol, tokenBalance]) => {
            const tokenKey = tokenSymbol as TokenSymbol;
            const tokenConfig = SUPPORTED_TOKENS[tokenKey];
            return (
              <Typography key={tokenSymbol} variant="h6" color="text.primary">
                {tokenBalance.toFixed(2)} {tokenConfig.symbol}
              </Typography>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Token Selection */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Token</InputLabel>
        <Select
          value={formData.token}
          label="Token"
          onChange={handleSelectChange('token')}
          disabled={loading}
        >
          {Object.keys(SUPPORTED_TOKENS).map((tokenSymbol) => {
            const tokenKey = tokenSymbol as TokenSymbol;
            const tokenConfig = SUPPORTED_TOKENS[tokenKey];
            return (
              <MenuItem key={tokenSymbol} value={tokenSymbol}>
                <Box display="flex" alignItems="center" gap={1}>
                  <img 
                    src={tokenConfig.icon} 
                    alt={tokenConfig.symbol} 
                    width={20} 
                    height={20} 
                  />
                  {tokenConfig.symbol} - {tokenConfig.name}
                </Box>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Recipient Address */}
      <TextField
        fullWidth
        margin="normal"
        label="Recipient Address"
        value={formData.recipient}
        onChange={handleChange('recipient')}
        placeholder="Enter recipient's wallet address"
        disabled={loading}
      />

      {/* Amount */}
      <TextField
        fullWidth
        margin="normal"
        label="Amount"
        type="number"
        value={formData.amount || ''}
        onChange={handleChange('amount')}
        disabled={loading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {SUPPORTED_TOKENS[formData.token].symbol}
            </InputAdornment>
          ),
        }}
        inputProps={{
          min: 0,
          step: 0.01,
          max: balance[formData.token],
        }}
        helperText={`Available: ${balance[formData.token].toFixed(2)} ${SUPPORTED_TOKENS[formData.token].symbol}`}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading || !formData.recipient || formData.amount <= 0}
        startIcon={<SendIcon />}
        sx={{
          mt: 3,
          py: 1.5,
          background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
          },
        }}
      >
        {loading ? 'Processing...' : `Send ${formData.amount} ${SUPPORTED_TOKENS[formData.token].symbol}`}
      </Button>

      <Typography 
        variant="caption" 
        color="text.secondary" 
        display="block" 
        textAlign="center" 
        mt={2}
      >
        Transactions are verified by local authorities in the SmartPay network
      </Typography>
    </Paper>
  );
};

export default PaymentForm; 