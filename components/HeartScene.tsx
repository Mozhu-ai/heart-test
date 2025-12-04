import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import ParticleHeart from './ParticleHeart';

interface HeartSceneProps {
  soundEnabled: boolean;
}

const HeartScene: React.FC<HeartSceneProps> = ({ soundEnabled }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      gl={{ 
        alpha: false, 
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      }}
      dpr={[1, 2]} // Optimize for pixel density
    >
      <color attach="background" args={['#000000']} />
      
      {/* Subtle ambient light to lift the blacks if needed, though particles use additive blending */}
      <ambientLight intensity={0.1} />

      {/* The Heart Core */}
      <ParticleHeart soundEnabled={soundEnabled} />

      {/* Camera Controls - slowly rotating to show volume */}
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        autoRotate 
        autoRotateSpeed={0.8}
        minDistance={4}
        maxDistance={15}
      />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  );
};

export default HeartScene;