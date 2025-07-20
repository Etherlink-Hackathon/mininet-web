// Default fallback location (will be replaced with user's location)
export const DEFAULT_LOCATION: [number, number] = [40.7589, -73.9851]; // Central Park, NYC (fallback)
export const SHARD_RADIUS = 100; // 100 meters transmission range for each shard
export const SHARD_SPACING = 150; // 150 meters between shard centers to avoid overlap

// Shard colors and names
export const SHARD_COLORS = [
  '#00D2FF', // Cyan
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
];

export const SHARD_NAMES = [
  'Alpha Shard',
  'Beta Shard', 
  'Gamma Shard',
  'Delta Shard',
  'Epsilon Shard'
];
