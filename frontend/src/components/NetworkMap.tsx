import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Tooltip, Card, CardContent, Avatar } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, divIcon, LatLngBounds } from 'leaflet';
import { AuthorityInfo } from '../types/api';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers for Vite
const defaultIcon = new Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
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
      
      @keyframes shardPulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 0.6; }
        100% { transform: scale(1); opacity: 0.8; }
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      
      .shard-marker {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }
      
      .shard-marker:hover {
        transform: scale(1.15);
        z-index: 1000 !important;
      }
      
      .shard-active .shard-pulse {
        animation: shardPulse 3s infinite;
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

interface ShardCluster {
  id: string;
  name: string;
  center: [number, number];
  color: string;
  authorities: AuthorityInfo[];
  totalStake: number;
  totalTransactions: number;
  averagePerformance: number;
}

// Default fallback location (will be replaced with user's location)
const DEFAULT_LOCATION: [number, number] = [40.7589, -73.9851]; // Central Park, NYC (fallback)
const MAP_RADIUS = 100; // 100 meters

// Shard colors and names
const SHARD_COLORS = [
  '#00D2FF', // Cyan
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
];

const SHARD_NAMES = [
  'Alpha Shard',
  'Beta Shard', 
  'Gamma Shard',
  'Delta Shard',
  'Epsilon Shard'
];

// Create shard marker icon
const createShardIcon = (shard: ShardCluster, isHovered: boolean = false) => {
  const size = isHovered ? 60 : 48;
  const shadow = isHovered ? '0 12px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.4)';
  const onlineCount = shard.authorities.filter(auth => auth.status === 'online').length;
  const totalCount = shard.authorities.length;
  
  return divIcon({
    html: `
      <div class="shard-active" style="
        background: linear-gradient(135deg, ${shard.color}dd 0%, ${shard.color}aa 100%);
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: ${shadow};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.25}px;
        font-weight: bold;
        color: white;
        position: relative;
        cursor: pointer;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div class="shard-pulse" style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid ${shard.color}66;
        "></div>
        <div style="font-size: ${size * 0.2}px; line-height: 1;">${shard.name.split(' ')[0]}</div>
        <div style="font-size: ${size * 0.15}px; opacity: 0.9;">${onlineCount}/${totalCount}</div>
      </div>
    `,
    className: `shard-marker shard-active`,
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -(size + 8) / 2],
  });
};

// Position authorities around their shard center
const getAuthorityPosition = (shard: ShardCluster, authorityIndex: number): [number, number] => {
  const authCount = shard.authorities.length;
  if (authCount === 1) return shard.center;
  
  const angle = (authorityIndex * 2 * Math.PI) / authCount;
  const distance = 0.0003; // About 30 meters from shard center
  const lat = shard.center[0] + Math.cos(angle) * distance;
  const lng = shard.center[1] + Math.sin(angle) * distance;
  
  return [lat, lng];
};

// Enhanced marker icons with status indicators
const createAuthorityIcon = (status: string, name: string, shardColor: string, isHovered: boolean = false) => {
  const statusColors = {
    online: '#00B894',
    offline: '#E84393', 
    syncing: '#FDCB6E',
    unknown: '#6B7280'
  };
  
  const color = statusColors[status as keyof typeof statusColors] || '#6B7280';
  const size = isHovered ? 28 : 22;
  const shadow = isHovered ? '0 6px 18px rgba(0,0,0,0.4)' : '0 3px 10px rgba(0,0,0,0.3)';
  
  const pulseIndicator = status === 'online' ? `
    <div class="pulse-dot" style="
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background: #00FF88;
      border-radius: 50%;
      border: 1px solid white;
    "></div>
  ` : '';
  
  const syncIndicator = status === 'syncing' ? `
    <div class="sync-indicator" style="
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
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
        border: 2px solid ${shardColor};
        box-shadow: ${shadow};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.4}px;
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
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
    popupAnchor: [0, -(size + 4) / 2],
  });
};

// Component to fit map to show the 100m area
const FitToArea: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    // Set view to show the 100m area around the user's location
    map.setView(center, 18); // Zoom level 18 shows about 100m area
  }, [map, center]);

  return null;
};

// Hover tooltip component for shards
const ShardTooltip: React.FC<{ 
  shard: ShardCluster | null; 
  visible: boolean; 
  position: { x: number; y: number } 
}> = ({ shard, visible, position }) => {
  if (!visible || !shard) return null;

  const onlineCount = shard.authorities.filter(auth => auth.status === 'online').length;
  const offlineCount = shard.authorities.filter(auth => auth.status === 'offline').length;
  const syncingCount = shard.authorities.filter(auth => auth.status === 'syncing').length;

  return (
    <Card
      sx={{
        position: 'fixed',
        left: position.x + 15,
        top: position.y - 10,
        zIndex: 1000,
        minWidth: 300,
        maxWidth: 350,
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
          <Avatar 
            sx={{ 
              width: 28, 
              height: 28, 
              bgcolor: shard.color,
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}
          >
            {shard.name.charAt(0)}
          </Avatar>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            {shard.name}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={1} sx={{ opacity: 0.9 }}>
          <strong>Authorities:</strong> {shard.authorities.length} total
        </Typography>
        
        <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
          {onlineCount > 0 && (
            <Chip 
              label={`${onlineCount} Online`}
              size="small"
              sx={{ bgcolor: '#00B894', color: 'white', fontSize: '0.7rem' }}
            />
          )}
          {syncingCount > 0 && (
            <Chip 
              label={`${syncingCount} Syncing`}
              size="small"
              sx={{ bgcolor: '#FDCB6E', color: 'white', fontSize: '0.7rem' }}
            />
          )}
          {offlineCount > 0 && (
            <Chip 
              label={`${offlineCount} Offline`}
              size="small"
              sx={{ bgcolor: '#E84393', color: 'white', fontSize: '0.7rem' }}
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Total Stake:</strong> {shard.totalStake.toLocaleString()} tokens
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={0.7} sx={{ opacity: 0.9 }}>
          <strong>Transactions:</strong> {shard.totalTransactions.toLocaleString()}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
          <strong>Performance:</strong> {shard.averagePerformance.toFixed(1)}%
        </Typography>

        <Box mt={1.5}>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
            Authority Members:
          </Typography>
          {shard.authorities.slice(0, 3).map((auth) => (
            <Typography key={auth.name} variant="caption" display="block" sx={{ ml: 1, opacity: 0.8 }}>
              • {auth.name} - {auth.status} ({auth.stake.toLocaleString()} tokens)
            </Typography>
          ))}
          {shard.authorities.length > 3 && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, opacity: 0.6 }}>
              ... and {shard.authorities.length - 3} more
            </Typography>
          )}
        </Box>
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
  const [hoveredShard, setHoveredShard] = useState<ShardCluster | null>(null);
  const [hoveredAuthority, setHoveredAuthority] = useState<AuthorityInfo | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const mapRef = useRef<L.Map | null>(null);

  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    addGlobalStyles();
    
    // Get user's location
    const getLocation = () => {
      if (!navigator?.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLocationError(null);

      const handleSuccess = (position: GeolocationPosition) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLoading(false);
      };

      const handleError = (error: GeolocationPositionError) => {
        let errorMessage = 'Error getting location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += error.message;
        }
        console.warn(errorMessage);
        setLocationError(errorMessage);
        setLoading(false);
      };

      try {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleError,
          {
            enableHighAccuracy: false, // Set to false for faster response
            timeout: 10000, // Increased timeout to 10 seconds
            maximumAge: 60000 // Allow cached positions up to 1 minute old
          }
        );
      } catch (e) {
        console.error('Unexpected error getting location:', e);
        setLocationError('Unexpected error getting location. Using default location.');
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Create 5 shards positioned around the user's location
  const createShardClusters = (authorities: AuthorityInfo[]): ShardCluster[] => {
    const shards: ShardCluster[] = [];
    const authoritiesPerShard = Math.ceil(authorities.length / 5);

    for (let i = 0; i < 5; i++) {
      // Position shards in a pentagon around the center
      const angle = (i * 2 * Math.PI) / 5;
      const distance = 0.0008; // About 80-90 meters from center
      const lat = userLocation[0] + Math.cos(angle) * distance;
      const lng = userLocation[1] + Math.sin(angle) * distance;

      const shardAuthorities = authorities.slice(i * authoritiesPerShard, (i + 1) * authoritiesPerShard);
      const totalStake = shardAuthorities.reduce((sum, auth) => sum + auth.stake, 0);
      const totalTransactions = shardAuthorities.reduce((sum, auth) => 
        sum + auth.shards.reduce((shardSum, shard) => shardSum + shard.transaction_count, 0), 0);
      const averagePerformance = shardAuthorities.length > 0 
        ? Object.values(shardAuthorities[0]?.performance_metrics || {}).reduce((a, b) => a + b, 0) / 
          Object.keys(shardAuthorities[0]?.performance_metrics || {}).length || 0
        : 0;

      shards.push({
        id: `shard-${i}`,
        name: SHARD_NAMES[i],
        center: [lat, lng],
        color: SHARD_COLORS[i],
        authorities: shardAuthorities,
        totalStake,
        totalTransactions,
        averagePerformance,
      });
    }

    return shards;
  };

  const shardClusters = createShardClusters(authorities);

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
            Loading shard network map...
          </Typography>
        </Box>
      </Paper>
    );
  }

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
          center={userLocation}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* High detail satellite tile layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            maxZoom={20}
          />
          
          {/* 100m radius circle to show the area boundary */}
          <Circle
            center={userLocation}
            radius={MAP_RADIUS}
            pathOptions={{
              color: '#00D2FF',
              weight: 2,
              opacity: 0.6,
              fillColor: '#00D2FF',
              fillOpacity: 0.1,
            }}
          />
          
          {/* Shard markers */}
          {shardClusters.map((shard) => (
            <Marker
              key={shard.id}
              position={shard.center}
              icon={createShardIcon(shard, hoveredShard?.id === shard.id)}
              eventHandlers={{
                mouseover: () => setHoveredShard(shard),
                mouseout: () => setHoveredShard(null),
                click: () => {
                  // Focus on the shard and show popup with details
                },
              }}
            >
              <Popup>
                <Box sx={{ minWidth: 280, p: 1 }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    {shard.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    <strong>Authorities:</strong> {shard.authorities.length}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" mb={1}>
                    <strong>Total Stake:</strong> {shard.totalStake.toLocaleString()} tokens
                  </Typography>

                  <Typography variant="body2" color="text.secondary" mb={1}>
                    <strong>Total Transactions:</strong> {shard.totalTransactions.toLocaleString()}
                  </Typography>

                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      <strong>Member Authorities:</strong>
                    </Typography>
                    {shard.authorities.map((auth) => (
                      <Typography key={auth.name} variant="caption" display="block" sx={{ ml: 1 }}>
                        • {auth.name} - {auth.status} ({auth.stake.toLocaleString()} tokens)
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Popup>
            </Marker>
          ))}
          
          {/* Individual authority markers around their shards */}
          {shardClusters.map((shard: ShardCluster) => 
            shard.authorities.map((authority: AuthorityInfo, authorityIndex: number) => {
              const position = getAuthorityPosition(shard, authorityIndex);
              return (
                <Marker
                  key={`${shard.id}-${authority.name}`}
                  position={position}
                  icon={createAuthorityIcon(
                    authority.status, 
                    authority.name,
                    shard.color,
                    hoveredAuthority?.name === authority.name
                  )}
                  eventHandlers={{
                    click: () => onAuthorityClick?.(authority),
                    mouseover: () => setHoveredAuthority(authority),
                    mouseout: () => setHoveredAuthority(null),
                  }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 260, p: 1 }}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {authority.name}
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Chip
                          label={authority.status}
                          size="small"
                          sx={{
                            backgroundColor: shard.color,
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Member of {shard.name}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Stake:</strong> {authority.stake.toLocaleString()} tokens
                      </Typography>

                      <Typography variant="body2" color="text.secondary" mb={1}>
                        <strong>Managed Shards:</strong> {authority.shards.length}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        <strong>Last Heartbeat:</strong><br />
                        {new Date(authority.last_heartbeat).toLocaleString()}
                      </Typography>
                    </Box>
                  </Popup>
                </Marker>
              );
            })
          )}
          
          {/* Fit view to the defined area */}
          <FitToArea center={userLocation} />
        </MapContainer>
      </Paper>

      {/* Shard hover tooltip */}
      <ShardTooltip
        shard={hoveredShard}
        visible={!!hoveredShard}
        position={mousePosition}
      />
    </Box>
  );
};

export default NetworkMap; 