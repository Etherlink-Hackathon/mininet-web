import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const NetworkMap: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Network Map
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive map of FastPay authorities in the network
        </Typography>
      </Box>
      
      <Box textAlign="center" py={8}>
        <Typography variant="h5" color="text.secondary">
          Network Map page will be implemented here
        </Typography>
      </Box>
    </Container>
  );
};

export default NetworkMap; 