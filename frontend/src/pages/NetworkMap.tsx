import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, Chip } from '@mui/material';
import { LocationOn, People, Security, Speed } from '@mui/icons-material';
import NetworkMap from '../components/NetworkMap';
import { AuthorityInfo } from '../types/api';

// Mock data for demonstration
const mockAuthorities: AuthorityInfo[] = [
  {
    name: 'Authority-NYC',
    address: {
      node_id: 'auth-nyc-001',
      ip_address: '192.168.1.10',
      port: 8080,
      node_type: 'authority'
    },
    position: { x: 40.7128, y: -74.0060, z: 0 }, // New York
    status: 'online',
    shards: [
      { shard_id: 'shard-001', account_count: 1250, total_transactions: 8934, total_stake: 1000000, last_sync: '2024-01-15T10:30:00Z', authorities: [] },
      { shard_id: 'shard-002', account_count: 980, total_transactions: 5672, total_stake: 1000000, last_sync: '2024-01-15T10:29:45Z', authorities: [] }
    ],
    committee_members: ['member-001', 'member-002', 'member-003'],
    last_heartbeat: '2024-01-15T10:30:15Z',
    performance_metrics: { latency: 45, throughput: 1200 },
    stake: 500000,
    network_info: { host: 'nyc.authority.network', port: 443 }
  },
  {
    name: 'Authority-LON',
    address: {
      node_id: 'auth-lon-001',
      ip_address: '192.168.1.11',
      port: 8080,
      node_type: 'authority'
    },
    position: { x: 51.5074, y: -0.1278, z: 0 }, // London
    status: 'online',
    shards: [
      { shard_id: 'shard-003', account_count: 1100, total_transactions: 7234, total_stake: 1000000, last_sync: '2024-01-15T10:29:50Z', authorities: [] }
    ],
    committee_members: ['member-004', 'member-005'],
    last_heartbeat: '2024-01-15T10:30:10Z',
    performance_metrics: { latency: 32, throughput: 1400 },
    stake: 750000,
    network_info: { host: 'lon.authority.network', port: 443 }
  },
  {
    name: 'Authority-TKY',
    address: {
      node_id: 'auth-tky-001',
      ip_address: '192.168.1.12',
      port: 8080,
      node_type: 'authority'
    },
    position: { x: 35.6762, y: 139.6503, z: 0 }, // Tokyo
    status: 'syncing',
    shards: [
      { shard_id: 'shard-004', account_count: 890, total_transactions: 4521, total_stake: 1000000, last_sync: '2024-01-15T10:28:30Z', authorities: [] },
      { shard_id: 'shard-005', account_count: 1340, total_transactions: 9876, total_stake: 1000000, last_sync: '2024-01-15T10:28:45Z', authorities: [] }
    ],
    committee_members: ['member-006', 'member-007', 'member-008', 'member-009'],
    last_heartbeat: '2024-01-15T10:29:45Z',
    performance_metrics: { latency: 78, throughput: 950 },
    stake: 420000,
    network_info: { host: 'tky.authority.network', port: 443 }
  },
  {
    name: 'Authority-SF',
    address: {
      node_id: 'auth-sf-001',
      ip_address: '192.168.1.13',
      port: 8080,
      node_type: 'authority'
    },
    position: { x: 37.7749, y: -122.4194, z: 0 }, // San Francisco
    status: 'online',
    shards: [
      { shard_id: 'shard-006', account_count: 1560, total_transactions: 12340, total_stake: 1000000, last_sync: '2024-01-15T10:30:05Z', authorities: [] }
    ],
    committee_members: ['member-010', 'member-011'],
    last_heartbeat: '2024-01-15T10:30:12Z',
    performance_metrics: { latency: 28, throughput: 1650 },
    stake: 820000,
    network_info: { host: 'sf.authority.network', port: 443 }
  },
  {
    name: 'Authority-BER',
    address: {
      node_id: 'auth-ber-001',
      ip_address: '192.168.1.14',
      port: 8080,
      node_type: 'authority'
    },
    position: { x: 52.5200, y: 13.4050, z: 0 }, // Berlin
    status: 'offline',
    shards: [
      { shard_id: 'shard-007', account_count: 720, total_transactions: 3456, total_stake: 1000000, last_sync: '2024-01-15T10:25:20Z', authorities: [] }
    ],
    committee_members: ['member-012'],
    last_heartbeat: '2024-01-15T10:25:30Z',
    performance_metrics: { latency: 0, throughput: 0 },
    stake: 300000,
    network_info: { host: 'ber.authority.network', port: 443 }
  }
];

const NetworkMapPage: React.FC = () => {
  const [authorities, setAuthorities] = useState<AuthorityInfo[]>(mockAuthorities);
  const [selectedAuthority, setSelectedAuthority] = useState<AuthorityInfo | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAuthorities(prevAuthorities => 
        prevAuthorities.map(auth => ({
          ...auth,
          last_heartbeat: new Date().toISOString(),
          performance_metrics: {
            ...auth.performance_metrics,
            latency: auth.status === 'online' ? Math.floor(Math.random() * 100) + 20 : 0,
            throughput: auth.status === 'online' ? Math.floor(Math.random() * 1000) + 500 : 0
          }
        }))
      );
    }, 5000); // Update every 5 seconds

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
    const totalShards = authorities.reduce((sum, auth) => sum + auth.shards.length, 0);
    const totalAccounts = authorities.reduce((sum, auth) => 
      sum + auth.shards.reduce((shardSum, shard) => shardSum + shard.account_count, 0), 0
    );
    const totalTransactions = authorities.reduce((sum, auth) => 
      sum + auth.shards.reduce((shardSum, shard) => shardSum + shard.total_transactions, 0), 0
    );
    const totalStake = authorities.reduce((sum, auth) => sum + auth.stake, 0);
    
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
          Real-time geographical view of SmartPay authorities across the network. Hover over markers for detailed information.
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