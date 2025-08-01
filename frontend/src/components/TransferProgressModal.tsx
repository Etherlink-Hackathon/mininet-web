import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material';
import { Security, Radio } from '@mui/icons-material';
import ProcessInfoTooltip from './ProcessInfoTooltip';

export interface TransferProgress {
  isProcessing: boolean;
  successfulAuthorities: number;
  totalAuthorities: number;
  currentStep: string; // 'idle' | 'processing' | 'completed' | 'failed' | 'broadcasted'
  stepMessage: string;
}

interface TransferProgressModalProps {
  open: boolean;
  onClose: () => void;
  transferProgress: TransferProgress;
  onBroadcastConfirmation: () => void;
}

const TransferProgressModal: React.FC<TransferProgressModalProps> = ({ 
  open, 
  onClose, 
  transferProgress, 
  onBroadcastConfirmation 
}) => {
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
          <ProcessInfoTooltip />
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
                icon={index < transferProgress.successfulAuthorities ? <Security /> : <Box sx={{ width: 16, height: 16 }} />}
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
            {transferProgress.currentStep === 'broadcasted' ? 'Transaction Confirmed' : 'Broadcast Confirmation'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TransferProgressModal; 