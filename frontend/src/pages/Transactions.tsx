import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Transactions: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Transactions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your transaction history and certificates
        </Typography>
      </Box>
      
      <Box textAlign="center" py={8}>
        <Typography variant="h5" color="text.secondary">
          Transactions page will be implemented here
        </Typography>
      </Box>
    </Container>
  );
};

export default Transactions; 