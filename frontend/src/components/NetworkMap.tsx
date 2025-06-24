import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import { AuthorityInfo } from '../types/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface NetworkMapProps {
  authorities: AuthorityInfo[];
  onAuthorityClick?: (authority: AuthorityInfo) => void;
  height?: number | string;
}

// Custom marker icons for different authority states
const createAuthorityIcon = (status: string, name: string) => {
  const color = {
    online: '#00B894',
    offline: '#E84393',
    syncing: '#FDCB6E',
    unknown: '#6B7280'
  }[status] || '#6B7280';

  return divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
      ">
        ${name.charAt(0).toUpperCase()}
      </div>
    `,
    className: 'authority-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

// Component to fit map to all authority positions
const FitToBounds: React.FC<{ authorities: AuthorityInfo[] }> = ({ authorities }) => {
  const map = useMap();

  useEffect(() => {
    if (authorities.length > 0) {
      const bounds = authorities
        .filter(auth => auth.position)
        .map(auth => [auth.position!.x, auth.position!.y] as [number, number]);
      
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [authorities, map]);

  return null;
};

const NetworkMap: React.FC<NetworkMapProps> = ({ 
  authorities, 
  onAuthorityClick, 
  height = 400 
}) => {
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Simulate loading time for map initialization
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00B894';
      case 'offline': return '#E84393';
      case 'syncing': return '#FDCB6E';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'syncing': return 'Syncing';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Paper 
        sx={{ 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(26, 31, 46, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box textAlign="center">
          <CircularProgress sx={{ color: '#00D2FF', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading network map...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Default center if no authorities with positions
  const defaultCenter: [number, number] = [0, 0];
  const defaultZoom = 2;

  return (
    <Paper 
      sx={{ 
        height,
        overflow: 'hidden',
        background: 'rgba(26, 31, 46, 0.4)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        {/* Dark theme tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Authority markers */}
        {authorities
          .filter(authority => authority.position)
          .map((authority) => (
            <Marker
              key={authority.name}
              position={[authority.position!.x, authority.position!.y]}
              icon={createAuthorityIcon(authority.status, authority.name)}
              eventHandlers={{
                click: () => onAuthorityClick?.(authority),
              }}
            >
              <Popup>
                <Box sx={{ minWidth: 200, p: 1 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {authority.name}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Chip
                      label={getStatusLabel(authority.status)}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(authority.status),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Address:</strong> {authority.address.ip_address}:{authority.address.port}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Shards:</strong> {authority.shards.length}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Committee Members:</strong> {authority.committee_members.length}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Heartbeat:</strong> {new Date(authority.last_heartbeat).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}
        
        {/* Fit map to show all authorities */}
        <FitToBounds authorities={authorities} />
      </MapContainer>
    </Paper>
  );
};

export default NetworkMap; 