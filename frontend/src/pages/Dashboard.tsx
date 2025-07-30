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
import TransferProgressModal, { TransferProgress } from '../components/TransferProgressModal';

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
    accountInfo,
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
    successRate: 100,
  });

  const [authorities, setAuthorities] = useState<AuthorityInfo[]>([]);
  const [shards, setShards] = useState<ShardInfo[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [transferProgressModalOpen, setTransferProgressModalOpen] = useState(false);
  const [transferProgress, setTransferProgress] = useState<TransferProgress>({
    isProcessing: false,
    successfulAuthorities: 0,
    totalAuthorities: 3,
    currentStep: 'idle',
    stepMessage: '',
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      fetchData();
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
        onlineAuthorities: metricsData.online_authorities || 0,
        totalAuthorities: metricsData.total_authorities || 0,
        averageLatency: metricsData.network_latency || 0,
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

  // Handle transfer start from QuickPaymentModal
  const handleTransferStart = async (transferData: {
    sender: string;
    recipient: string;
    amount: string;
    token: TokenSymbol;
    sequence_number: number;
  }) => {
    try {
      // Start the transfer progress
      setTransferProgress({
        isProcessing: true,
        successfulAuthorities: 0,
        totalAuthorities: 3,
        currentStep: 'processing',
        stepMessage: 'Initiating transfer...',
      });
      setTransferProgressModalOpen(true);

      // Simulate the API call
      const data = await apiService.transfer({
        sender: transferData.sender,
        recipient: transferData.recipient,
        amount: transferData.amount,
        sequence_number: transferData.sequence_number,
        token_address: SUPPORTED_TOKENS[transferData.token].address,
      });

      // Start simulating authority confirmations
      simulateAuthorityConfirmations();
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferProgress(prev => ({ ...prev, currentStep: 'failed' }));
    }
  };

  // Simulate authority confirmations
  const simulateAuthorityConfirmations = () => {
    let currentAuthority = 0;
    const interval = setInterval(() => {
      if (currentAuthority < transferProgress.totalAuthorities) {
        setTransferProgress(prev => ({
          ...prev,
          successfulAuthorities: currentAuthority + 1,
          stepMessage: `Authority ${currentAuthority + 1} confirmed...`,
        }));
        currentAuthority++;
      } else {
        clearInterval(interval);
        setTransferProgress(prev => ({
          ...prev,
          currentStep: 'completed',
          stepMessage: 'All authorities confirmed!',
        }));
      }
    }, 800);
  };

  // Handle broadcast confirmation
  const handleBroadcastConfirmation = async () => {
    try {
      console.log('Broadcasting confirmation to network...');
      
      setTransferProgress(prev => ({ 
        ...prev, 
        currentStep: 'broadcasted',
        stepMessage: 'Transaction broadcasted successfully!'
      }));
      
      // Close the progress modal after a delay
      setTimeout(() => {
        setTransferProgressModalOpen(false);
        setTransferProgress({
          isProcessing: false,
          successfulAuthorities: 0,
          totalAuthorities: 3,
          currentStep: 'idle',
          stepMessage: '',
        });
      }, 2000);
      
    } catch (error) {
      console.error('Broadcast failed:', error);
    }
  };

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
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* All Dashboard Cards in Single Row */}
      <Grid container spacing={3} mb={4}>
        {/* MeshPay Balance Card */}
        {isConnected && (
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.1) 0%, rgba(108, 92, 231, 0.1) 100%)',
              backdropFilter: 'blur(20px)', 
              border: '1px solid rgba(0, 210, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #00D2FF 0%, #6C5CE7 100%)',
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AccountBalanceWallet sx={{ fontSize: 32, color: '#00D2FF' }} />
                    <Box>
                      <Typography variant="h5" fontWeight={600} sx={{ 
                        background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        MeshPay Balance
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available for offline payments
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={accountInfo.is_registered ? "Registered" : "Not Registered"} 
                      color={accountInfo.is_registered ? "success" : "warning"}
                      variant="outlined"
                    />
                    <IconButton 
                      onClick={loadDashboardData} 
                      disabled={loading}
                      size="small"
                      sx={{ 
                        color: '#00D2FF',
                        '&:hover': { backgroundColor: 'rgba(0, 210, 255, 0.1)' }
                      }}
                    >
                      <Refresh />
                    </IconButton>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {accountInfo.balances && Object.entries(accountInfo.balances).map(([symbol, balanceData]: [string, any]) => {
                    const tokenCfg = SUPPORTED_TOKENS[balanceData.token_symbol as TokenSymbol];
                    const meshpayBalance = parseFloat(balanceData.meshpay_balance || 0);
                    const walletBalance = parseFloat(balanceData.wallet_balance || 0);
                   
                    if (meshpayBalance > 0 || walletBalance > 0) {
                      return (
                        <Grid item xs={6} key={symbol}>
                          <Box sx={{ 
                            p: 2, 
                            borderRadius: 2, 
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <Box display="flex" alignItems="center" gap={2} mb={1}>
                              <img src={tokenCfg.icon} alt={tokenCfg.symbol} width={24} height={24} />
                              <Typography variant="h6" fontWeight={600}>
                                {tokenCfg.symbol}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="body2" color="text.secondary">
                                MeshPay:
                              </Typography>
                              <Typography variant="body2" fontWeight={600} color="#00D2FF">
                                {formatBalance(meshpayBalance)}
                              </Typography>
                            </Box>
                            
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="text.secondary">
                                Wallet:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {formatBalance(walletBalance)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }
                    return null;
                  })}
                </Grid>

                {!accountInfo.balances && (
                  <Box textAlign="center" py={3}>
                    <Typography variant="body1" color="text.secondary" mb={2}>
                      No balances available
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setDepositModalOpen(true)}
                      sx={{ 
                        background: 'linear-gradient(135deg, #00D2FF 0%, #6C5CE7 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #00B8E6 0%, #5B4BD6 100%)',
                        }
                      }}
                    >
                      Deposit to Get Started
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Network Stats Cards */}
        <Grid item xs={12} sm={4} md={2}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                <NetworkCheck color={getNetworkStatusColor()} sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats.onlineAuthorities}/{stats.totalAuthorities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Online Authorities
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4} md={2}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                <Speed color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats.averageLatency.toFixed(0)}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Latency
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4} md={2}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight={600}>
                  {stats.successRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Success Rate
                </Typography>
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
                  Network Status
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
        onTransferStart={handleTransferStart}
      />
      
      {/* Deposit Modal */}
      <DepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />

      {/* Transfer Progress Modal */}
      <TransferProgressModal
        open={transferProgressModalOpen}
        onClose={() => setTransferProgressModalOpen(false)}
        transferProgress={transferProgress}
        onBroadcastConfirmation={handleBroadcastConfirmation}
      />
    </Container>
  );
};

export default Dashboard; 