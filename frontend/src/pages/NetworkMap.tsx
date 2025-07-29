import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, Chip } from '@mui/material';
import { LocationOn, People, Security, Speed } from '@mui/icons-material';
import NetworkMap from '../components/NetworkMap';
import { AuthorityInfo, NetworkMetrics, ShardInfo } from '../types/api';
import { apiService } from '../services/api';

const NetworkMapPage: React.FC = () => {
  const [authorities, setAuthorities] = useState<AuthorityInfo[]>([]);
  const [shards, setShards] = useState<ShardInfo[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shards, authorities, metrics] = await Promise.all([
        apiService.getShards(),
        apiService.getAuthorities(),
        apiService.getNetworkMetrics(),
      ]);
      setAuthorities(authorities);
      setShards(shards);
      setNetworkMetrics(metrics);
    } catch (error) {
      console.error('Error loading network map data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);


  const handleAuthorityClick = (authority: AuthorityInfo) => {
    setSelectedAuthority(authority);
  };

  const getStatusStats = () => {
    const online = authorities.filter(a => a.status === 'online').length;
    const syncing = authorities.filter(a => a.status === 'syncing').length;
    const offline = authorities.filter(a => a.status === 'offline').length;
    
    return { online, syncing, offline };
  };

  const getTotalStats = () => {
    const totalShards = shards.length;
    const totalAccounts = shards.reduce((sum, shard) => 
      sum + shard.account_count, 0
    );
    const totalTransactions = shards.reduce((sum, shard) => 
      sum + shard.total_transactions, 0
    );
    const totalStake = shards.reduce((sum, shard) => sum + shard.total_stake, 0);
    
    return { totalShards, totalAccounts, totalTransactions, totalStake };
  };

  const statusStats = getStatusStats();
  const totalStats = getTotalStats();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Global Authority Network Map
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time geographical view of MeshPay authorities across the network. Hover over markers for detailed information.
        </Typography>
      </Box>

      {/* Network Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <LocationOn sx={{ color: '#00D2FF', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {authorities.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Authorities
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <People sx={{ color: '#00B894', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#00B894' }}>
                    {statusStats.online}
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
          <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Security sx={{ color: '#6C5CE7', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#6C5CE7' }}>
                    {totalStats.totalShards}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Shards
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'rgba(26, 31, 46, 0.4)', backdropFilter: 'blur(20px)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Speed sx={{ color: '#FDCB6E', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#FDCB6E' }}>
                    {totalStats.totalStake.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Stake
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Legend */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Authority Status
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Chip 
            label={`Online (${statusStats.online})`} 
            sx={{ backgroundColor: '#00B894', color: 'white' }} 
          />
          <Chip 
            label={`Syncing (${statusStats.syncing})`} 
            sx={{ backgroundColor: '#FDCB6E', color: 'white' }} 
          />
          <Chip 
            label={`Offline (${statusStats.offline})`} 
            sx={{ backgroundColor: '#E84393', color: 'white' }} 
          />
        </Box>
      </Box>

      {/* Interactive Map */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={selectedAuthority ? 8 : 12}>
          <NetworkMap
            authorities={authorities}
            onAuthorityClick={handleAuthorityClick}
            height="600px"
          />
        </Grid>

        {/* Authority Details Panel */}
        {selectedAuthority && (
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              background: 'rgba(26, 31, 46, 0.4)', 
              backdropFilter: 'blur(20px)',
              height: '600px',
              overflow: 'auto'
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Typography variant="h5" color="primary">
                    {selectedAuthority.name}
                  </Typography>
                  <Chip
                    label={selectedAuthority.status}
                    size="small"
                    sx={{
                      backgroundColor: 
                        selectedAuthority.status === 'online' ? '#00B894' :
                        selectedAuthority.status === 'syncing' ? '#FDCB6E' : '#E84393',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>

                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>Network Information</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Address:</strong> {selectedAuthority.address.ip_address}:{selectedAuthority.address.port}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Host:</strong> {selectedAuthority.network_info.host}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Node ID:</strong> {selectedAuthority.address.node_id}
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Latency:</strong> {selectedAuthority.performance_metrics.latency}ms
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Throughput:</strong> {selectedAuthority.performance_metrics.throughput} tx/s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Stake:</strong> {selectedAuthority.stake.toLocaleString()} tokens
                  </Typography>
                </Box>

                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>Managed Shards ({selectedAuthority.shards.length})</Typography>
                  {selectedAuthority.shards.map((shard) => (
                    <Box key={shard.shard_id} mb={2} p={2} sx={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      borderRadius: 1 
                    }}>
                      <Typography variant="body2" color="primary" gutterBottom>
                        {shard.shard_id}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Accounts: {shard.account_count.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Transactions: {shard.total_transactions.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Last Sync: {new Date(shard.last_sync).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>Committee Members ({selectedAuthority.committee_members.length})</Typography>
                  {selectedAuthority.committee_members.map((member, index) => (
                    <Chip 
                      key={member} 
                      label={member} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>

                <Box mt={3} pt={2} sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Heartbeat:</strong><br />
                    {new Date(selectedAuthority.last_heartbeat).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default NetworkMapPage; 