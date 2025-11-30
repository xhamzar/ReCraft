import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOCK } from '../engine/world/BlockRegistry';

interface TorchLightSystemProps {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
}

export const TorchLightSystem: React.FC<TorchLightSystemProps> = ({ playerPositionRef, modifiedBlocks }) => {
  const [lights, setLights] = useState<THREE.Vector3[]>([]);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Throttle updates to 5 times per second for performance
    if (time - lastUpdate.current > 0.2) {
      lastUpdate.current = time;
      
      const playerPos = playerPositionRef.current;
      const candidates: { pos: THREE.Vector3, dist: number }[] = [];
      const MAX_LIGHTS = 10;
      const RENDER_RADIUS = 20;

      for (const [key, type] of modifiedBlocks.current.entries()) {
        // Check if block is a torch (ID 50 to 54)
        if (type >= BLOCK.TORCH && type <= BLOCK.TORCH_WEST) {
             const [x, y, z] = key.split(',').map(Number);
             
             // Simple distance check before Math.sqrt
             if (Math.abs(x - playerPos.x) > RENDER_RADIUS || Math.abs(z - playerPos.z) > RENDER_RADIUS) continue;

             const pos = new THREE.Vector3(x + 0.5, y + 0.7, z + 0.5);
             const dist = pos.distanceToSquared(playerPos);

             if (dist < RENDER_RADIUS * RENDER_RADIUS) {
                 candidates.push({ pos, dist });
             }
        }
      }

      // Sort by nearest
      candidates.sort((a, b) => a.dist - b.dist);

      // Keep only the closest lights
      const activeLights = candidates.slice(0, MAX_LIGHTS).map(c => c.pos);
      
      // Update state if different
      if (activeLights.length !== lights.length || !activeLights.every((pos, i) => pos.equals(lights[i]))) {
          setLights(activeLights);
      }
    }
  });

  return (
    <group>
      {lights.map((pos, i) => (
        <pointLight 
            key={`${i}-${Math.floor(pos.x)}-${Math.floor(pos.z)}`}
            position={pos} 
            intensity={2.0} 
            distance={12} 
            decay={2} 
            color="#ffaa00" 
        />
      ))}
    </group>
  );
};