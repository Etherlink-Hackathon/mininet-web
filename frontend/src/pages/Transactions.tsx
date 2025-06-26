import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Pending,
  ContentCopy,
  Download,
  FilterList,
  Search,
  Receipt,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { TransactionRecord, Certificate } from '../types/api';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [filterToken, setFilterToken] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const historyData = await apiService.getTransactionHistory();
      setTransactions(Array.isArray(historyData) ? historyData : []);
      setError(null);
    } catch (err) {
      setError(apiService.handleApiError(err));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = async (transactionId: string) => {
    try {
      const certificate = await apiService.getTransactionCertificate(transactionId);
      setSelectedCertificate(certificate);
      setCertificateDialogOpen(true);
    } catch (err) {
      setError(apiService.handleApiError(err));
    }
  };

  const handleCopyCertificateId = () => {
    if (selectedCertificate) {
      navigator.clipboard.writeText(selectedCertificate.certificate_id);
    }
  };

  const handleDownloadCertificate = () => {
    if (selectedCertificate) {
      const certificateJson = JSON.stringify(selectedCertificate, null, 2);
      const blob = new Blob([certificateJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${selectedCertificate.certificate_id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

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

  const isTransactionRecord = (tx: any): tx is TransactionRecord => {
    return tx 
      && typeof tx === 'object'
      && 'transaction_id' in tx
      && 'transfer_order' in tx
      && 'status' in tx
      && 'created_at' in tx;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (!isTransactionRecord(tx)) return false;
    
    const matchesToken = filterToken === 'all' || tx.transfer_order.token === filterToken;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      tx.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.transfer_order.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesToken && matchesStatus && matchesSearch;
  });

  const getNetworkStats = () => {
    const total = transactions.length;
    const confirmed = transactions.filter(tx => tx.status === 'confirmed').length;
    const failed = transactions.filter(tx => ['failed', 'timeout'].includes(tx.status)).length;
    const pending = transactions.filter(tx => tx.status === 'pending').length;

    return { total, confirmed, failed, pending };
  };

  const stats = getNetworkStats();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Transactions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your transaction history and certificates
        </Typography>
      </Box>

      {error && (
        <Box mb={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Transaction Stats */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Transactions</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.main">Confirmed</Typography>
              <Typography variant="h4">{stats.confirmed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main">Pending</Typography>
              <Typography variant="h4">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error.main">Failed</Typography>
              <Typography variant="h4">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Search by ID or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Token"
              value={filterToken}
              onChange={(e) => setFilterToken(e.target.value)}
            >
              <MenuItem value="all">All Tokens</MenuItem>
              <MenuItem value="USDT">USDT</MenuItem>
              <MenuItem value="USDC">USDC</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="timeout">Timeout</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Transaction ID</TableCell>
              <TableCell>Token</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Recipient</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Certificate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.transaction_id}>
                  <TableCell>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={tx.transaction_id}>
                      <Typography>
                        {tx.transaction_id.slice(0, 8)}...{tx.transaction_id.slice(-8)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{tx.transfer_order.token}</TableCell>
                  <TableCell>${formatAmount(tx.transfer_order.amount)}</TableCell>
                  <TableCell>
                    <Tooltip title={tx.transfer_order.recipient}>
                      <Typography>
                        {tx.transfer_order.recipient.slice(0, 6)}...{tx.transfer_order.recipient.slice(-4)}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{getStatusChip(tx.status)}</TableCell>
                  <TableCell>
                    {tx.status === 'confirmed' && (
                      <Button
                        startIcon={<Receipt />}
                        size="small"
                        onClick={() => handleViewCertificate(tx.transaction_id)}
                      >
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Certificate Dialog */}
      <Dialog
        open={certificateDialogOpen}
        onClose={() => setCertificateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Transaction Certificate</Typography>
            <Box>
              <Tooltip title="Copy Certificate ID">
                <IconButton onClick={handleCopyCertificateId} size="small">
                  <ContentCopy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download Certificate">
                <IconButton onClick={handleDownloadCertificate} size="small">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCertificate && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Certificate ID</Typography>
              <Typography variant="body2" gutterBottom color="text.secondary">
                {selectedCertificate.certificate_id}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Transaction Details</Typography>
              <Typography variant="body2" gutterBottom color="text.secondary">
                Amount: ${formatAmount(selectedCertificate.transfer_order.amount)} {selectedCertificate.transfer_order.token}
              </Typography>
              <Typography variant="body2" gutterBottom color="text.secondary">
                Recipient: {selectedCertificate.transfer_order.recipient}
              </Typography>
              <Typography variant="body2" gutterBottom color="text.secondary">
                Date: {new Date(selectedCertificate.issued_at).toLocaleString()}
              </Typography>

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Authority Signatures</Typography>
              <Box sx={{ mt: 1 }}>
                {selectedCertificate.authority_signatures.map((sig, index) => (
                  <Chip
                    key={index}
                    label={`${sig.authority_name} (${new Date(sig.timestamp).toLocaleTimeString()})`}
                    size="small"
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertificateDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Transactions; 