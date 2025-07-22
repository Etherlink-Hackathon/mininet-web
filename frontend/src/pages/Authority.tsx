import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Security,
  Lock,
  Wifi,
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  TrendingUp,
  NetworkCheck,
  Computer,
  Info,
  Warning,
  CheckCircle,
  Error,
  Clear,
  Download,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';

interface AuthorityLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'mesh' | 'authority' | 'transaction' | 'network';
  message: string;
  details?: string;
}

interface AuthorityStatus {
  isLocked: boolean;
  lockedAmount: string;
  isRunning: boolean;
  meshStatus: 'offline' | 'connecting' | 'online' | 'error';
  connectedPeers: number;
  processedTransactions: number;
  earnings: string;
  isAuthority: boolean;
  dailyRewards: string;
  weeklyRewards: string;
  monthlyRewards: string;
  totalStaked: string;
  authorityRank: number;
  uptime: number;
  validatorScore: number;
}

const Authority: React.FC = () => {
  const { isConnected, address } = useAccount();
  
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [authorityStatus, setAuthorityStatus] = useState<AuthorityStatus>({
    isLocked: false,
    lockedAmount: '0',
    isRunning: false,
    meshStatus: 'offline',
    connectedPeers: 0,
    processedTransactions: 0,
    earnings: '0',
    isAuthority: false, // TODO: Check from smart contract
    dailyRewards: '0.05',
    weeklyRewards: '0.35',
    monthlyRewards: '1.42',
    totalStaked: '0',
    authorityRank: 0,
    uptime: 0,
    validatorScore: 0,
  });
  
  const [logs, setLogs] = useState<AuthorityLog[]>([]);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockAmount, setLockAmount] = useState('100');
  const [lockDuration, setLockDuration] = useState('30');
  const [isLocking, setIsLocking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // TODO: Smart contract integration to check if user is authority
  useEffect(() => {
    // Check if current address is in authority list from smart contract
    // const checkAuthorityStatus = async () => {
    //   if (address) {
    //     const isAuthority = await fastPayContract.isAuthority(address);
    //     setAuthorityStatus(prev => ({ ...prev, isAuthority }));
    //   }
    // };
    // checkAuthorityStatus();
  }, [address]);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate authority status updates
    const statusInterval = setInterval(() => {
      if (authorityStatus.isRunning) {
        setAuthorityStatus(prev => ({
          ...prev,
          connectedPeers: Math.max(0, prev.connectedPeers + Math.floor(Math.random() * 3) - 1),
          processedTransactions: prev.processedTransactions + Math.floor(Math.random() * 2),
          earnings: (parseFloat(prev.earnings) + Math.random() * 0.01).toFixed(4),
          dailyRewards: (parseFloat(prev.dailyRewards) + Math.random() * 0.001).toFixed(3),
          uptime: Math.min(100, prev.uptime + Math.random() * 0.1),
          validatorScore: Math.min(100, prev.validatorScore + Math.random() * 0.5),
        }));
      }
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [authorityStatus.isRunning]);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Add log entry
  const addLog = (level: AuthorityLog['level'], category: AuthorityLog['category'], message: string, details?: string) => {
    const newLog: AuthorityLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Handle token locking
  const handleLockTokens = async () => {
    setIsLocking(true);
    try {
      addLog('info', 'authority', `Initiating token lock: ${lockAmount} XTZ for ${lockDuration} days`);
      
      // Simulate smart contract interaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setAuthorityStatus(prev => ({
        ...prev,
        isLocked: true,
        lockedAmount: lockAmount,
      }));
      
      setActiveStep(1);
      addLog('success', 'authority', `Successfully locked ${lockAmount} XTZ`, `Lock duration: ${lockDuration} days`);
      setLockModalOpen(false);
    } catch (error) {
      addLog('error', 'authority', 'Failed to lock tokens', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLocking(false);
    }
  };

  // Handle mesh network start
  const handleStartMeshNetwork = async () => {
    setIsStarting(true);
    try {
      addLog('info', 'mesh', 'Starting mesh network authority...');
      setAuthorityStatus(prev => ({ ...prev, meshStatus: 'connecting' }));
      
      // Simulate mesh network initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      addLog('info', 'mesh', 'Initializing IEEE 802.11s mesh interface...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog('info', 'network', 'Configuring MeshPay authority protocol...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('success', 'mesh', 'Mesh network started successfully');
      
      setAuthorityStatus(prev => ({
        ...prev,
        isRunning: true,
        meshStatus: 'online',
        connectedPeers: 2,
      }));
      
      setActiveStep(2);
      addLog('info', 'authority', 'Authority node is now active and accepting transactions');
    } catch (error) {
      addLog('error', 'mesh', 'Failed to start mesh network', error instanceof Error ? error?.message : 'Unknown error');
      setAuthorityStatus(prev => ({ ...prev, meshStatus: 'error' }));
    } finally {
      setIsStarting(false);
    }
  };

  // Handle mesh network stop
  const handleStopMeshNetwork = async () => {
    addLog('info', 'mesh', 'Stopping mesh network authority...');
    setAuthorityStatus(prev => ({ ...prev, meshStatus: 'offline', isRunning: false, connectedPeers: 0 }));
    addLog('warning', 'authority', 'Authority node stopped');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'authority', 'Log history cleared');
  };

  // Download logs
  const downloadLogs = () => {
    const logContent = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? ` - ${log.details}` : ''}`
    ).join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `authority-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get log icon
  const getLogIcon = (level: AuthorityLog['level']) => {
    switch (level) {
      case 'success': return <CheckCircle fontSize="small" color="success" />;
      case 'warning': return <Warning fontSize="small" color="warning" />;
      case 'error': return <Error fontSize="small" color="error" />;
      default: return <Info fontSize="small" color="info" />;
    }
  };

  // Get mesh status color
  const getMeshStatusColor = (status: AuthorityStatus['meshStatus']) => {
    switch (status) {
      case 'online': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const steps = [
    {
      label: 'Lock Tokens',
      description: 'Lock 100 XTZ to become an authority',
    },
    {
      label: 'Start Mesh Network',
      description: 'Initialize your device as a mesh authority',
    },
    {
      label: 'Authority Active',
      description: 'Process transactions and earn rewards',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          <Security sx={{ mr: 2, verticalAlign: 'middle' }} />
          Become an Authority
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Lock tokens to become a MeshPay authority and earn rewards by processing offline transactions
        </Typography>
      </Box>

      {/* Connection Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please connect your wallet to become an authority
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Panel - Setup or Logs */}
        <Grid item xs={12} md={6}>
          {!authorityStatus.isAuthority ? (
            /* Authority Setup Process */
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Authority Setup
                </Typography>
                
                <Stepper activeStep={activeStep} orientation="vertical">
                  {steps.map((step, index) => (
                    <Step key={step.label}>
                      <StepLabel>{step.label}</StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {step.description}
                        </Typography>
                        
                        {index === 0 && !authorityStatus.isLocked && (
                          <Button
                            variant="contained"
                            startIcon={<Lock />}
                            onClick={() => setLockModalOpen(true)}
                            disabled={!isConnected}
                          >
                            Lock Tokens
                          </Button>
                        )}
                        
                        {index === 1 && authorityStatus.isLocked && !authorityStatus.isRunning && (
                          <Button
                            variant="contained"
                            startIcon={isStarting ? <CircularProgress size={16} /> : <PlayArrow />}
                            onClick={handleStartMeshNetwork}
                            disabled={isStarting}
                          >
                            {isStarting ? 'Starting...' : 'Start Mesh Network'}
                          </Button>
                        )}
                        
                        {index === 2 && authorityStatus.isRunning && (
                          <Box>
                            <Button
                              variant="outlined"
                              startIcon={<Stop />}
                              onClick={handleStopMeshNetwork}
                              color="error"
                              sx={{ mr: 1 }}
                            >
                              Stop Authority
                            </Button>
                            <Button
                              variant="outlined"
                              startIcon={<Settings />}
                            >
                              Configure
                            </Button>
                          </Box>
                        )}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
          ) : (
            /* Authority Logs for Active Authorities */
            <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Authority Logs
                  </Typography>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoScroll}
                          onChange={(e) => setAutoScroll(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Auto-scroll"
                      sx={{ mr: 1 }}
                    />
                    <IconButton size="small" onClick={downloadLogs} disabled={logs.length === 0}>
                      <Download />
                    </IconButton>
                    <IconButton size="small" onClick={clearLogs} disabled={logs.length === 0}>
                      <Clear />
                    </IconButton>
                  </Box>
                </Box>
                
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    bgcolor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {logs.length === 0 ? (
                    <Box p={2} textAlign="center" color="text.secondary">
                      <Computer sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                      <Typography variant="body2">
                        No logs yet. Authority operations will appear here.
                      </Typography>
                    </Box>
                  ) : (
                    <List dense sx={{ py: 0 }}>
                      {logs.map((log, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                {getLogIcon(log.level)}
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </Typography>
                                <Chip label={log.category} size="small" variant="outlined" sx={{ minWidth: 80, fontSize: '0.7rem', height: 20 }} />
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {log.message}
                                </Typography>
                              </Box>
                            }
                            secondary={log.details && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, fontFamily: 'monospace' }}>
                                {log.details}
                              </Typography>
                            )}
                          />
                        </ListItem>
                      ))}
                      <div ref={logsEndRef} />
                    </List>
                  )}
                </Paper>
              </CardContent>
            </Card>
          )}

          {/* Authority Status */}
          {authorityStatus.isLocked && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Authority Status
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Lock fontSize="small" />
                      <Typography variant="body2">Locked:</Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {authorityStatus.lockedAmount} XTZ
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Wifi fontSize="small" />
                      <Typography variant="body2">Mesh Status:</Typography>
                    </Box>
                    <Chip 
                      label={authorityStatus.meshStatus} 
                      color={getMeshStatusColor(authorityStatus.meshStatus)}
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <NetworkCheck fontSize="small" />
                      <Typography variant="body2">Connected Peers:</Typography>
                    </Box>
                    <Typography variant="h6">
                      {authorityStatus.connectedPeers}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <TrendingUp fontSize="small" />
                      <Typography variant="body2">Earnings:</Typography>
                    </Box>
                    <Typography variant="h6" color="success.main">
                      {authorityStatus.earnings} XTZ
                    </Typography>
                  </Grid>
                </Grid>

                {authorityStatus.isRunning && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Transactions Processed: {authorityStatus.processedTransactions}
                    </Typography>
                    <LinearProgress 
                      variant="indeterminate" 
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Panel - Dashboard or Logs */}
        <Grid item xs={12} md={6}>
          {!authorityStatus.isAuthority ? (
            /* Authority Dashboard */
            <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Authority Dashboard
                </Typography>
                
                {/* Rewards Overview */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Daily Rewards
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {authorityStatus.dailyRewards} XTZ
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Weekly Rewards
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {authorityStatus.weeklyRewards} XTZ
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Monthly Rewards
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {authorityStatus.monthlyRewards} XTZ
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Staked
                        </Typography>
                        <Typography variant="h6" color="primary.main">
                          {authorityStatus.totalStaked || '0'} XTZ
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Performance Metrics */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Performance Metrics
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Authority Rank</Typography>
                    <Chip 
                      label={authorityStatus.authorityRank > 0 ? `#${authorityStatus.authorityRank}` : 'Not Ranked'} 
                      size="small" 
                      color={authorityStatus.authorityRank > 0 ? 'primary' : 'default'} 
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Uptime</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {authorityStatus.uptime.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={authorityStatus.uptime} 
                    sx={{ height: 6, borderRadius: 3, mb: 2 }}
                  />
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">Validator Score</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {authorityStatus.validatorScore}/100
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={authorityStatus.validatorScore} 
                    color="secondary"
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>

                {/* Network Statistics */}
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Network Statistics
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Connected Peers
                      </Typography>
                      <Typography variant="h6">
                        {authorityStatus.connectedPeers}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Transactions Processed
                      </Typography>
                      <Typography variant="h6">
                        {authorityStatus.processedTransactions}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* APY Information */}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Estimated APY:</strong> 8-12% based on current network activity and your validator performance.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            /* Authority Logs */
            <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Authority Logs
                  </Typography>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoScroll}
                          onChange={(e) => setAutoScroll(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Auto-scroll"
                      sx={{ mr: 1 }}
                    />
                    <IconButton size="small" onClick={downloadLogs} disabled={logs.length === 0}>
                      <Download />
                    </IconButton>
                    <IconButton size="small" onClick={clearLogs} disabled={logs.length === 0}>
                      <Clear />
                    </IconButton>
                  </Box>
                </Box>
                
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    bgcolor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {logs.length === 0 ? (
                    <Box p={2} textAlign="center" color="text.secondary">
                      <Computer sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                      <Typography variant="body2">
                        No logs yet. Start your authority to see activity.
                      </Typography>
                    </Box>
                  ) : (
                    <List dense sx={{ py: 0 }}>
                      {logs.map((log, index) => (
                        <ListItem key={index} sx={{ py: 0.5, px: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                {getLogIcon(log.level)}
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </Typography>
                                <Chip label={log.category} size="small" variant="outlined" sx={{ minWidth: 80, fontSize: '0.7rem', height: 20 }} />
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                  {log.message}
                                </Typography>
                              </Box>
                            }
                            secondary={log.details && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 4, fontFamily: 'monospace' }}>
                                {log.details}
                              </Typography>
                            )}
                          />
                        </ListItem>
                      ))}
                      <div ref={logsEndRef} />
                    </List>
                  )}
                </Paper>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Lock Tokens Modal */}
      <Dialog open={lockModalOpen} onClose={() => setLockModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Lock color="primary" />
            <Typography variant="h6">Lock Tokens to Become Authority</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Lock XTZ tokens to become a MeshPay authority. Your tokens will be locked for the specified duration and you'll earn rewards for processing transactions.
          </Alert>
          
          <TextField
            fullWidth
            label="Lock Amount (XTZ)"
            value={lockAmount}
            onChange={(e) => setLockAmount(e.target.value)}
            type="number"
            sx={{ mb: 2 }}
            helperText="Minimum: 100 XTZ"
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Lock Duration</InputLabel>
            <Select
              value={lockDuration}
              onChange={(e) => setLockDuration(e.target.value)}
              label="Lock Duration"
            >
              <MenuItem value="7">7 days</MenuItem>
              <MenuItem value="30">30 days</MenuItem>
              <MenuItem value="90">90 days</MenuItem>
              <MenuItem value="180">180 days</MenuItem>
              <MenuItem value="365">1 year</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Expected Rewards:</Typography>
            <Typography variant="body2" color="text.secondary">
              • Base APY: 8-12% depending on network activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Transaction fees: 0.01-0.05 XTZ per transaction
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Bonus rewards for high uptime and reliability
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockModalOpen(false)} disabled={isLocking}>
            Cancel
          </Button>
          <Button 
            onClick={handleLockTokens}
            variant="contained"
            disabled={isLocking || parseFloat(lockAmount) < 100}
            startIcon={isLocking ? <CircularProgress size={16} /> : <Lock />}
          >
            {isLocking ? 'Locking...' : `Lock ${lockAmount} XTZ`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Authority; 