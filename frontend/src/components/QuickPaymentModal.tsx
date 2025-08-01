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
  CircularProgress,
} from '@mui/material';
import { Send, Info } from '@mui/icons-material';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import { apiService } from '../services/api';
import { useWalletContext } from '../context/WalletContext';
import { parseUnits } from 'viem';
import { usePrivy, useWallets } from "@privy-io/react-auth";
import ProcessInfoTooltip from './ProcessInfoTooltip';
import { TransferOrder } from '../types/api';
import { TransferProgress } from '../components/TransferProgressModal';
import { v4 as uuidv4 } from 'uuid';

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  shards: any[]; // You can type this properly based on your shard structure
  setTransferProgress: (progress: any) => void;
  transferOrder: TransferOrder;
  setTransferOrder: (order: TransferOrder) => void;
}

const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  open,
  onClose,
  shards,
  setTransferProgress,
  transferOrder,
  setTransferOrder
}) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [token, setToken] = useState<TokenSymbol>('XTZ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { wallets } = useWallets();
  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address;

  const { accountInfo, updateCachedSequenceNumber } = useWalletContext();

  useEffect(() => {
    if(success) {
      setError('');
      setAmount('');
      setRecipient('');
      setSelectedCluster('');
    }
  }, [success]);

  const handleSubmit = async () => {
    if (!amount || !recipient || !selectedCluster) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const transferOrder = {
        order_id: uuidv4(),
        sender: walletAddress || '',
        recipient: recipient,
        amount: parseFloat(amount),
        token_address: SUPPORTED_TOKENS[token].address,
        sequence_number: accountInfo.sequence_number,
        signature: null,
        timestamp: new Date().toISOString(),
      };
      
      setTransferOrder(transferOrder);
      
      console.log('Transfer order:', transferOrder);
      await apiService.transfer({
        transfer_order: transferOrder,
      });
      
      setTransferProgress((prev: any) => ({
        ...prev,
        currentStep: 'processing',
      }));
      updateCachedSequenceNumber(accountInfo.sequence_number + 1);
    } catch (err) {
      setError('Payment failed: ' + (err as any).response.data.error);
      setTransferProgress((prev: any) => ({
        ...prev,
        currentStep: 'failed',
      }));
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
          <ProcessInfoTooltip />
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
            Transactions are verified by local authorities in the MeshPay network!
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
          sx={{
            background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #33DAFF 0%, #A29BFE 100%)',
            },
            '&:disabled': {
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.5)',
            },
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickPaymentModal; 