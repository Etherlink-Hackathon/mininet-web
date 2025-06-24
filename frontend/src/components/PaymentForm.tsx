import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Send as SendIcon, AccountBalanceWallet } from '@mui/icons-material';
import { PaymentFormData } from '../types/api';

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  balance: { USDT: number; USDC: number };
  loading?: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, balance, loading = false }) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    recipient: '',
    amount: 0,
    token: 'USDT',
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
      setError(`Insufficient ${formData.token} balance`);
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        recipient: '',
        amount: 0,
        token: 'USDT',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  const handleChange = (field: keyof PaymentFormData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
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
        <Box display="flex" gap={3}>
          <Typography variant="h6" color="text.primary">
            {balance.USDT.toFixed(2)} USDT
          </Typography>
          <Typography variant="h6" color="text.primary">
            {balance.USDC.toFixed(2)} USDC
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Token Selection */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Token</InputLabel>
        <Select
          value={formData.token}
          label="Token"
          onChange={handleChange('token')}
        >
          <MenuItem value="USDT">USDT</MenuItem>
          <MenuItem value="USDC">USDC</MenuItem>
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
              {formData.token}
            </InputAdornment>
          ),
        }}
        inputProps={{
          min: 0,
          step: 0.01,
          max: balance[formData.token],
        }}
        helperText={`Available: ${balance[formData.token].toFixed(2)} ${formData.token}`}
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
        {loading ? 'Processing...' : `Send ${formData.amount} ${formData.token}`}
      </Button>

      <Typography 
        variant="caption" 
        color="text.secondary" 
        display="block" 
        textAlign="center" 
        mt={2}
      >
        Transactions are verified by local authorities in the FastPay network
      </Typography>
    </Paper>
  );
};

export default PaymentForm; 