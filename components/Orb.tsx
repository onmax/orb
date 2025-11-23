
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NodeData, NodeType, LinkData, Beam, LifeCycleState, ConnectionState } from '../types';
import {
  NODE_COUNT,
  VALIDATOR_COUNT,
  ORB_RADIUS,
  NODE_PALETTE,
  COLOR_LINK,
  BEAM_SPEED,
  BEAM_COLOR,
  BLOCK_INTERVAL_MS,
  PEER_LIFETIME_MS,
  PEER_TRANSITION_MS,
  VALIDATOR_ROTATION_SPEED
} from '../constants';

// Extend NodeData to store a specific base color for that node
interface ExtendedNodeData extends NodeData {
    baseColor: THREE.Color;
}

const generateGraph = () => {
  const nodes: ExtendedNodeData[] = [];
  const links: LinkData[] = [];
  
  // Helper to get random palette color
  const getRandomColor = () => new THREE.Color(NODE_PALETTE[Math.floor(Math.random() * NODE_PALETTE.length)]);

  // --- 1. Generate Validators ---
  for (let i = 0; i < VALIDATOR_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    const r = ORB_RADIUS * (0.85 + Math.random() * 0.10); 

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const pos = new THREE.Vector3(x, y, z);

    nodes.push({
      id: i,
      targetPosition: pos,
      startPosition: pos, 
      currentPosition: pos.clone(),
      type: NodeType.VALIDATOR,
      connections: [],
      stake: 1.0, 
      state: 'ACTIVE',
      timer: 0,
      opacity: 1,
      validatorPhase: Math.random() * Math.PI * 2,
      phi: phi,
      theta: theta,
      radius: r,
      lastBlockTime: -999,
      // Validators: slightly brighter base
      baseColor: new THREE.Color('#ffffff') 
    });
  }

  // --- 2. Generate Peers ---
  for (let i = VALIDATOR_COUNT; i < NODE_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = ORB_RADIUS * (0.9 + Math.random() * 0.2); 
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const targetPos = new THREE.Vector3(x, y, z);
    const startPos = targetPos.clone().normalize().multiplyScalar(ORB_RADIUS * 1.8);

    const initialLife = Math.random();
    let initialState: LifeCycleState = 'HIDDEN';
    let initialTimer = 0;
    let initialOpacity = 0;
    let currentPos = startPos.clone();

    if (initialLife > 0.1) {
        initialState = 'ACTIVE';
        initialTimer = Math.random() * PEER_LIFETIME_MS;
        initialOpacity = 1;
        currentPos = targetPos.clone();
    } else {
        initialTimer = Math.random() * 5000; 
    }
    
    nodes.push({
      id: i,
      targetPosition: targetPos,
      startPosition: startPos,
      currentPosition: currentPos,
      type: NodeType.PEER,
      connections: [],
      stake: 1.0, 
      state: initialState,
      timer: initialTimer,
      opacity: initialOpacity,
      phi: phi,
      theta: theta,
      radius: r,
      lastBlockTime: 0,
      baseColor: getRandomColor() 
    });
  }

  // --- 3. Generate Links ---
  // Validators Mesh 
  for (let i = 0; i < VALIDATOR_COUNT; i++) {
    const distances = [];
    for (let j = 0; j < VALIDATOR_COUNT; j++) {
        if (i === j) continue;
        distances.push({ id: j, dist: nodes[i].targetPosition.distanceTo(nodes[j].targetPosition) });
    }
    distances.sort((a, b) => a.dist - b.dist);
    
    const connectionCount = 2; 
    for (let k = 0; k < connectionCount; k++) {
        const targetId = distances[k].id;
        if (!nodes[i].connections.includes(targetId)) {
            nodes[i].connections.push(targetId);
            nodes[targetId].connections.push(i);
            links.push({ 
                sourceIndex: Math.min(i, targetId), 
                targetIndex: Math.max(i, targetId), 
                isValidatorLink: true,
                phaseOffset: Math.random() * Math.PI * 2,
                connectionState: 'CONNECTED',
                reconnectProgress: 1.0,
                disconnectTimer: 0
            });
        }
    }
  }

  // Peers
  for (let i = VALIDATOR_COUNT; i < NODE_COUNT; i++) {
     // Connect to nearby validators
     const valCandidates = [];
     for(let vIdx = 0; vIdx < VALIDATOR_COUNT; vIdx++) {
         const d = nodes[i].targetPosition.distanceTo(nodes[vIdx].targetPosition);
         valCandidates.push({ id: vIdx, dist: d });
     }
     valCandidates.sort((a, b) => a.dist - b.dist);

     let valConnections = 0;
     for (let k = 0; k < valCandidates.length; k++) {
        if (valConnections >= 1) break; 
        const v = valCandidates[k];
        if (v.dist < ORB_RADIUS * 2.5) {
            if (!nodes[i].connections.includes(v.id)) {
                nodes[i].connections.push(v.id);
                nodes[v.id].connections.push(i);
                links.push({ 
                    sourceIndex: v.id, 
                    targetIndex: i, 
                    isValidatorLink: false, 
                    phaseOffset: 0,
                    connectionState: 'CONNECTED',
                    reconnectProgress: 1.0,
                    disconnectTimer: 0
                });
                valConnections++;
            }
        }
     }

     // Connect to nearby peers
     const peerDistances = [];
     const scanRange = 60; 
     const startScan = Math.max(VALIDATOR_COUNT, i - scanRange);
     const endScan = Math.min(NODE_COUNT, i + scanRange);
     
     for (let j = startScan; j < endScan; j++) {
        if (i === j) continue;
        peerDistances.push({ id: j, dist: nodes[i].targetPosition.distanceTo(nodes[j].targetPosition) });
     }
     peerDistances.sort((a, b) => a.dist - b.dist);

     let peerConnections = 0;
     for (let k = 0; k < 8; k++) {
        if (peerConnections >= 2) break; 
        if (k >= peerDistances.length) break;
        const targetId = peerDistances[k].id;
        if (peerDistances[k].dist > 6.0) continue; 
        if (!nodes[i].connections.includes(targetId)) {
             nodes[i].connections.push(targetId);
             nodes[targetId].connections.push(i);
             links.push({ 
                 sourceIndex: i, 
                 targetIndex: targetId, 
                 isValidatorLink: false, 
                 phaseOffset: 0,
                 connectionState: 'CONNECTED',
                 reconnectProgress: 1.0,
                 disconnectTimer: 0
             });
             peerConnections++;
        }
     }
  }

  return { nodes, links };
};

interface OrbProps {
  audioData: number;
}

export const Orb: React.FC<OrbProps> = ({ audioData }) => {
  const graphDataRef = useRef<{ nodes: ExtendedNodeData[], links: LinkData[] } | null>(null);

  useMemo(() => {
    graphDataRef.current = generateGraph();
  }, []);

  const nodesMeshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [beams, setBeams] = useState<Beam[]>([]);

  const tempColor = useMemo(() => new THREE.Color(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const cLink = useMemo(() => new THREE.Color(COLOR_LINK), []);
  const cBeam = useMemo(() => new THREE.Color(BEAM_COLOR), []);

  // Initialize Line Buffers
  useEffect(() => {
    if (!linesRef.current || !graphDataRef.current) return;
    const { links } = graphDataRef.current;
    const positions = new Float32Array(links.length * 6);
    const colors = new Float32Array(links.length * 6);
    linesRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    linesRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, []);

  // Block Generator
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const randomValidatorIdx = Math.floor(Math.random() * VALIDATOR_COUNT);
      if (graphDataRef.current) {
          graphDataRef.current.nodes[randomValidatorIdx].lastBlockTime = now;
      }
      const newBeam: Beam = {
        id: Math.random().toString(36).slice(2), 
        originIndex: randomValidatorIdx,
        startTime: now,
        maxDistance: ORB_RADIUS * 2.2, 
      };
      setBeams((prev) => [...prev, newBeam]);
    }, BLOCK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Cleanup beams
  useFrame((state) => {
    const now = state.clock.elapsedTime + (Date.now() / 1000 - state.clock.elapsedTime);
    setBeams((prev) => prev.filter((b) => (now - b.startTime) * BEAM_SPEED < b.maxDistance + 5));
  });

  // --- MAIN FRAME LOOP ---
  useFrame((state, delta) => {
    if (!graphDataRef.current || !nodesMeshRef.current || !linesRef.current) return;
    
    const linePositions = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const lineColors = linesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
    if (!linePositions || !lineColors) return;

    const { nodes, links } = graphDataRef.current;
    const time = Date.now() / 1000;
    const dt = delta * 1000;

    if (groupRef.current) groupRef.current.rotation.y += delta * 0.02; 

    // 1. Dynamic Rewiring (Legacy logic - kept for fallback, but main instability is below)
    if (Math.random() > 0.2) { 
        const linkIdx = Math.floor(Math.random() * links.length);
        const link = links[linkIdx];
        if (!link.isValidatorLink && nodes[link.sourceIndex].state === 'ACTIVE' && link.connectionState === 'CONNECTED') {
            const candidateId = VALIDATOR_COUNT + Math.floor(Math.random() * (NODE_COUNT - VALIDATOR_COUNT));
            if (candidateId !== link.sourceIndex && candidateId !== link.targetIndex) {
                 const dist = nodes[link.sourceIndex].currentPosition.distanceTo(nodes[candidateId].currentPosition);
                 if (dist < 6.0) link.targetIndex = candidateId;
            }
        }
    }

    // 2. Update Nodes
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        
        // --- Motion ---
        const noiseX = Math.sin(time * 0.5 + n.id) * 0.05;
        const noiseY = Math.cos(time * 0.3 + n.id) * 0.05;
        const noiseZ = Math.sin(time * 0.4 + n.id) * 0.05;

        if (n.type === NodeType.VALIDATOR) {
            n.theta += VALIDATOR_ROTATION_SPEED * delta;
            const x = n.radius * Math.sin(n.phi) * Math.cos(n.theta);
            const y = n.radius * Math.sin(n.phi) * Math.sin(n.theta);
            const z = n.radius * Math.cos(n.phi);
            n.currentPosition.set(x + noiseX, y + noiseY, z + noiseZ);
            n.opacity = 1;
        } else {
            n.timer -= dt;
            if (n.state === 'ACTIVE') {
                n.currentPosition.copy(n.targetPosition);
                n.currentPosition.x += noiseX;
                n.currentPosition.y += noiseY;
                n.currentPosition.z += noiseZ;
                n.opacity = 1;
                if (n.timer <= 0) { n.state = 'DYING'; n.timer = PEER_TRANSITION_MS; }
            } else if (n.state === 'HIDDEN') {
                if (n.timer <= 0) {
                    n.state = 'SPAWNING'; n.timer = PEER_TRANSITION_MS;
                    n.startPosition.copy(n.targetPosition).normalize().multiplyScalar(ORB_RADIUS * 1.6);
                    n.currentPosition.copy(n.startPosition);
                }
            } else if (n.state === 'SPAWNING') {
                const p = 1 - (n.timer / PEER_TRANSITION_MS);
                n.currentPosition.lerpVectors(n.startPosition, n.targetPosition, 1 - Math.pow(1-p, 3));
                n.opacity = p;
                if (n.timer <= 0) { n.state = 'ACTIVE'; n.timer = PEER_LIFETIME_MS + Math.random() * 5000; }
            } else if (n.state === 'DYING') {
                const p = n.timer / PEER_TRANSITION_MS;
                n.opacity = p;
                if (n.timer <= 0) { n.state = 'HIDDEN'; n.timer = Math.random() * 5000; }
            }
        }

        // --- Beams Logic with Softer Decay ---
        let beamIntensity = 0;
        if (n.opacity > 0.01) {
             for (const beam of beams) {
                const dist = n.currentPosition.distanceTo(nodes[beam.originIndex].currentPosition);
                const waveDist = (time - beam.startTime) * BEAM_SPEED;
                const waveWidth = 8.0;

                if (dist < waveDist && dist > waveDist - waveWidth) {
                    const p = 1 - (waveDist - dist) / waveWidth;
                    
                    // DECAY: Smoother fade.
                    const ratio = dist / beam.maxDistance;
                    const decay = Math.max(0, 1 - ratio); 
                    
                    // Reduce overall intensity (0.6 multiplier) so it's less dominant
                    beamIntensity = Math.max(beamIntensity, Math.pow(p, 2) * decay * 0.6);
                }
            }
        }

        // --- Validator Flash (Growing Glow Effect) ---
        let blockFlash = 0;
        
        if (n.type === NodeType.VALIDATOR) {
            const timeSinceBlock = time - n.lastBlockTime;
            // A 2-second lifecycle for the flash
            const flashDuration = 2.0; 
            const growTime = 0.4; // 0.4s to fully grow

            if (timeSinceBlock >= 0 && timeSinceBlock < flashDuration) {
                if (timeSinceBlock < growTime) {
                    // Growth Phase: Smooth sine easing for a natural "swell"
                    const t = timeSinceBlock / growTime;
                    blockFlash = Math.sin(t * Math.PI * 0.5); 
                } else {
                    // Decay Phase: Linear fade out
                    const t = (timeSinceBlock - growTime) / (flashDuration - growTime);
                    blockFlash = 1 - t; 
                }
            }
        }

        // --- Matrix & Scale ---
        let scale = 0.25; 
        if (n.type === NodeType.VALIDATOR) scale = 0.9; // Validators larger
        
        // Scale modification for beam hit
        if (beamIntensity > 0) scale *= (1 + beamIntensity * 0.2); 
        
        // Scale modification for block generation 
        // "Growing glow that doesn't grow much": limit scale increase to ~35%
        if (blockFlash > 0) scale *= (1 + blockFlash * 0.35);
        
        scale *= n.opacity;
        if (scale < 0.01) scale = 0;

        tempMatrix.makeScale(scale, scale, scale);
        tempMatrix.setPosition(n.currentPosition);
        
        // Rotation for "Gem" look
        const rot = (time * 0.5) + (n.id * 1.1);
        tempMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot, rot, rot))); 
        
        nodesMeshRef.current.setMatrixAt(i, tempMatrix);

        // --- Color Logic ---
        if (blockFlash > 0) {
            // Source of Energy: Intense White
            tempColor.setHex(0xFFFFFF);
            // "Easy to spot": significant brightness boost for bloom
            // Base 1.5 + variable 5.5 = max 7.0 (Very bright, triggers bloom halo)
            // This creates the "glow" without physically growing the mesh too much.
            tempColor.multiplyScalar(1.5 + blockFlash * 5.5); 
        } else if (beamIntensity > 0) {
            // Beam hit - White but softer
            tempColor.copy(cBeam);
            const intensity = 1 + beamIntensity * 1.5;
            tempColor.multiplyScalar(intensity); 
        } else {
            // Standard State
            tempColor.copy(n.baseColor);
            if (n.type === NodeType.VALIDATOR) {
                tempColor.multiplyScalar(1.2); 
            } else {
                tempColor.multiplyScalar(0.8); 
            }
        }

        nodesMeshRef.current.setColorAt(i, tempColor);
    }

    nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    if (nodesMeshRef.current.instanceColor) nodesMeshRef.current.instanceColor.needsUpdate = true;

    // 3. Update Links
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        
        // --- Network Instability Simulation ---
        if (!link.isValidatorLink) {
             if (link.connectionState === 'CONNECTED') {
                 // Random chance to drop connection
                 if (Math.random() < 0.0003) { 
                     link.connectionState = 'DISCONNECTED';
                     link.disconnectTimer = 1.0 + Math.random() * 2.0; // 1-3s downtime
                     link.reconnectProgress = 0;
                 }
             } else if (link.connectionState === 'DISCONNECTED') {
                 link.disconnectTimer -= delta; 
                 if (link.disconnectTimer <= 0) {
                     link.connectionState = 'RECONNECTING';
                 }
             } else if (link.connectionState === 'RECONNECTING') {
                 // Grow connection back
                 link.reconnectProgress += delta * 1.5; // ~0.7s to reconnect
                 if (link.reconnectProgress >= 1) {
                     link.reconnectProgress = 1;
                     link.connectionState = 'CONNECTED';
                 }
             }
        } else {
             // Validators always connected
             link.reconnectProgress = 1.0; 
        }

        const n1 = nodes[link.sourceIndex];
        const n2 = nodes[link.targetIndex];
        
        const dist = n1.currentPosition.distanceTo(n2.currentPosition);
        let alpha = Math.min(n1.opacity, n2.opacity);
        if (dist > 7.0) alpha = 0; 

        // Skip rendering if fully disconnected or nodes invisible
        if (link.reconnectProgress < 0.01 || alpha < 0.01) {
             linePositions.setXYZ(i*2, 0,0,0); linePositions.setXYZ(i*2+1, 0,0,0);
             continue;
        }

        // Calculate geometry: Grow line from Source to Target based on reconnectProgress
        const startX = n1.currentPosition.x;
        const startY = n1.currentPosition.y;
        const startZ = n1.currentPosition.z;

        const endX = startX + (n2.currentPosition.x - startX) * link.reconnectProgress;
        const endY = startY + (n2.currentPosition.y - startY) * link.reconnectProgress;
        const endZ = startZ + (n2.currentPosition.z - startZ) * link.reconnectProgress;

        linePositions.setXYZ(i*2, startX, startY, startZ);
        linePositions.setXYZ(i*2+1, endX, endY, endZ);

        // Beam on link
        let beamHit = 0;
        const mid = new THREE.Vector3(startX + (endX - startX)*0.5, startY + (endY - startY)*0.5, startZ + (endZ - startZ)*0.5);
        
        // Calculate standard link color
        for (const beam of beams) {
            const origin = nodes[beam.originIndex].currentPosition;
            const d = mid.distanceTo(origin);
            const waveDist = (time - beam.startTime) * BEAM_SPEED;
            if (d < waveDist && d > waveDist - 6.0) {
                const p = 1 - (waveDist - d)/6.0;
                const decay = Math.max(0, 1 - (d / beam.maxDistance));
                beamHit = Math.max(beamHit, p * decay);
            }
        }

        if (beamHit > 0) {
            tempColor.copy(cBeam);
            tempColor.multiplyScalar(0.2 + beamHit * 0.5); // softer beam on links
        } else {
            tempColor.copy(cLink); 
            if (link.isValidatorLink) {
                 tempColor.multiplyScalar(1.2); 
            } else {
                tempColor.multiplyScalar(0.4); 
            }
        }
        tempColor.multiplyScalar(alpha);

        // Set Colors
        // Start point is always the standard link color
        lineColors.setXYZ(i*2, tempColor.r, tempColor.g, tempColor.b);

        // End point: If Reconnecting, highlight tip (Bright White)
        if (link.connectionState === 'RECONNECTING') {
            lineColors.setXYZ(i*2+1, 1.0, 1.0, 1.0); 
        } else {
            lineColors.setXYZ(i*2+1, tempColor.r, tempColor.g, tempColor.b);
        }
    }

    linePositions.needsUpdate = true;
    lineColors.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={nodesMeshRef} args={[undefined, undefined, NODE_COUNT]}>
        {/* 
            Dodecahedron for "Tech" look.
            Emissive material logic: 
            - metalness: 0 (non-metallic as requested)
            - emissive: white (drives the brightness)
            - emissiveIntensity: controls the glow strength
            - flatShading: true (keeps the faceted look visible)
        */}
        <dodecahedronGeometry args={[0.32, 0]} /> 
        <meshStandardMaterial 
          toneMapped={false}
          roughness={0.4} 
          metalness={0.0} 
          flatShading={true}
          emissive="#ffffff"
          emissiveIntensity={0.3}
          color="#aaaaaa"
        />
      </instancedMesh>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial 
          vertexColors 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
};
