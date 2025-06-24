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

interface AuthorityInfo {
  name: string;
  address: string;
  status: 'online' | 'offline' | 'syncing';
  stake: number;
  network_info: {
    host: string;
    port: number;
  };
}

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  authorities: AuthorityInfo[];
}

const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  open,
  onClose,
  authorities,
}) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedAuthority, setSelectedAuthority] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !recipient || !selectedAuthority) {
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
        setSelectedAuthority('');
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

        <Box display="flex" flexDirection="column" gap={3} pt={1}>
          <TextField
            label="Amount (USDT)"
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
            <InputLabel>Authority</InputLabel>
            <Select
              value={selectedAuthority}
              onChange={(e) => setSelectedAuthority(e.target.value)}
              label="Authority"
            >
              {authorities.map((authority) => (
                <MenuItem key={authority.name} value={authority.name}>
                  {authority.name} - {authority.status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {authorities.length === 0 && (
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
          disabled={loading || success || authorities.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <Send />}
        >
          {loading ? 'Sending...' : success ? 'Sent!' : 'Send Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPaymentModal; 