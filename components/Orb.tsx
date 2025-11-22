
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NodeData, NodeType, LinkData, Beam, LifeCycleState } from '../types';
import {
  NODE_COUNT,
  VALIDATOR_COUNT,
  ORB_RADIUS,
  NODE_PALETTE,
  COLOR_LINK,
  BEAM_SPEED,
  BLOCK_INTERVAL_MS,
  PEER_LIFETIME_MS,
  PEER_TRANSITION_MS,
  VALIDATOR_ROTATION_SPEED
} from '../constants';

// Extend NodeData to store a specific base color for that node (for variety)
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
      baseColor: getRandomColor() // Random vibrant color
    });
  }

  // --- 2. Generate Peers ---
  for (let i = VALIDATOR_COUNT; i < NODE_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = ORB_RADIUS * (0.85 + Math.random() * 0.15); 
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    const targetPos = new THREE.Vector3(x, y, z);
    const startPos = targetPos.clone().normalize().multiplyScalar(ORB_RADIUS * 1.5);

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
      baseColor: getRandomColor() // Random vibrant color
    });
  }

  // --- 3. Generate Links (LOWER DENSITY) ---
  
  // Validators Mesh 
  for (let i = 0; i < VALIDATOR_COUNT; i++) {
    const distances = [];
    for (let j = 0; j < VALIDATOR_COUNT; j++) {
        if (i === j) continue;
        distances.push({ id: j, dist: nodes[i].targetPosition.distanceTo(nodes[j].targetPosition) });
    }
    distances.sort((a, b) => a.dist - b.dist);
    
    // Reduced connections for cleaner look (was 3)
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
                phaseOffset: Math.random() * Math.PI * 2
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
     // Connect to just 1 validator usually, max 2 (was min 2)
     for (let k = 0; k < valCandidates.length; k++) {
        if (valConnections >= 1) break; 
        const v = valCandidates[k];
        if (v.dist < ORB_RADIUS * 2.0) {
            if (!nodes[i].connections.includes(v.id)) {
                nodes[i].connections.push(v.id);
                nodes[v.id].connections.push(i);
                links.push({ sourceIndex: v.id, targetIndex: i, isValidatorLink: false, phaseOffset: 0 });
                valConnections++;
            }
        }
     }

     // Connect to nearby peers
     const peerDistances = [];
     const scanRange = 60; // Reduced scan range (was 100)
     const startScan = Math.max(VALIDATOR_COUNT, i - scanRange);
     const endScan = Math.min(NODE_COUNT, i + scanRange);
     
     for (let j = startScan; j < endScan; j++) {
        if (i === j) continue;
        peerDistances.push({ id: j, dist: nodes[i].targetPosition.distanceTo(nodes[j].targetPosition) });
     }
     peerDistances.sort((a, b) => a.dist - b.dist);

     let peerConnections = 0;
     // Reduced peer connections (was 4)
     for (let k = 0; k < 8; k++) {
        if (peerConnections >= 2) break; 
        if (k >= peerDistances.length) break;
        const targetId = peerDistances[k].id;
        // Reduced max distance for tighter clusters, less messy long lines (was 6.0)
        if (peerDistances[k].dist > 5.0) continue; 
        if (!nodes[i].connections.includes(targetId)) {
             nodes[i].connections.push(targetId);
             nodes[targetId].connections.push(i);
             links.push({ sourceIndex: i, targetIndex: targetId, isValidatorLink: false, phaseOffset: 0 });
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
  const cBeam = useMemo(() => new THREE.Color('#FF9500'), []); // Orange Beam Color

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
        id: crypto.randomUUID(),
        originIndex: randomValidatorIdx,
        startTime: now,
        maxDistance: ORB_RADIUS * 2.5, 
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

    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;

    // 1. Dynamic Rewiring
    if (Math.random() > 0.2) { 
        const linkIdx = Math.floor(Math.random() * links.length);
        const link = links[linkIdx];
        if (!link.isValidatorLink && nodes[link.sourceIndex].state === 'ACTIVE') {
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
        const noiseX = Math.sin(time * 0.5 + n.id) * 0.08;
        const noiseY = Math.cos(time * 0.3 + n.id) * 0.08;
        const noiseZ = Math.sin(time * 0.4 + n.id) * 0.08;

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
                    n.startPosition.copy(n.targetPosition).normalize().multiplyScalar(ORB_RADIUS * 1.4);
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

        // --- Beams Logic ---
        let beamIntensity = 0;
        if (n.opacity > 0.01) {
             for (const beam of beams) {
                const dist = n.currentPosition.distanceTo(nodes[beam.originIndex].currentPosition);
                const waveDist = (time - beam.startTime) * BEAM_SPEED;
                const waveWidth = 8.0; 

                if (dist < waveDist && dist > waveDist - waveWidth) {
                    const p = 1 - (waveDist - dist) / waveWidth;
                    beamIntensity = Math.max(beamIntensity, Math.pow(p, 2));
                }
            }
        }

        // --- Validator Flash ---
        let blockFlash = 0;
        if (n.type === NodeType.VALIDATOR) {
            const timeSinceBlock = time - n.lastBlockTime;
            if (timeSinceBlock < 1.5 && timeSinceBlock >= 0) {
                blockFlash = Math.pow(1 - (timeSinceBlock / 1.5), 3);
            }
        }

        // --- Matrix & Scale ---
        let scale = 0.4; 
        if (n.type === NodeType.VALIDATOR) scale = 2.2; // Increased Validator Size
        
        if (beamIntensity > 0) scale *= (1 + beamIntensity * 0.8); 
        if (blockFlash > 0) scale *= (1 + blockFlash * 0.5);
        
        scale *= n.opacity;
        if (scale < 0.01) scale = 0;

        tempMatrix.makeScale(scale, scale, scale);
        tempMatrix.setPosition(n.currentPosition);
        nodesMeshRef.current.setMatrixAt(i, tempMatrix);

        // --- HDR Color Logic (Colorful) ---
        
        // Boost brightness for glow effect
        if (blockFlash > 0) {
            // Flash bright orange for new blocks on validators
            tempColor.copy(cBeam).lerp(n.baseColor, 0.3); // Mostly beam color
            tempColor.multiplyScalar(3 + blockFlash * 20.0);
        } else if (beamIntensity > 0) {
            // Beam hit glow - TURN ORANGE
            tempColor.copy(cBeam); 
            tempColor.multiplyScalar(2 + beamIntensity * 15.0); 
        } else {
            // Standard glow (Node Base Color)
            tempColor.copy(n.baseColor);
            if (n.type === NodeType.VALIDATOR) {
                tempColor.multiplyScalar(3.0); // Validators glow harder
            } else {
                tempColor.multiplyScalar(1.5); // Peers soft glow
            }
        }

        nodesMeshRef.current.setColorAt(i, tempColor);
    }

    nodesMeshRef.current.instanceMatrix.needsUpdate = true;
    if (nodesMeshRef.current.instanceColor) nodesMeshRef.current.instanceColor.needsUpdate = true;

    // 3. Update Links
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const n1 = nodes[link.sourceIndex];
        const n2 = nodes[link.targetIndex];
        const dist = n1.currentPosition.distanceTo(n2.currentPosition);
        
        let alpha = Math.min(n1.opacity, n2.opacity);
        if (dist > 7.0) alpha = 0; 

        if (alpha < 0.01) {
             linePositions.setXYZ(i*2, 0,0,0); linePositions.setXYZ(i*2+1, 0,0,0);
             continue;
        }

        linePositions.setXYZ(i*2, n1.currentPosition.x, n1.currentPosition.y, n1.currentPosition.z);
        linePositions.setXYZ(i*2+1, n2.currentPosition.x, n2.currentPosition.y, n2.currentPosition.z);

        // Beam on link
        let beamHit = 0;
        const mid = new THREE.Vector3().lerpVectors(n1.currentPosition, n2.currentPosition, 0.5);
        for (const beam of beams) {
            const origin = nodes[beam.originIndex].currentPosition;
            const d = mid.distanceTo(origin);
            const waveDist = (time - beam.startTime) * BEAM_SPEED;
            if (d < waveDist && d > waveDist - 6.0) {
                beamHit = Math.max(beamHit, 1 - (waveDist - d)/6.0);
            }
        }

        if (beamHit > 0) {
            // Link lights up ORANGE
            tempColor.copy(cBeam);
            tempColor.multiplyScalar(2 + beamHit * 10.0); 
        } else {
            // Inactive Link
            tempColor.copy(cLink); 
            if (link.isValidatorLink) {
                 tempColor.multiplyScalar(2.0);
            } else {
                tempColor.multiplyScalar(1.5);
            }
        }
        
        tempColor.multiplyScalar(alpha);
        lineColors.setXYZ(i*2, tempColor.r, tempColor.g, tempColor.b);
        lineColors.setXYZ(i*2+1, tempColor.r, tempColor.g, tempColor.b);
    }

    linePositions.needsUpdate = true;
    lineColors.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={nodesMeshRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          toneMapped={false}
          roughness={0.9}
          metalness={0.1} 
          emissive="#000000"
          emissiveIntensity={0}
        />
      </instancedMesh>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial 
          vertexColors 
          transparent 
          opacity={0.4} 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
};
