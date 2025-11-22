
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Sparkles } from '@react-three/drei';
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
      gl={{ antialias: false, alpha: true, toneMappingExposure: 1.2 }}
    >
      <Suspense fallback={null}>
        {/* 
           Lighting:
           Neutral/Cool base to let colorful nodes pop
        */}
        <ambientLight intensity={0.3} color="#101025" />
        
        {/* Core Light: Subtle Magenta */}
        <pointLight position={[0, 0, 0]} intensity={2} color="#D500F9" distance={20} decay={2} />
        
        {/* Rim Lights: Cyan and Purple mix */}
        <pointLight position={[30, 10, 20]} intensity={15} color="#00E5FF" distance={100} decay={1} />
        <pointLight position={[-30, -10, -10]} intensity={15} color="#7C4DFF" distance={100} decay={1} />

        {/* Multi-colored Atmosphere */}
        <Sparkles count={100} scale={25} size={4} speed={0.4} opacity={0.5} color="#00E5FF" />
        <Sparkles count={100} scale={35} size={6} speed={0.2} opacity={0.4} color="#D500F9" />

        {/* Distant Stars */}
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0.5} fade speed={0.2} />
        
        <Orb audioData={audioData} />

        <EffectComposer enableNormalPass={false}>
          {/* 
             Bloom: Strong intensity to make colorful nodes glow neon
          */}
          <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={1.0} 
            radius={0.5} 
            levels={8}
          />
          <Noise opacity={0.05} />
          <Vignette eskil={false} offset={0.1} darkness={0.6} />
        </EffectComposer>

        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={15} 
          maxDistance={70} 
          autoRotate 
          autoRotateSpeed={0.3} 
        />
      </Suspense>
    </Canvas>
  );
};
