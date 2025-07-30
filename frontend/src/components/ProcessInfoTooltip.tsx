import { Tooltip, Box, Typography, IconButton } from '@mui/material';
import { Info } from '@mui/icons-material';

const ProcessInfoTooltip: React.FC = () => {
    return (
      <Tooltip
        title={
          <Box sx={{ p: 1, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
              🔐 MeshPay Transaction Process
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>Step 1:</strong> Authorities verify your transaction locally
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>Step 2:</strong> Collect certificates from 2/3 of authorities
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <strong>Step 3:</strong> Broadcast confirmation to finalize
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1, display: 'block' }}>
                💡 This ensures offline payments work without internet!
              </Typography>
            </Box>
          </Box>
        }
        arrow
        placement="top"
        PopperProps={{
          sx: {
            '& .MuiTooltip-tooltip': {
              backgroundColor: 'rgba(26, 31, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              fontSize: '0.875rem',
              maxWidth: 350,
            },
            '& .MuiTooltip-arrow': {
              color: 'rgba(26, 31, 46, 0.95)',
            },
          },
        }}
      >
        <IconButton
          size="small"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              color: 'rgba(0, 210, 255, 0.8)',
            },
          }}
        >
          <Info fontSize="small" />
        </IconButton>
      </Tooltip>
    );
  };

export default ProcessInfoTooltip;