import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Tooltip, Card, CardContent } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, divIcon, LatLngBounds } from 'leaflet';
import { AuthorityInfo } from '../types/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers for Vite
const DefaultIcon = Icon.Default;
if (DefaultIcon.prototype._getIconUrl) {
  delete DefaultIcon.prototype._getIconUrl;
}

DefaultIcon.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Add global styles for animations
const addGlobalStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('network-map-styles')) {
    const style = document.createElement('style');
    style.id = 'network-map-styles';
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      
      .authority-marker {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .authority-marker:hover {
        transform: scale(1.1);
        z-index: 1000 !important;
      }
      
      .marker-online .pulse-dot {
        animation: pulse 2s infinite;
      }
      
      .marker-syncing .sync-indicator {
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .leaflet-popup-content-wrapper {
        background: rgba(26, 31, 46, 0.95) !important;
        backdrop-filter: blur(20px);
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .leaflet-popup-tip {
        background: rgba(26, 31, 46, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }
};

interface NetworkMapProps {
  authorities: AuthorityInfo[];
  onAuthorityClick?: (authority: AuthorityInfo) => void;
  height?: number | string;
}

// Convert arbitrary coordinates to real-world coordinates
const convertToRealCoordinates = (position: { x: number; y: number }, index: number): [number, number] => {
  // If coordinates seem to be in real-world range, use them directly
  if (Math.abs(position.x) <= 90 && Math.abs(position.y) <= 180) {
    return [position.x, position.y];
  }
  
  // Otherwise, map to realistic locations around major cities
  const cities = [
    [40.7128, -74.0060], // New York
    [51.5074, -0.1278],  // London
    [35.6762, 139.6503], // Tokyo
    [48.8566, 2.3522],   // Paris
    [52.5200, 13.4050],  // Berlin
    [37.7749, -122.4194], // San Francisco
    [55.7558, 37.6176],  // Moscow
    [39.9042, 116.4074], // Beijing
    [-33.8688, 151.2093], // Sydney
    [19.4326, -99.1332], // Mexico City
  ];
  
  const city = cities[index % cities.length];
  // Add some random offset to spread authorities around the city
  const offsetLat = (Math.random() - 0.5) * 0.2; // ±0.1 degree variation
  const offsetLng = (Math.random() - 0.5) * 0.2;
  
  return [city[0] + offsetLat, city[1] + offsetLng];
};

// Enhanced marker icons with status indicators
const createAuthorityIcon = (status: string, name: string, isHovered: boolean = false) => {
  const statusColors = {
    online: '#00B894',
    offline: '#E84393', 
    syncing: '#FDCB6E',
    unknown: '#6B7280'
  };
  
  const color = statusColors[status as keyof typeof statusColors] || '#6B7280';
  const size = isHovered ? 36 : 28;
  const shadow = isHovered ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.3)';
  
  const pulseIndicator = status === 'online' ? `
    <div class="pulse-dot" style="
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      background: #00FF88;
      border-radius: 50%;
      border: 2px solid white;
    "></div>
  ` : '';
  
  const syncIndicator = status === 'syncing' ? `
    <div class="sync-indicator" style="
      position: absolute;
      top: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      border: 2px solid #FDCB6E;
      border-top: 2px solid transparent;
      border-radius: 50%;
    "></div>
  ` : '';
  
  return divIcon({
    html: `
      <div class="marker-${status}" style="
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.35}px;
        font-weight: bold;
        color: white;
        position: relative;
        cursor: pointer;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        ${name.charAt(0).toUpperCase()}
        ${pulseIndicator}
        ${syncIndicator}
      </div>
    `,
    className: `authority-marker marker-${status}`,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
    popupAnchor: [0, -(size + 6) / 2],
  });
};

// Component to fit map to all authority positions
const FitToBounds: React.FC<{ authorities: AuthorityInfo[] }> = ({ authorities }) => {
  const map = useMap();

  useEffect(() => {
    if (authorities.length > 0) {
      const bounds = authorities
        .filter(auth => auth.position)
        .map((auth, index) => convertToRealCoordinates(auth.position!, index));
      
      if (bounds.length > 0) {
        const leafletBounds = new LatLngBounds(bounds);
        map.fitBounds(leafletBounds, { padding: [50, 50] });
      }
    }
  }, [authorities, map]);

  return null;
};

// Hover tooltip component
const AuthorityTooltip: React.FC<{ 
  authority: AuthorityInfo; 
  visible: boolean; 
  position: { x: number; y: number } 
}> = ({ authority, visible, position }) => {
  if (!visible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#00B894';
      case 'offline': return '#E84393';
      case 'syncing': return '#FDCB6E';
      default: return '#6B7280';
    }
  };

  return (
    <Card
      sx={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y - 10,
        zIndex: 1000,
        minWidth: 280,
        maxWidth: 320,
        background: 'rgba(26, 31, 46, 0.98)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 3,
        pointerEvents: 'none',
        transform: 'translateY(-50%)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid rgba(26, 31, 46, 0.98)',
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            {authority.name}
          </Typography>
          <Chip
            label={authority.status}
            size="small"
            sx={{
              backgroundColor: getStatusColor(authority.status),
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 600,
              height: 22,
              textTransform: 'capitalize',
            }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Host:</strong> {authority.address.ip_address}:{authority.address.port}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Shards:</strong> {authority.shards.length} active
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Committee:</strong> {authority.committee_members.length} members
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Stake:</strong> {authority.stake.toLocaleString()} tokens
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
          <strong>Last Seen:</strong> {new Date(authority.last_heartbeat).toLocaleString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

const NetworkMap: React.FC<NetworkMapProps> = ({ 
  authorities, 
  onAuthorityClick, 
  height = 400 
}) => {
  const [loading, setLoading] = useState(true);
  const [hoveredAuthority, setHoveredAuthority] = useState<AuthorityInfo | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    addGlobalStyles();
    // Simulate loading time for map initialization
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  // Default center (world view)
  const defaultCenter: [number, number] = [20, 0];
  const defaultZoom = 2;

  return (
    <Box position="relative">
      <Paper 
        sx={{ 
          height,
          overflow: 'hidden',
          background: 'rgba(26, 31, 46, 0.4)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* Dark theme tile layer with satellite option */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          
          {/* Authority markers */}
          {authorities
            .filter(authority => authority.position)
            .map((authority, index) => {
              const realCoords = convertToRealCoordinates(authority.position!, index);
              return (
                <Marker
                  key={authority.name}
                  position={realCoords}
                  icon={createAuthorityIcon(
                    authority.status, 
                    authority.name, 
                    hoveredAuthority?.name === authority.name
                  )}
                  eventHandlers={{
                    click: () => onAuthorityClick?.(authority),
                    mouseover: () => setHoveredAuthority(authority),
                    mouseout: () => setHoveredAuthority(null),
                  }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 280, p: 1 }}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {authority.name}
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
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

                      <Box mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Network Address:</strong><br />
                          {authority.address.ip_address}:{authority.address.port}
                        </Typography>
                      </Box>

                      <Box mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Managed Shards:</strong> {authority.shards.length}
                        </Typography>
                        {authority.shards.slice(0, 3).map((shard) => (
                          <Typography key={shard.shard_id} variant="caption" display="block" sx={{ ml: 1 }}>
                            • {shard.shard_id}: {shard.account_count} accounts, {shard.transaction_count} txns
                          </Typography>
                        ))}
                        {authority.shards.length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ... and {authority.shards.length - 3} more
                          </Typography>
                        )}
                      </Box>

                      <Box mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Committee:</strong> {authority.committee_members.length} members
                        </Typography>
                      </Box>

                      <Box mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Stake:</strong> {authority.stake.toLocaleString()} tokens
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        <strong>Last Heartbeat:</strong><br />
                        {new Date(authority.last_heartbeat).toLocaleString()}
                      </Typography>
                    </Box>
                  </Popup>
                </Marker>
              );
            })}
          
          {/* Fit bounds to show all authorities */}
          <FitToBounds authorities={authorities} />
        </MapContainer>
      </Paper>

      {/* Hover tooltip */}
      <AuthorityTooltip
        authority={hoveredAuthority!}
        visible={!!hoveredAuthority}
        position={mousePosition}
      />
    </Box>
  );
};

export default NetworkMap; 