import React, { useEffect, useRef } from 'react';
import { Box, Typography, Chip, Card, CardContent } from '@mui/material';
import { Circle, NetworkCheck, Error, Sync } from '@mui/icons-material';

interface AuthorityInfo {
  name: string;
  address: string;
  status: 'online' | 'offline' | 'syncing';
  stake: number;
  network_info: {
    host: string;
    port: number;
  };
}

interface AuthorityStatusMapProps {
  authorities: AuthorityInfo[];
}

const AuthorityStatusMap: React.FC<AuthorityStatusMapProps> = ({ authorities }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || authorities.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw network topology
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;

    // Draw connections between authorities
    authorities.forEach((authority, index) => {
      const angle = (index / authorities.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      // Draw line to center
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = authority.status === 'online' ? '#00D2FF' : '#666';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw authority node
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = 
        authority.status === 'online' ? '#00B894' :
        authority.status === 'syncing' ? '#FDCB6E' : '#E84393';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw authority name
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(authority.name, x, y + 25);
    });

    // Draw center node
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#6C5CE7';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Network', centerX, centerY - 35);
  }, [authorities]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Circle sx={{ color: '#00B894', fontSize: 12 }} />;
      case 'syncing':
        return <Sync sx={{ color: '#FDCB6E', fontSize: 12 }} />;
      case 'offline':
        return <Error sx={{ color: '#E84393', fontSize: 12 }} />;
      default:
        return <Circle sx={{ color: '#666', fontSize: 12 }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'syncing':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Canvas for network visualization */}
      <Box
        flex={1}
        position="relative"
        minHeight={300}
        sx={{
          background: 'linear-gradient(135deg, #0F1419 0%, #16213E 100%)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        
        {authorities.length === 0 && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            sx={{ transform: 'translate(-50%, -50%)' }}
          >
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No authorities available
            </Typography>
          </Box>
        )}
      </Box>

      {/* Authority status legend */}
      {authorities.length > 0 && (
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Authority Status
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {authorities.map((authority) => (
              <Chip
                key={authority.name}
                icon={getStatusIcon(authority.status)}
                label={authority.name}
                color={getStatusColor(authority.status)}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AuthorityStatusMap; 