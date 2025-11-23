
import * as THREE from 'three';

export enum NodeType {
  PEER,
  VALIDATOR
}

export type LifeCycleState = 'HIDDEN' | 'SPAWNING' | 'ACTIVE' | 'DYING';
export type ConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface NodeData {
  id: number;
  // Positions
  targetPosition: THREE.Vector3; // The final resting spot in the shell
  startPosition: THREE.Vector3;  // The outer spawning spot
  currentPosition: THREE.Vector3; // Current animated position

  type: NodeType;
  connections: number[]; // Indices of connected nodes
  stake: number; // For validators
  
  // Animation State
  state: LifeCycleState;
  timer: number; // Time remaining in current state
  opacity: number; // Current opacity
  
  // Validator specific
  validatorPhase?: number; // For rotating connections
  
  // New: Rotation & Highlighting
  phi: number;   // Spherical coordinate for rotation
  theta: number; // Spherical coordinate for rotation
  radius: number;// Distance from center
  lastBlockTime: number; // Timestamp of last block generation
}

export interface LinkData {
  sourceIndex: number;
  targetIndex: number;
  isValidatorLink: boolean; // To identify validator-validator links for rotation
  phaseOffset: number; // For animating opacity

  // Connection Simulation
  connectionState: ConnectionState;
  reconnectProgress: number; // 0.0 to 1.0 (for growing animation)
  disconnectTimer: number; // Time in seconds to remain disconnected
}

export interface Beam {
  id: string;
  originIndex: number;
  startTime: number;
  maxDistance: number;
}

export interface SimulationState {
  blockHeight: number;
  lastBlockTime: number;
}
