import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet,
  TrendingUp,
  Add,
  SwapHoriz,
  History,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAccount, useConnect } from 'wagmi';
import { useWalletContext } from '../context/WalletContext';
import QuickPaymentModal from '../components/QuickPaymentModal';
import DepositModal from '../components/DepositModal';
import PaymentForm, { type PaymentFormData } from '../components/PaymentForm';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import { apiService } from '../services/api';
import { TransactionRecord } from '../types/api';

// Types for backend API responses
interface BackendAccountInfo {
  address: string;
  is_registered: boolean;
  registration_time: number;
  last_redeemed_sequence: number;
}

interface BackendTokenBalance {
  token_symbol: string;
  token_address: string;
  wallet_balance: string;
  fastpay_balance: string;
  total_balance: string;
  decimals: number;
}

interface BackendWalletBalances {
  address: string;
  balances: BackendTokenBalance[];
}

interface BackendContractStats {
  total_accounts: number;
  total_native_balance: string;
  total_token_balances: Record<string, string>;
}

const Wallet: React.FC = () => {
  // Web3 connection
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  
  // SmartPay context (for frontend contract interactions)
  const {
    balances: contextBalances,
    balancesLoading: contextBalancesLoading,
    balancesError: contextBalancesError,
    isRegistered: contextIsRegistered,
    accountInfo: contextAccountInfo,
    registrationStatus,
    recentDeposits,
    registerAccount,
    refreshBalances: refreshContextBalances,
    clearErrors,
  } = useWalletContext();

  // Backend state
  const [backendAccountInfo, setBackendAccountInfo] = useState<BackendAccountInfo | null>(null);
  const [backendBalances, setBackendBalances] = useState<BackendWalletBalances | null>(null);
  const [backendStats, setBackendStats] = useState<BackendContractStats | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Local state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // Fetch backend data
  const fetchBackendData = async () => {
    if (!isConnected || !address) return;
    
    try {
      setBackendLoading(true);
      setBackendError(null);
      
      // Fetch account info, balances, and contract stats in parallel
      const [accountResponse, balancesResponse, statsResponse] = await Promise.allSettled([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/account/${address}`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/balances/${address}`),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/api/wallet/contract-stats`),
      ]);
      
      // Process account info
      if (accountResponse.status === 'fulfilled' && accountResponse.value.ok) {
        const accountData = await accountResponse.value.json();
        setBackendAccountInfo(accountData);
      }
      
      // Process balances
      if (balancesResponse.status === 'fulfilled' && balancesResponse.value.ok) {
        const balancesData = await balancesResponse.value.json();
        setBackendBalances(balancesData);
      }
      
      // Process contract stats
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        setBackendStats(statsData);
      }
      
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : 'Failed to fetch backend data');
    } finally {
      setBackendLoading(false);
    }
  };

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

  // Fetch backend data when account changes
  useEffect(() => {
    fetchBackendData();
  }, [isConnected, address]);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatBalance = (balance: string): string => {
    return parseFloat(balance).toFixed(6);
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      'completed': 'success',
      'pending': 'warning',
      'failed': 'error',
      'processing': 'info',
    };

    return (
      <Chip 
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  // Handle payment form submission
  const handlePaymentSubmit = async (data: PaymentFormData) => {
    // This would integrate with your payment processing logic
    console.log('Payment data:', data);
    // For now, just simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Convert balances to the format expected by PaymentForm
  const getFormattedBalances = () => {
    const balancesToUse = backendBalances?.balances || [];
    if (balancesToUse.length === 0) return {} as { [K in TokenSymbol]: number };
    
    return balancesToUse.reduce((acc, balance) => {
      const tokenKey = balance.token_symbol as TokenSymbol;
      acc[tokenKey] = parseFloat(balance.fastpay_balance || '0');
      return acc;
    }, {} as { [K in TokenSymbol]: number });
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchBackendData(),
      refreshContextBalances(),
    ]);
  };

  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center">
          <Typography variant="h4" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Connect your wallet to view balances and make SmartPay transactions
          </Typography>
          {connectors.map((connector) => (
            <Button
              key={connector.id}
              variant="contained"
              onClick={() => connect({ connector })}
              sx={{ m: 1 }}
            >
              Connect {connector.name}
            </Button>
          ))}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight={600}>
              Your Wallet
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your SmartPay balances and transactions
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefreshAll}
            disabled={backendLoading || contextBalancesLoading}
          >
            Refresh
          </Button>
        </Box>
        
        {/* Loading indicator */}
        {(backendLoading || contextBalancesLoading) && (
          <LinearProgress sx={{ mb: 2 }} />
        )}
      </Box>

      {/* Contract Stats Card */}
      {backendStats && (
        <Card sx={{ mb: 3, background: 'rgba(0, 210, 255, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SmartPay Network Status
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {backendStats.total_accounts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Accounts
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {formatBalance(backendStats.total_native_balance)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total XTZ Locked
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {Object.keys(backendStats.total_token_balances).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Token Types
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Registration Status */}
      {backendAccountInfo && !backendAccountInfo.is_registered && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={registerAccount}
              disabled={registrationStatus.isPending}
            >
              {registrationStatus.isPending ? 'Registering...' : 'Register'}
            </Button>
          }
        >
          You need to register your account with SmartPay to make transactions.
        </Alert>
      )}

      {/* Account Information */}
      {backendAccountInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  {backendAccountInfo.is_registered ? (
                    <CheckCircle color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                  <Typography variant="body1">
                    Status: {backendAccountInfo.is_registered ? 'Registered' : 'Not Registered'}
                  </Typography>
                </Box>
              </Grid>
              {backendAccountInfo.is_registered && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Registration Time: {new Date(backendAccountInfo.registration_time * 1000).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Redeemed Sequence: {backendAccountInfo.last_redeemed_sequence}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Backend Error Display */}
      {backendError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Backend Error: {backendError}
        </Alert>
      )}

      {/* Balance Cards */}
      <Grid container spacing={3} mb={4}>
        {backendBalances && backendBalances.balances.map((tokenBalance) => {
          const tokenKey = tokenBalance.token_symbol as TokenSymbol;
          const tokenConfig = SUPPORTED_TOKENS[tokenKey];
          return (
            <Grid item xs={12} md={4} key={tokenBalance.token_symbol}>
              <Card 
                sx={{ 
                  background: 'rgba(26, 31, 46, 0.4)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <img src={tokenConfig.icon} alt={tokenConfig.symbol} width={24} height={24} />
                      <Typography variant="h6">{tokenConfig.symbol}</Typography>
                    </Box>
                    <TrendingUp fontSize="small" color="primary" />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Wallet Balance
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {formatBalance(tokenBalance.wallet_balance)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      SmartPay Balance
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatBalance(tokenBalance.fastpay_balance)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Balance
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {formatBalance(tokenBalance.total_balance)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        
        {(backendLoading || contextBalancesLoading) && !backendBalances && (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          </Grid>
        )}
        
        {!backendLoading && !backendBalances && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary">
                  No balance data available. Please check your connection and try refreshing.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Quick Actions */}
      <Box mb={4}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setDepositModalOpen(true)}
              disabled={!isConnected || !backendAccountInfo?.is_registered}
            >
              Deposit to SmartPay
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => setQuickPaymentOpen(true)}
              disabled={!isConnected || !backendAccountInfo?.is_registered}
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

      {/* Payment Form */}
      {backendAccountInfo?.is_registered && backendBalances && (
        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Send Payment
          </Typography>
          <PaymentForm
            onSubmit={handlePaymentSubmit}
            balance={getFormattedBalances()}
            loading={false}
          />
        </Box>
      )}

      {/* Recent Transactions */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Recent Transactions
        </Typography>
        
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
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