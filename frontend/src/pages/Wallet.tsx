import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Chip,
} from '@mui/material';
import { 
  AccountBalanceWallet, 
  SwapHoriz, 
  TrendingUp, 
  History,
  CheckCircle,
  Error,
  Pending
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { WalletBalance, TransactionRecord } from '../types/api';
import QuickPaymentModal from '../components/QuickPaymentModal';

const Wallet: React.FC = () => {
  const [balances, setBalances] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const [balanceData, historyData] = await Promise.all([
          apiService.getWalletBalance(),
          apiService.getTransactionHistory()
        ]);
        setBalances(balanceData);
        setTransactions(historyData);
        setError(null);
      } catch (err) {
        setError(apiService.handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusChip = (status: string) => {
    const statusProps = {
      pending: { icon: <Pending />, color: 'warning' as const, label: 'Pending' },
      confirmed: { icon: <CheckCircle />, color: 'success' as const, label: 'Confirmed' },
      failed: { icon: <Error />, color: 'error' as const, label: 'Failed' },
      timeout: { icon: <Error />, color: 'error' as const, label: 'Timeout' }
    }[status];

    return (
      <Chip
        icon={statusProps?.icon}
        label={statusProps?.label}
        color={statusProps?.color}
        size="small"
      />
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Wallet
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your USDT and USDC balances
        </Typography>
      </Box>

      {error && (
        <Box mb={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Balance Cards */}
      <Grid container spacing={3} mb={4}>
        {/* USDT Balance Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalanceWallet color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">USDT Balance</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="text" width="60%" height={60} />
              ) : (
                <Typography variant="h3" color="primary">
                  ${formatAmount(balances?.USDT || 0)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* USDC Balance Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccountBalanceWallet color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">USDC Balance</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="text" width="60%" height={60} />
              ) : (
                <Typography variant="h3" color="secondary">
                  ${formatAmount(balances?.USDC || 0)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mb={4}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<SwapHoriz />}
              onClick={() => setQuickPaymentOpen(true)}
            >
              Quick Payment
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => window.location.href = '/transactions'}
            >
              View All Transactions
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Recent Transactions */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Recent Transactions
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.transaction_id}>
                    <TableCell>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {tx.transfer_order.token}
                    </TableCell>
                    <TableCell>
                      ${formatAmount(tx.transfer_order.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(tx.status)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => window.location.href = `/transactions/${tx.transaction_id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      No transactions found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        open={quickPaymentOpen}
        onClose={() => setQuickPaymentOpen(false)}
        authorities={[]}
      />
    </Container>
  );
};

export default Wallet; 