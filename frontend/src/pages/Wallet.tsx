import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Wallet: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Wallet
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your USDT and USDC balances
        </Typography>
      </Box>
      
      <Box textAlign="center" py={8}>
        <Typography variant="h5" color="text.secondary">
          Wallet page will be implemented here
        </Typography>
      </Box>
    </Container>
  );
};

export default Wallet; 