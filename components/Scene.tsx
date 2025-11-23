
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Orb } from './Orb';

interface SceneProps {
  audioData: number;
}

export const Scene: React.FC<SceneProps> = ({ audioData }) => {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 32], fov: 35 }}
      gl={{ antialias: false, alpha: true, toneMappingExposure: 1.0 }}
    >
      <Suspense fallback={null}>
        {/* 
          High-contrast studio environment to make the flat-shaded nodes pop 
          with distinct reflections on their facets.
        */}
        <Environment preset="warehouse" blur={0.6} />

        <ambientLight intensity={0.4} color="#ffffff" />
        
        {/* Directional lights to catch the edges of the dodecahedrons */}
        <pointLight position={[20, 10, 20]} intensity={4} color="#ffffff" distance={100} />
        <pointLight position={[-20, -10, -10]} intensity={2} color="#cbd5e1" distance={100} />
        <pointLight position={[0, 20, 0]} intensity={2} color="#f8fafc" distance={50} />

        <Sparkles count={60} scale={35} size={2} speed={0.2} opacity={0.15} color="#ffffff" />
        <Stars radius={100} depth={50} count={800} factor={4} saturation={0} fade speed={0.05} />
        
        <Orb audioData={audioData} />

        <EffectComposer enableNormalPass={false}>
          <Bloom 
            luminanceThreshold={1.1} 
            mipmapBlur 
            intensity={0.5} 
            radius={0.3} 
          />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>

        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={15} 
          maxDistance={70} 
          autoRotate 
          autoRotateSpeed={0.1} 
        />
      </Suspense>
    </Canvas>
  );
};
