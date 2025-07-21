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
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { 
  AccountBalanceWallet, 
  SwapHoriz, 
  TrendingUp, 
  History,
  CheckCircle,
  Error,
  Pending,
  Add,
  Refresh,
  Wifi,
  WifiOff,
  PersonAdd,
} from '@mui/icons-material';
import { useAccount, useConnect } from 'wagmi';
import { useWalletContext } from '../context/WalletContext';
import { apiService } from '../services/api';
import { TransactionRecord } from '../types/api';
import QuickPaymentModal from '../components/QuickPaymentModal';
import DepositModal from '../components/DepositModal';

const Wallet: React.FC = () => {
  // Web3 connection
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  
  // FastPay context
  const {
    balances,
    balancesLoading,
    balancesError,
    isRegistered,
    accountInfo,
    registrationStatus,
    recentDeposits,
    registerAccount,
    refreshBalances,
    clearErrors,
  } = useWalletContext();

  // Local state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // Fetch offline transaction data from API
  useEffect(() => {
    const fetchOfflineTransactions = async () => {
      if (!isConnected) return;
      
      try {
        setApiLoading(true);
        const historyData = await apiService.getTransactionHistory();
        setTransactions(historyData);
        setApiError(null);
      } catch (err) {
        setApiError(apiService.handleApiError(err));
      } finally {
        setApiLoading(false);
      }
    };

    fetchOfflineTransactions();
  }, [isConnected]);

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
          FastPay Wallet
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your on-chain and off-chain USDT/USDC balances for offline payments
        </Typography>
      </Box>

      {/* Connection Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please connect your wallet to view balances and make deposits to FastPay.
          <Button 
            sx={{ ml: 2 }} 
            size="small" 
            variant="outlined"
            onClick={() => connect({ connector: connectors[0] })}
          >
            Connect Wallet
          </Button>
        </Alert>
      )}

      {/* Registration Alert */}
      {isConnected && !isRegistered && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={registerAccount}
              disabled={registrationStatus.isPending || registrationStatus.isConfirming}
              startIcon={registrationStatus.isPending || registrationStatus.isConfirming ? <Pending /> : <PersonAdd />}
            >
              {registrationStatus.isPending || registrationStatus.isConfirming ? 'Registering...' : 'Register'}
            </Button>
          }
        >
          Register your account with FastPay to enable offline payments and deposits.
        </Alert>
      )}

      {/* Errors */}
      {balancesError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {balancesError}
        </Alert>
      )}

      {apiError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Offline transactions: {apiError}
        </Alert>
      )}

      {/* Account Status */}
      {isConnected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Account Status</Typography>
              <Button 
                startIcon={<Refresh />} 
                onClick={refreshBalances}
                disabled={balancesLoading}
                size="small"
              >
                Refresh
              </Button>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                {isConnected ? <Wifi color="success" /> : <WifiOff color="error" />}
                <Typography variant="body2">
                  Wallet: {isConnected ? 'Connected' : 'Disconnected'}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {isRegistered ? <CheckCircle color="success" /> : <Error color="warning" />}
                <Typography variant="body2">
                  FastPay: {isRegistered ? 'Registered' : 'Not Registered'}
                </Typography>
              </Box>
              {address && (
                <Typography variant="body2" color="text.secondary">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Balance Cards */}
      <Grid container spacing={3} mb={4}>
        {/* USDT Balance Card */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                <img src="/usdt.svg" alt="USDT" width={20} height={20} style={{marginRight: '10px'}}/>
                  <Typography variant="h6">USDT Balances</Typography>
                </Box>
              </Box>
              
              {balancesLoading ? (
                <Box>
                  <Skeleton variant="text" width="60%" height={40} />
                  <Skeleton variant="text" width="40%" height={30} />
                  <Skeleton variant="text" width="40%" height={30} />
                </Box>
              ) : balances ? (
                <Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    ${parseFloat(balances.USDT.total).toFixed(2)}
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Wallet Balance:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ${parseFloat(balances.USDT.wallet).toFixed(6)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        FastPay Balance:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ${parseFloat(balances.USDT.fastpay).toFixed(6)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Connect wallet to view balances
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* USDC Balance Card */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
              <img src="/usdc.svg" alt="USDC" width={20} height={20} style={{marginRight: '10px'}}/>
                <Typography variant="h6">USDC Balances</Typography>
              </Box>
              
              {balancesLoading ? (
                <Box>
                  <Skeleton variant="text" width="60%" height={40} />
                  <Skeleton variant="text" width="40%" height={30} />
                  <Skeleton variant="text" width="40%" height={30} />
                </Box>
              ) : balances ? (
                <Box>
                  <Typography variant="h4" color="secondary" gutterBottom>
                    ${parseFloat(balances.USDC.total).toFixed(2)}
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Wallet Balance:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ${parseFloat(balances.USDC.wallet).toFixed(6)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        FastPay Balance:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        ${parseFloat(balances.USDC.fastpay).toFixed(6)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Connect wallet to view balances
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
              startIcon={<Add />}
              onClick={() => setDepositModalOpen(true)}
              disabled={!isConnected || !isRegistered}
            >
              Deposit to FastPay
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => setQuickPaymentOpen(true)}
              disabled={!isConnected || !isRegistered}
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
              {apiLoading ? (
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

      {/* Modals */}
      <QuickPaymentModal
        open={quickPaymentOpen}
        onClose={() => setQuickPaymentOpen(false)}
        shards={[]}
      />
      
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />
    </Container>
  );
};

export default Wallet; 