import React from 'react';
import { Paper, Typography, Box, Avatar } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = '#00D2FF',
  subtitle 
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        background: 'rgba(26, 31, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px rgba(0, 210, 255, 0.1)`,
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography 
            variant="h4" 
            component="div" 
            fontWeight="bold"
            sx={{ color }}
          >
            {value}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.primary" 
            fontWeight={500}
            mb={subtitle ? 0.5 : 0}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}20`,
            color: color,
            width: 56,
            height: 56,
          }}
        >
          {icon}
        </Avatar>
      </Box>
    </Paper>
  );
};

export default StatCard; 