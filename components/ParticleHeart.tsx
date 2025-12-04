import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { playSparkle } from '../services/audioService';

interface ParticleHeartProps {
  soundEnabled: boolean;
}

const ParticleHeart: React.FC<ParticleHeartProps> = ({ soundEnabled }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Configuration constants
  const COUNT = 14000;
  const HEART_COLOR = new THREE.Color('#FF0040'); // Deep Magenta/Hot Pink
  
  // Physics parameters
  const SPRING_STIFFNESS = 0.06;
  const FRICTION = 0.88;
  const EXPLOSION_FORCE = 0.6;
  const REST_RETURN_SPEED = 0.05;

  // Beat logic
  const bpm = 60;
  const beatInterval = 60 / bpm;
  const beatState = useRef({
    nextBeatTime: 0,
    isBeating: false,
    phase: 'rest' as 'systole' | 'diastole' | 'rest'
  });

  // Data generation (run once)
  const { positions, basePositions, velocities, colors } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    const cols = new Float32Array(COUNT * 3);

    const tempVec = new THREE.Vector3();
    const colorTmp = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      // Parametric Heart Formula
      // x = 16sin^3(t)
      // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
      // z = volumetric variation
      
      let t = Math.random() * Math.PI * 2;
      
      // Rejection sampling or distribution tweak to fill volume
      // We mix the surface formula with random internal points
      const r = Math.pow(Math.random(), 0.3); // Clustering towards surface but filling inside
      
      let x = 16 * Math.pow(Math.sin(t), 3);
      let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      
      // Calculate approximate thickness for Z volume based on X width at this height
      // This is an approximation to make a 3D volume from a 2D shape
      const zThickness = (2 - Math.abs(t - Math.PI) / Math.PI) * 5; 
      let z = (Math.random() - 0.5) * zThickness * 3;

      // Add "Aura" particles (approx 15% of particles)
      const isAura = Math.random() > 0.85;
      if (isAura) {
        const expansion = 1.2 + Math.random() * 0.5;
        x *= expansion;
        y *= expansion;
        z *= expansion;
      }

      // Scale down slightly to fit camera
      x *= 0.15;
      y *= 0.15;
      z *= 0.15;

      // Base Position (Target)
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;

      // Current Position (Start at base)
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Velocity init
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;

      // Colors
      // Core is brighter/whiter, edges are deep pink
      const distFromCenter = Math.sqrt(x*x + y*y + z*z);
      const normalizedDist = Math.min(distFromCenter / 3, 1);
      
      // Mix white and base color
      colorTmp.set(HEART_COLOR);
      if (!isAura) {
        colorTmp.offsetHSL(0, 0, (1 - normalizedDist) * 0.5); // Brighter core
      } else {
         colorTmp.setHex(0xff5588); // Lighter pink for aura
         colorTmp.offsetHSL(0, 0, 0.2);
      }
      
      cols[i * 3] = colorTmp.r;
      cols[i * 3 + 1] = colorTmp.g;
      cols[i * 3 + 2] = colorTmp.b;
    }

    return { positions: pos, basePositions: base, velocities: vel, colors: cols };
  }, []);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    const geometry = pointsRef.current.geometry;
    const positionAttribute = geometry.attributes.position;
    
    // --- Beat Logic ---
    // Calculate local time within the beat interval
    if (time > beatState.current.nextBeatTime) {
      beatState.current.nextBeatTime = time + beatInterval;
      beatState.current.phase = 'systole';
      if (soundEnabled) playSparkle();
    }

    const timeSinceBeat = time - (beatState.current.nextBeatTime - beatInterval);
    
    // Define phases
    // 0.0 - 0.15: Systole (Explosion)
    // 0.15 - 0.5: Diastole (Contraction)
    // 0.5 - 1.0: Rest
    
    let burstFactor = 0;
    
    if (timeSinceBeat < 0.15) {
      // Systole: Explosive outward force
       beatState.current.phase = 'systole';
       // Only apply burst force at the very beginning of the frame for impact
       if (timeSinceBeat < 0.05) burstFactor = EXPLOSION_FORCE;
    } else if (timeSinceBeat < 0.5) {
      // Diastole: Vacuum pull back (handled by spring physics naturally, maybe increase stiffness)
       beatState.current.phase = 'diastole';
    } else {
       beatState.current.phase = 'rest';
    }


    // --- Physics Update ---
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Current pos
      const px = positions[ix];
      const py = positions[iy];
      const pz = positions[iz];

      // Target pos
      const bx = basePositions[ix];
      const by = basePositions[iy];
      const bz = basePositions[iz];

      // Spring force towards base
      // F = -k * x
      // During Diastole (contraction), we want a "snappy" return, effectively higher stiffness
      const currentStiffness = beatState.current.phase === 'diastole' ? SPRING_STIFFNESS * 2.5 : SPRING_STIFFNESS;
      
      const fx = (bx - px) * currentStiffness;
      const fy = (by - py) * currentStiffness;
      const fz = (bz - pz) * currentStiffness;

      // Apply Force to Velocity
      velocities[ix] += fx;
      velocities[iy] += fy;
      velocities[iz] += fz;

      // Apply Burst (Explosion)
      // Burst direction is normalized vector from center (approx) or normal of heart surface
      // For simplicity, vector from origin (0,0,0) works well for heart shape
      if (burstFactor > 0) {
        // Simple normalization
        const len = Math.sqrt(bx*bx + by*by + bz*bz) || 1;
        const nx = bx / len;
        const ny = by / len;
        const nz = bz / len;

        // Randomize burst slightly for organic feel
        velocities[ix] += nx * burstFactor * (0.5 + Math.random());
        velocities[iy] += ny * burstFactor * (0.5 + Math.random());
        velocities[iz] += nz * burstFactor * (0.5 + Math.random());
      }

      // Apply Friction/Drag
      velocities[ix] *= FRICTION;
      velocities[iy] *= FRICTION;
      velocities[iz] *= FRICTION;

      // Update Position
      positions[ix] += velocities[ix];
      positions[iy] += velocities[iy];
      positions[iz] += velocities[iz];
    }

    positionAttribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default ParticleHeart;