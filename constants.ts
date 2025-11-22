
// Visual Configuration
export const ORB_RADIUS = 14; 
export const NODE_COUNT = 800; 
export const VALIDATOR_COUNT = 40;

// Animation Timings
export const BLOCK_INTERVAL_MS = 1000; 
export const BEAM_PROPAGATION_TIME_MS = 600; 
export const BEAM_SPEED = (ORB_RADIUS * 2.8) / (BEAM_PROPAGATION_TIME_MS / 1000);

// Peer Lifecycle
export const PEER_LIFETIME_MS = 30000; 
export const PEER_TRANSITION_MS = 2000;

// Rotation
export const VALIDATOR_ROTATION_SPEED = 0.15; 

// Colors
export const COLOR_BG = '#050510'; 
export const COLOR_LINK = '#1F2348'; // Dark Blue/Purple for inactive links

// Vibrant Multi-color Palette
export const NODE_PALETTE = [
  '#00E5FF', // Cyan
  '#D500F9', // Neon Purple
  '#FF1744', // Bright Red/Pink
  '#00E676', // Bright Green
  '#2979FF', // Electric Blue
  '#FFEA00', // Bright Yellow
];

export const MOCK_AUDIO_DATA_SIZE = 32;
