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
  IconButton,
} from '@mui/material';
import {
  AccountBalanceWallet,
  TrendingUp,
  Add,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useAccount, useConnect } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletContext } from '../context/WalletContext';
import DepositModal from '../components/DepositModal';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';
import { apiService } from '../services/api'; // Assuming this is for offline transactions
import { TransactionRecord } from '../types/api';

const Wallet: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { wallets } = useWallets();
  // Get wallet info
  const primaryWallet = wallets[0];
  const walletAddress = primaryWallet?.address;
  
  const {
    accountInfo,
    loading,
    setLoading,
    error,
    fetchData,
  } = useWalletContext();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    // This can be used for fetching offline transaction history if needed
    // For now, it's kept as a placeholder.
    const fetchOfflineTransactions = async () => {
      // const history = await apiService.getTransactionHistory();
      // setTransactions(history);
    };
    if (isConnected) {
      fetchOfflineTransactions();
    }
  }, [isConnected]);

  // useEffect(() => {
  //   if (isConnected && address) {
  //     fetchData();
  //   }
  // }, [isConnected, address, fetchData]);


  const formatBalance = (balance: string): string => {
    const num = Number(balance);
    if (Number.isNaN(num)) return '0';

    // Decide precision dynamically:
    //  • >= 1      → 2 decimal places
    //  • 0.01–1   → 4 decimal places
    //  • < 0.01   → 6 decimal places (max)
    let maxFraction = 2;
    if (Math.abs(num) < 1) maxFraction = 4;
    if (Math.abs(num) < 0.01) maxFraction = 6;

    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFraction,
    });
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

  if (!walletAddress) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center">
          <Typography variant="h4" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Connect your wallet to view balances and make MeshPay transactions
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
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight={600}>Your Wallet</Typography>
          <IconButton onClick={loadWalletData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      {accountInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Account Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center" gap={1}>
                  {accountInfo.is_registered ? <CheckCircle color="success" /> : <ErrorIcon color="error" />}
                  <Typography variant="body1">
                    Status: {accountInfo.is_registered ? 'Registered' : 'Not Registered'}
                  </Typography>
                </Box>
              </Grid>
              {accountInfo.is_registered && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Registration Time: {new Date(accountInfo.registration_time * 1000).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Redeemed Sequence: {accountInfo.last_redeemed_sequence}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3} mb={4}>
        {accountInfo.balances && Object.entries(accountInfo.balances).map(([token_symbol, balance]: [string, any]) => {
          const config = Object.values(SUPPORTED_TOKENS).find(token => token.symbol === balance.token_symbol);
          return (
            <Grid item xs={12} md={4} key={token_symbol}>
              <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <img src={config?.icon} alt={config?.symbol} width={24} height={24} />
                      <Typography variant="h6">{config?.symbol}</Typography>
                    </Box>
                    <TrendingUp fontSize="small" color="primary" />
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">MeshPay Balance</Typography>
                    <Typography variant="h5" fontWeight={600}>{formatBalance(balance.meshpay_balance.toString())}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Wallet Balance</Typography>
                    <Typography variant="h6" color="primary.main">{formatBalance(balance.wallet_balance.toString())}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {loading && !accountInfo.balances && <Grid item xs={12}><CircularProgress /></Grid>}
        {!loading && !accountInfo.balances && error && <Grid item xs={12}><Alert severity="warning">Could not load balances.</Alert></Grid>}
      </Grid>

      <Box mb={4}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDepositModalOpen(true)} disabled={!walletAddress}>
          Deposit to MeshPay
        </Button>
      </Box>

      {/* Recent Transactions */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Recent Transactions
        </Typography>
        
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
              {loading ? (
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
                      {tx.transfer_order.token_address}
                    </TableCell>
                    <TableCell>
                      {formatBalance(tx.transfer_order.amount.toString())}
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

      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />
    </Container>
  );
};

export default Wallet; 