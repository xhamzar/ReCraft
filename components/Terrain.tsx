
import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SimplexNoise } from '../engine/math/Noise';
import { Config } from '../engine/core/Config';
import { Chunk } from './Chunk';

interface TerrainProps {
  seed: number;
  playerPosition: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  chunkVersions: Map<string, number>;
  renderDistance: number;
  visualStyle: 'pixel' | 'smooth';
}

export const Terrain: React.FC<TerrainProps> = ({ seed, playerPosition, modifiedBlocks, chunkVersions, renderDistance, visualStyle }) => {
  const { camera } = useThree();
  const noise = useMemo(() => new SimplexNoise(seed), [seed]);
  const [visibleChunks, setVisibleChunks] = useState<string[]>([]);
  const currentChunkRef = useRef<{x: number, z: number, dist: number} | null>(null);

  useFrame(() => {
    if (!playerPosition.current) return;

    const pX = playerPosition.current.x;
    const pZ = playerPosition.current.z;
    
    const chunkX = Math.floor(pX / Config.CHUNK_SIZE);
    const chunkZ = Math.floor(pZ / Config.CHUNK_SIZE);

    if (!currentChunkRef.current || 
        currentChunkRef.current.x !== chunkX || 
        currentChunkRef.current.z !== chunkZ ||
        currentChunkRef.current.dist !== renderDistance
    ) {
        currentChunkRef.current = { x: chunkX, z: chunkZ, dist: renderDistance };
        
        const newChunks: string[] = [];
        for (let x = -renderDistance; x <= renderDistance; x++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
                if (x*x + z*z <= renderDistance*renderDistance) {
                    newChunks.push(`${chunkX + x},${chunkZ + z}`);
                }
            }
        }
        setVisibleChunks(newChunks);
    }
  });
  
  const CULLING_DISTANCE_FACTOR = 1.2;
  const maxDist = renderDistance * Config.CHUNK_SIZE * CULLING_DISTANCE_FACTOR;
  const maxDistSq = maxDist * maxDist;
  const chunkCenter = new THREE.Vector3();

  return (
    <group>
      {visibleChunks.map(key => {
        const [x, z] = key.split(',').map(Number);
        
        // Calculate chunk center position for distance culling
        chunkCenter.set(
            x * Config.CHUNK_SIZE + Config.CHUNK_SIZE / 2,
            camera.position.y, // Check on a 2D plane relative to camera height for better culling
            z * Config.CHUNK_SIZE + Config.CHUNK_SIZE / 2
        );

        // Perform distance culling on the CPU
        if (camera.position.distanceToSquared(chunkCenter) > maxDistSq) {
            return null; // Skip rendering this chunk entirely
        }

        return <Chunk key={key} chunkX={x} chunkZ={z} noise={noise} modifiedBlocks={modifiedBlocks} version={chunkVersions.get(key) || 0} visualStyle={visualStyle} />;
      })}
    </group>
  );
};
