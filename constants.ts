
// Visual Configuration
export const ORB_RADIUS = 14; 
export const NODE_COUNT = 800; 
export const VALIDATOR_COUNT = 40;

// Animation Timings
export const BLOCK_INTERVAL_MS = 1200; 
export const BEAM_PROPAGATION_TIME_MS = 1000; 
export const BEAM_SPEED = (ORB_RADIUS * 2.5) / (BEAM_PROPAGATION_TIME_MS / 1000);

// Peer Lifecycle
export const PEER_LIFETIME_MS = 30000; 
export const PEER_TRANSITION_MS = 2000;

// Rotation
export const VALIDATOR_ROTATION_SPEED = 0.1;

// Colors
export const COLOR_BG = '#020617'; // Deepest Slate/Black
export const COLOR_LINK = '#334155'; // Subtle Slate Grey

// "Minimalistic Premium" Palette: Silver, Platinum, White, Soft Blue-Grey
// Removing Cyan entirely.
export const NODE_PALETTE = [
  '#FFFFFF', // Pure White
  '#F8FAFC', // Slate 50
  '#E2E8F0', // Slate 200
  '#CBD5E1', // Slate 300
  '#94A3B8', // Slate 400 (Darker Metal)
];

// Beam Color - Pure White (Clean)
export const BEAM_COLOR = '#FFFFFF'; 

export const MOCK_AUDIO_DATA_SIZE = 32;
