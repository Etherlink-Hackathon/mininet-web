import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  AccountBalanceWallet,
  NetworkCheck,
  Speed,
  TrendingUp,
  Refresh,
  Send,
  Receipt,
  Add,
} from '@mui/icons-material';
import { useWalletContext } from '../context/WalletContext';
import { SUPPORTED_TOKENS, type TokenSymbol } from '../config/contracts';

import { AuthorityInfo, ShardInfo, NetworkMetrics } from '../types/api';
import { apiService } from '../services/api';
import QuickPaymentModal from '../components/QuickPaymentModal';
import DepositModal from '../components/DepositModal';
import NetworkMap from '../components/NetworkMap';

interface DashboardStats {
  onlineAuthorities: number;
  totalAuthorities: number;
  averageLatency: number;
  successRate: number;
}

const Dashboard: React.FC = () => {

  /* ------------------------------------------------------------------ */
  /* Wallet balances (MeshPay + on-chain)                               */
  /* ------------------------------------------------------------------ */
  const { 
    isConnected, 
    balances,
    fetchData,
    address,
  } = useWalletContext();

  // Refresh data when account changes
  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [isConnected, address]);

  const [stats, setStats] = useState<DashboardStats>({
    onlineAuthorities: 0,
    totalAuthorities: 0,
    averageLatency: 0,
    successRate: 95.5,
  });

  const [authorities, setAuthorities] = useState<AuthorityInfo[]>([]);
  const [shards, setShards] = useState<ShardInfo[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [shardsData, authoritiesData, metricsData] = await Promise.all([
        apiService.getShards(),
        apiService.getAuthorities(),
        apiService.getNetworkMetrics(),
      ]);

      setAuthorities(authoritiesData);
      setShards(shardsData);
      setNetworkMetrics(metricsData);

      // Update stats
      setStats(prev => ({
        ...prev,
        onlineAuthorities: metricsData.online_authorities,
        totalAuthorities: metricsData.total_authorities,
        averageLatency: metricsData.network_latency,
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  /* Format numeric or string balances with thousands separators */
  const formatBalance = (balance: string | number): string => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const getNetworkStatusColor = (): 'success' | 'warning' | 'error' => {
    const ratio = stats.onlineAuthorities / stats.totalAuthorities;
    if (ratio >= 0.8) return 'success';
    if (ratio >= 0.5) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h1" sx={{ 
          background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          MeshPay
        </Typography>
        <Box display="flex" gap={2}>
          <IconButton onClick={loadDashboardData} disabled={loading}>
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={() => setPaymentModalOpen(true)}
          >
            Quick Payment
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {isConnected && balances && (
        <Grid container spacing={3} mb={4}>
          {Object.entries(balances)
            .filter(([, bal]: [string, any]) => parseFloat(bal.meshpay) > 0)
            .map(([symbol, balanceData]: [string, any]) => {
              const tokenKey = symbol as TokenSymbol;
              const tokenCfg = SUPPORTED_TOKENS[tokenKey];
              return (
                <Grid item xs={12} sm={6} md={3} key={symbol}>
                  <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <img src={tokenCfg.icon} alt={tokenCfg.symbol} width={32} height={32} />
                        <Box>
                          <Typography variant="h5" color="primary.main" fontWeight={600}>
                            {formatBalance(balanceData.meshpay)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tokenCfg.symbol} MeshPay
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      )}

      {/* Stats Cards (network-level metrics) */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <NetworkCheck color={getNetworkStatusColor()} sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {stats.onlineAuthorities}/{stats.totalAuthorities}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Online Authorities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Speed color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {stats.averageLatency.toFixed(0)}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Latency
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">
                    {stats.successRate}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Network Map and Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 600 }}>
            <CardContent sx={{ height: '100%', p: '16px !important' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} px={2}>
                <Typography variant="h3">
                  Network Status Map
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Click on a shard to view details
                </Typography>
              </Box>
              <Box sx={{ height: 'calc(100% - 48px)' }}>
                <NetworkMap 
                  authorities={authorities} 
                  height="100%"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {/* Network Metrics */}
            {networkMetrics && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" gutterBottom>
                      Network Metrics
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Total Transactions</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {networkMetrics.total_transactions.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Successful</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          {networkMetrics.successful_transactions.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Avg Confirmation</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {networkMetrics.average_confirmation_time.toFixed(1)}s
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h3" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setDepositModalOpen(true)}
                      fullWidth
                      sx={{ 
                        background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00B8E6 0%, #5B4BD6 100%)',
                        }
                      }}
                    >
                      Deposit to MeshPay
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Send />}
                      onClick={() => setPaymentModalOpen(true)}
                      fullWidth
                    >
                      Send Payment
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Receipt />}
                      fullWidth
                    >
                      View Certificates
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AccountBalanceWallet />}
                      fullWidth
                    >
                      Transaction History
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        shards={shards}
      />

      {/* Deposit Modal */}
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />
    </Container>
  );
};

export default Dashboard; 