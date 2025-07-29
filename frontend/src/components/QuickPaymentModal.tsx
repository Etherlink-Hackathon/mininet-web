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
  CircularProgress,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import { apiService } from '../services/api';
import { useWalletContext } from '../context/WalletContext';
import { parseUnits } from 'viem';

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  shards: any[]; // You can type this properly based on your shard structure
}

const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  open,
  onClose,
  shards,
}) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [token, setToken] = useState<TokenSymbol>('XTZ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { accountInfo } = useWalletContext();

  const handleSubmit = async () => {
    if (!amount || !recipient || !selectedCluster) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate payment processing
      const data = await apiService.transfer({
        sender: accountInfo.address,
        recipient: recipient,
        amount: parseUnits(amount, SUPPORTED_TOKENS[token].decimals),
        sequence_number: accountInfo.sequence_number,
        token_address: SUPPORTED_TOKENS[token].address,
      });
      console.log(data);
      if(data.success) {
        setSuccess(true);
        // Reset form
        setAmount('');
        setRecipient('');
        setSelectedCluster('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Send color="primary" />
          <Typography variant="h6">Quick Payment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment sent successfully!
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Token Selection */}
          <FormControl fullWidth>
            <InputLabel>Token</InputLabel>
            <Select
              value={token}
              onChange={(e) => setToken(e.target.value as TokenSymbol)}
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
                      {tokenConfig.symbol}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Amount */}
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            placeholder={`Enter amount in ${SUPPORTED_TOKENS[token].symbol}`}
          />

          {/* Recipient */}
          <TextField
            fullWidth
            label="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={loading}
            placeholder="Enter recipient's address"
          />

          {/* Cluster Selection */}
          <FormControl fullWidth>
            <InputLabel>Authority Cluster</InputLabel>
            <Select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              disabled={loading}
            >
              {shards.length > 0 ? (
                shards.map((shard, index) => (
                  <MenuItem key={index} value={shard.shard_id || index}>
                    {shard.shard_id} ({shard.authorities.length || 0} nodes)
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="default">Default Cluster</MenuItem>
              )}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !amount || !recipient || !selectedCluster}
          startIcon={loading ? <CircularProgress size={16} /> : <Send />}
        >
          {loading ? 'Sending...' : `Send`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPaymentModal; 