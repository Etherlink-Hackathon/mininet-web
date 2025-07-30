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
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material';
import { Send, CheckCircle, Security, Radio } from '@mui/icons-material';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import { apiService } from '../services/api';
import { useWalletContext } from '../context/WalletContext';
import { parseUnits } from 'viem';
import { usePrivy, useWallets } from "@privy-io/react-auth";

interface QuickPaymentModalProps {
  open: boolean;
  onClose: () => void;
  shards: any[]; // You can type this properly based on your shard structure
}

// Separate Transfer Progress Modal Component
const TransferProgressModal: React.FC<{
  open: boolean;
  onClose: () => void;
  transferProgress: {
    isProcessing: boolean;
    successfulAuthorities: number;
    totalAuthorities: number;
    currentStep: string;
    stepMessage: string;
  };
  onBroadcastConfirmation: () => void;
}> = ({ open, onClose, transferProgress, onBroadcastConfirmation }) => {
  const hasEnoughAuthorities = transferProgress.successfulAuthorities >= Math.ceil(transferProgress.totalAuthorities * 2/3);
  const isCompleted = transferProgress.currentStep === 'completed';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm" 
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
          <Security color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Authority Verification
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Progress Status */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            mt: 3,
            background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.1) 0%, rgba(108, 92, 231, 0.1) 100%)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: 2,
          }}
        >
          {/* Progress Bar */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                {transferProgress.stepMessage}
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {transferProgress.successfulAuthorities}/{transferProgress.totalAuthorities}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(transferProgress.successfulAuthorities / transferProgress.totalAuthorities) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #00D2FF 0%, #6C5CE7 100%)',
                  borderRadius: 4,
                  transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                },
              }}
            />
          </Box>

          {/* Authority Status */}
          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {Array.from({ length: transferProgress.totalAuthorities }, (_, index) => (
              <Chip
                key={index}
                icon={index < transferProgress.successfulAuthorities ? <CheckCircle /> : <CircularProgress size={16} />}
                label={`Authority ${index + 1}`}
                size="small"
                sx={{
                  bgcolor: index < transferProgress.successfulAuthorities 
                    ? 'rgba(76, 175, 80, 0.2)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: index < transferProgress.successfulAuthorities ? '#4CAF50' : 'white',
                  border: index < transferProgress.successfulAuthorities 
                    ? '1px solid rgba(76, 175, 80, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  '& .MuiChip-icon': {
                    color: index < transferProgress.successfulAuthorities ? '#4CAF50' : '#00D2FF',
                  },
                }}
              />
            ))}
          </Box>

        </Paper>

        {/* Certificate Status */}
        {hasEnoughAuthorities && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2,
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              '& .MuiAlert-icon': {
                color: '#4CAF50',
              },
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              ✅ We have received enough certificates ({transferProgress.successfulAuthorities}/{transferProgress.totalAuthorities} authorities)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
              The transaction can now be broadcast to the network for final confirmation.
            </Typography>
          </Alert>
        )}

      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Button onClick={onClose}>
          {isCompleted ? 'Close' : 'Cancel'}
        </Button>
        {hasEnoughAuthorities && (
          <Button
            variant="contained"
            onClick={onBroadcastConfirmation}
            startIcon={<Radio />}
            sx={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)',
              },
            }}
          >
            Broadcast Confirmation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

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
  const [data, setData] = useState<any>(null);
  const [transferProgress, setTransferProgress] = useState({
    isProcessing: false,
    successfulAuthorities: 0,
    totalAuthorities: 0,
    currentStep: 'idle', // 'idle' | 'processing' | 'completed' | 'failed'
    stepMessage: '',
  });
  const { wallets } = useWallets();
  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address;

  const { accountInfo } = useWalletContext();

  useEffect(() => {
    if(data && data.success) {
      setSuccess(true);
      setError('');
      setAmount('');
      setRecipient('');
      setSelectedCluster('');
      setTransferProgress(prev => ({ ...prev, currentStep: 'completed' }));
    }
  }, [data]);

  // Simulate authority confirmations
  useEffect(() => {
    if (transferProgress.isProcessing && transferProgress.totalAuthorities > 0) {
      const interval = setInterval(() => {
        setTransferProgress(prev => {
          if (prev.successfulAuthorities < prev.totalAuthorities) {
            return {
              ...prev,
              successfulAuthorities: prev.successfulAuthorities + 1,
              stepMessage: `Authority ${prev.successfulAuthorities + 1} confirmed...`
            };
          } else {
            clearInterval(interval);
            return {
              ...prev,
              currentStep: 'completed',
              stepMessage: 'All authorities confirmed!'
            };
          }
        });
      }, 800); // Simulate each authority taking 800ms

      return () => clearInterval(interval);
    }
  }, [transferProgress.isProcessing, transferProgress.totalAuthorities]);
  
  const handleSubmit = async () => {
    if (!amount || !recipient || !selectedCluster) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);
    
    // Start progress tracking
    setTransferProgress({
      isProcessing: true,
      successfulAuthorities: 0,
      totalAuthorities: 3, // Simulate 3 authorities
      currentStep: 'processing',
      stepMessage: 'Initiating transfer...'
    });

    try {
      // Simulate payment processing
      const data = await apiService.transfer({
        sender: walletAddress,
        recipient: recipient,
        amount: parseUnits(amount, SUPPORTED_TOKENS[token].decimals).toString(),
        sequence_number: accountInfo.sequence_number + 1,
        token_address: SUPPORTED_TOKENS[token].address,
      });
      setData(data);
    } catch (err) {
      setError('Payment failed. Please try again.');
      setTransferProgress(prev => ({ ...prev, currentStep: 'failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastConfirmation = async () => {
    try {
      // Here you would implement the actual broadcast logic
      console.log('Broadcasting confirmation to network...');
      
      // Simulate broadcast success
      setTransferProgress(prev => ({ 
        ...prev, 
        currentStep: 'broadcasted',
        stepMessage: 'Transaction broadcasted successfully!'
      }));
      
      // Close the progress modal after a delay
      setTimeout(() => {
        setTransferProgress({
          isProcessing: false,
          successfulAuthorities: 0,
          totalAuthorities: 0,
          currentStep: 'idle',
          stepMessage: '',
        });
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Broadcast failed:', error);
      setError('Broadcast failed. Please try again.');
    }
  };

  const handleClose = () => {
    if (!loading && !transferProgress.isProcessing) {
      onClose();
      setError('');
      setSuccess(false);
      setData(null);
      setTransferProgress({
        isProcessing: false,
        successfulAuthorities: 0,
        totalAuthorities: 0,
        currentStep: 'idle',
        stepMessage: '',
      });
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
          disabled={loading || !amount || !recipient || !selectedCluster || transferProgress.isProcessing}
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

      {/* Transfer Progress Modal */}
      <TransferProgressModal
        open={transferProgress.isProcessing}
        onClose={() => {
          if (transferProgress.currentStep === 'completed' || transferProgress.currentStep === 'broadcasted') {
            setTransferProgress({
              isProcessing: false,
              successfulAuthorities: 0,
              totalAuthorities: 0,
              currentStep: 'idle',
              stepMessage: '',
            });
          }
        }}
        transferProgress={transferProgress}
        onBroadcastConfirmation={handleBroadcastConfirmation}
      />
    </Dialog>
  );
};

export default QuickPaymentModal; 