import React from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle,
  Pending,
  Error as ErrorIcon,
  Receipt,
} from '@mui/icons-material';
import { TransactionRecord } from '../types/api';

interface RecentTransactionsProps {
  transactions: TransactionRecord[];
  loading?: boolean;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions, 
  loading = false 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle sx={{ color: '#00B894' }} />;
      case 'pending': return <Pending sx={{ color: '#FDCB6E' }} />;
      case 'failed': return <ErrorIcon sx={{ color: '#E84393' }} />;
      default: return <Pending sx={{ color: '#6B7280' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#00B894';
      case 'pending': return '#FDCB6E';
      case 'failed': return '#E84393';
      default: return '#6B7280';
    }
  };

  if (transactions.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          background: 'rgba(26, 31, 46, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Receipt color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Recent Transactions
          </Typography>
        </Box>
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No transactions yet
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        background: 'rgba(26, 31, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Receipt color="primary" />
        <Typography variant="h6" fontWeight={600}>
          Recent Transactions
        </Typography>
      </Box>

      <List disablePadding>
        {transactions.slice(0, 5).map((transaction, index) => (
          <React.Fragment key={transaction.transaction_id}>
            <ListItem disablePadding sx={{ py: 1 }}>
              <ListItemIcon>
                {getStatusIcon(transaction.status)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={500}>
                      {transaction.transfer_order.amount} {transaction.transfer_order.token}
                    </Typography>
                    <Chip
                      label={transaction.status.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(transaction.status)}20`,
                        color: getStatusColor(transaction.status),
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      To: {transaction.transfer_order.recipient.substring(0, 20)}...
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(transaction.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < Math.min(transactions.length - 1, 4) && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>

      {transactions.length > 5 && (
        <Box textAlign="center" mt={2}>
          <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }}>
            View all transactions →
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RecentTransactions; 