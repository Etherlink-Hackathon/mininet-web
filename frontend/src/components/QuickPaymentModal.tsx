import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { ShardInfo } from '../types/api';

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  shards: ShardInfo[];
}

const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  open,
  onClose,
  shards,
}) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [token, setToken] = useState<'USDT' | 'USDC'>('USDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !recipient || !selectedCluster) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setAmount('');
        setRecipient('');
        setSelectedCluster('');
      }, 2000);
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
        <Box display="flex" alignItems="center" gap={1}>
          <Send color="primary" />
          <Typography variant="h6">Quick Payment</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
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

        <FormControl fullWidth disabled={loading || success} sx={{ mb: 2, mt: 2 }}>
            <InputLabel>Token</InputLabel>
            <Select
              value={token}
              label="Token"
              onChange={(e) => setToken(e.target.value as 'USDT' | 'USDC')}
            >
              <MenuItem value="USDT">
                <Box display="flex" alignItems="center" gap={1}>
                  <img src="usdt.jpg" alt="USDT" width={20} height={20} />
                  USDT
                </Box>
              </MenuItem>
              <MenuItem value="USDC">
                <Box display="flex" alignItems="center" gap={1}>
                  <img src="usdc.jpg" alt="USDC" width={20} height={20} />
                  USDC
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            disabled={loading || success}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
          
          <TextField
            label="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
            disabled={loading || success}
            placeholder="0x1234..."
          />
          
          <FormControl fullWidth disabled={loading || success}>
            <InputLabel>Cluster</InputLabel>
            <Select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              label="Cluster"
            >
              {shards.map((shard) => (
                <MenuItem key={shard.shard_id} value={shard.shard_id}>
                  {shard.shard_id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {shards.length === 0 && (
            <Alert severity="warning">
              No online authorities available. Please try again later.
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success || shards.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
        >
          {loading ? 'Sending...' : success ? 'Sent!' : 'Send Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPaymentModal; 