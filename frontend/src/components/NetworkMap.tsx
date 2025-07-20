import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress, Tooltip, Card, CardContent, Avatar, IconButton } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, divIcon, LatLngBounds, LatLng } from 'leaflet';
import CloseIcon from '@mui/icons-material/Close';
import { AuthorityInfo, ShardInfo } from '../types/api';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_LOCATION, SHARD_RADIUS, SHARD_SPACING, SHARD_COLORS, SHARD_NAMES } from '../config/map';
import { apiService } from '../services/api';


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

// Create shard marker icon
const createShardIcon = (shard: ShardInfo, isHovered: boolean = false) => {
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
        <div style="font-size: ${size * 0.2}px; line-height: 1;">${shard.shard_id.split(' ')[0]}</div>
        <div style="font-size: ${size * 0.15}px; opacity: 0.9;">${onlineCount}/${totalCount}</div>
      </div>
    `,
    className: `shard-marker shard-active`,
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
    popupAnchor: [0, -(size + 8) / 2],
  });
};

// Position authorities around their shard center in a spiral pattern
const getAuthorityPosition = (shard: ShardInfo, authorityIndex: number): [number, number] => {
  const authCount = shard.authorities.length;
  if (authCount === 1) return shard.center || [0, 0];
  
  // Create a spiral pattern
  const spiralAngle = (authorityIndex * 2.4); // Golden angle in radians
  const spiralRadius = (SHARD_RADIUS * 0.8 * (authorityIndex + 1)) / (authCount * 1.5) / 111000; // Convert meters to degrees
  const lat = shard.center?.[0] || 0 + Math.cos(spiralAngle) * spiralRadius;
  const lng = shard.center?.[1] || 0 + Math.sin(spiralAngle) * spiralRadius * Math.cos((shard.center?.[0] || 0) * Math.PI / 180);
  
  return [lat, lng];
};

// Create authority marker icon
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
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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

const ShardTooltip: React.FC<{ 
  shard: ShardInfo | null; 
  visible: boolean; 
  position: { x: number; y: number };
  onClose: () => void;
}> = ({ shard, visible, position, onClose }) => {
  if (!visible || !shard) return null;

  const onlineAuthorities = shard.authorities.filter(a => a.status === 'online');
  const offlineAuthorities = shard.authorities.filter(a => a.status === 'offline');
  const syncingAuthorities = shard.authorities.filter(a => a.status === 'syncing');

  return (
    <Card
      sx={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        width: 400,
        maxHeight: '80vh',
        overflow: 'auto',
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        color: 'white',
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
        backdropFilter: 'blur(20px)',
      }}>
        <Box>
          <Typography variant="h6" sx={{ color: shard.color, mb: 0.5 }}>
            {shard.shard_id}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {shard.authorities.length} Total Authorities
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <CardContent sx={{ p: 2 }}>
        {/* Shard Overview */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: shard.color }}>
            Shard Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Total Stake</Typography>
              <Typography variant="h6">{shard.total_stake.toLocaleString()} XTZ</Typography>
            </Paper>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Transactions</Typography>
              <Typography variant="h6">{shard.total_transactions.toLocaleString()}</Typography>
            </Paper>
            <Paper sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>Range</Typography>
              <Typography variant="h6">100m</Typography>
            </Paper>
          </Box>
        </Box>

        {/* Authority Status Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: shard.color }}>
            Authority Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`${onlineAuthorities.length} Online`}
              size="small"
              sx={{ bgcolor: '#00B894', color: 'white' }}
            />
            {syncingAuthorities.length > 0 && (
              <Chip 
                label={`${syncingAuthorities.length} Syncing`}
                size="small"
                sx={{ bgcolor: '#FDCB6E', color: 'white' }}
              />
            )}
            {offlineAuthorities.length > 0 && (
              <Chip 
                label={`${offlineAuthorities.length} Offline`}
                size="small"
                sx={{ bgcolor: '#E84393', color: 'white' }}
              />
            )}
          </Box>
        </Box>

        {/* Authority List */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: shard.color }}>
            Authority Details
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {shard.authorities.map((authority) => (
              <Paper 
                key={authority.name}
                sx={{ 
                  p: 1.5, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 1,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2">{authority.name}</Typography>
                  <Chip 
                    label={authority.status}
                    size="small"
                    sx={{ 
                      bgcolor: authority.status === 'online' ? '#00B894' : 
                              authority.status === 'syncing' ? '#FDCB6E' : '#E84393',
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Stake: {authority?.stake?.toLocaleString()} XTZ
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Success Rate: {((authority?.performance_metrics?.success_rate || 0) * 100).toFixed(1)}%
                  </Typography>
                  {/* <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Managed Shards: {authority.shards.length}
                  </Typography> */}
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Last Active: {new Date(authority?.last_heartbeat).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedShard, setSelectedShard] = useState<ShardInfo | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredShard, sXTZoveredShard] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const shardClusters = useRef<ShardInfo[]>([]);

  useEffect(() => {
    addGlobalStyles();
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser');
      setLocationError('Geolocation is not supported by your browser');
      setUserLocation(DEFAULT_LOCATION);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setUserLocation([latitude, longitude]);
      setLocationError(null);
      if (mapRef.current) {
        mapRef.current.setView([latitude, longitude], 18);
      }
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
          errorMessage += 'Location request timed out. Retrying with lower accuracy...';
          // Retry with lower accuracy and longer timeout
          navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (retryError) => {
              console.warn('Retry failed:', retryError.message);
              setLocationError('Could not get location. Using default location.');
              setUserLocation(DEFAULT_LOCATION);
            },
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 60000 // Accept positions up to 1 minute old
            }
          );
          return;
        default:
          errorMessage += error.message;
      }
      console.warn(errorMessage);
      setLocationError(errorMessage);
      
      // Only set default location if not retrying
      if (error.code !== error.TIMEOUT) {
        setUserLocation(DEFAULT_LOCATION);
      }
    };

    // First try with high accuracy
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 30000 // Accept positions up to 30 seconds old
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleShardClick = (shard: ShardInfo, event: any) => {
    const map = mapRef.current;
    if (!map) return;
    
    const point = map.latLngToContainerPoint([shard?.center?.[0], shard?.center?.[1]]);
    setTooltipPosition({ 
      x: point.x + 30, 
      y: point.y - 100 
    });
    setSelectedShard(shard);
  };

  const handleCloseTooltip = () => {
    setSelectedShard(null);
  };

  // Create 1 shards positioned around the user's location
  const createShardClusters = async(): Promise<ShardInfo[]> => {
    const clusters: ShardInfo[] = await apiService.getShards();

    for (let i = 0; i < clusters.length; i++) {
      const angle = (i * 2 * Math.PI) / clusters.length;
      const distance = SHARD_SPACING / 111000; // Convert meters to degrees (approximately)
      
      // Handle case when userLocation is null
      const center: [number, number] = userLocation ? [
        userLocation[0] + Math.cos(angle) * distance,
        userLocation[1] + Math.sin(angle) * distance * Math.cos(userLocation[0] * Math.PI / 180)
      ] : [
        DEFAULT_LOCATION[0] + Math.cos(angle) * distance,
        DEFAULT_LOCATION[1] + Math.sin(angle) * distance * Math.cos(DEFAULT_LOCATION[0] * Math.PI / 180)
      ];

      clusters[i].center = center;
      clusters[i].color = SHARD_COLORS[i];
    }

    return clusters;
  };

  // Update shardClusters when authorities change
  useEffect(() => {
    const fetchShards = async () => {
      const clusters = await createShardClusters();
      shardClusters.current = clusters;
    };
    fetchShards();
  }, [authorities]);

  if (userLocation === null) {
    return (
      <Paper 
        sx={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(26, 31, 46, 0.4)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>
              {locationError ? 'Using default location...' : 'Getting your location...'}
            </Typography>
          </Box>
          {locationError && (
            <Typography variant="body2" color="error" textAlign="center" sx={{ maxWidth: 400, px: 2 }}>
              {locationError}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={DEFAULT_LOCATION}
        zoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* User location marker and range */}
        {userLocation && (
          <>
            <Marker
              position={userLocation}
              icon={new Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                shadowSize: [41, 41],
              })}
            >
              <Popup>
                <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Your Location</span>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={100}
              pathOptions={{
                color: '#4A90E2',
                fillColor: '#4A90E2',
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}

        {/* Render shard clusters */}
        {shardClusters.current.map((shard) => (
          <React.Fragment key={shard.shard_id}>
            <Circle
              center={shard.center || [0, 0]}
              radius={SHARD_RADIUS}
              pathOptions={{
                color: shard.color,
                fillColor: shard.color,
                fillOpacity: 0.1,
                weight: 1,
              }}
              eventHandlers={{
                click: (e) => handleShardClick(shard, e),
                mouseover: () => sXTZoveredShard(shard.shard_id),
                mouseout: () => sXTZoveredShard(null),
              }}
            />
            <Marker
              position={shard.center || [0, 0]}
              icon={createShardIcon(shard, hoveredShard === shard.shard_id)}
              eventHandlers={{
                click: (e) => handleShardClick(shard, e),
                mouseover: () => sXTZoveredShard(shard.shard_id),
                mouseout: () => sXTZoveredShard(null),
              }}
            />
            
            {/* Render authority markers (now without click events) */}
            {shard.authorities.map((authority, idx) => (
              <Marker
                key={`${shard.shard_id}-${authority.name}`}
                position={getAuthorityPosition(shard, idx)}
                icon={createAuthorityIcon(
                  authority.status,
                  authority.name,
                  shard.color || '',
                  false
                )}
              />
            ))}
          </React.Fragment>
        ))}

        <FitToArea center={userLocation || DEFAULT_LOCATION} />
      </MapContainer>

      <ShardTooltip
        shard={selectedShard}
        visible={!!selectedShard}
        position={tooltipPosition}
        onClose={handleCloseTooltip}
      />
    </Box>
  );
};

export default NetworkMap; 