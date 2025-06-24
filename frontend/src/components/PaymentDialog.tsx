import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  transaction?: any;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({ open, onClose, transaction }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Payment Details</DialogTitle>
      <DialogContent>
        <Typography>Payment dialog content will be implemented here.</Typography>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog; 