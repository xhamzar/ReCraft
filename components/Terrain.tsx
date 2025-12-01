import React, { useRef, useMemo, useState, useEffect } from 'react';
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
  
  // State for chunks actually being rendered
  const [renderedChunks, setRenderedChunks] = useState<string[]>([]);
  
  // Queue system logic
  const targetChunksRef = useRef<Set<string>>(new Set());
  
  const currentChunkRef = useRef<{x: number, z: number, dist: number} | null>(null);
  const lastUpdateRef = useRef(0);

  // CRITICAL FIX: Reset everything when seed changes (Multiplayer Join)
  useEffect(() => {
    setRenderedChunks([]);
    currentChunkRef.current = null;
    targetChunksRef.current.clear();
  }, [seed]);

  useFrame((state) => {
    if (!playerPosition.current) return;

    const time = state.clock.getElapsedTime();
    
    // THROTTLE: Only check for new chunks every 0.15 seconds to prevent micro-stutters
    if (time - lastUpdateRef.current < 0.15) {
        return;
    }
    lastUpdateRef.current = time;

    const pX = playerPosition.current.x;
    const pZ = playerPosition.current.z;
    
    const chunkX = Math.floor(pX / Config.CHUNK_SIZE);
    const chunkZ = Math.floor(pZ / Config.CHUNK_SIZE);

    // 1. Determine Target Chunks (What SHOULD be visible)
    // Re-calculate only if player moved to a new chunk or render distance changed
    if (!currentChunkRef.current || 
        currentChunkRef.current.x !== chunkX || 
        currentChunkRef.current.z !== chunkZ ||
        currentChunkRef.current.dist !== renderDistance
    ) {
        currentChunkRef.current = { x: chunkX, z: chunkZ, dist: renderDistance };
        
        const newTarget = new Set<string>();
        // Scan radius
        for (let x = -renderDistance; x <= renderDistance; x++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
                if (x*x + z*z <= renderDistance*renderDistance) {
                    newTarget.add(`${chunkX + x},${chunkZ + z}`);
                }
            }
        }
        targetChunksRef.current = newTarget;
    }

    // 2. Incremental Loading/Unloading
    setRenderedChunks(current => {
        const toRemove: string[] = [];
        const toAdd: string[] = [];
        const currentSet = new Set(current);

        // A. Remove chunks that are far away IMMEDIATELY
        for (const key of current) {
            if (!targetChunksRef.current.has(key)) {
                toRemove.push(key);
            }
        }
        
        // Return early if we need to remove chunks (cleanup first)
        if (toRemove.length > 0) {
            return current.filter(k => targetChunksRef.current.has(k));
        }

        // B. Add new chunks (Increased batch size slightly due to throttling)
        for (const key of targetChunksRef.current) {
            if (!currentSet.has(key)) {
                toAdd.push(key);
                if (toAdd.length >= 3) break; // Load up to 3 chunks per check
            }
        }

        if (toAdd.length > 0) {
            return [...current, ...toAdd];
        }

        return current;
    });
  });
  
  // Optimization: Pre-calculate culling vars
  const CULLING_DISTANCE_FACTOR = 1.3; 
  const maxDist = renderDistance * Config.CHUNK_SIZE * CULLING_DISTANCE_FACTOR;
  const maxDistSq = maxDist * maxDist;
  const chunkCenter = new THREE.Vector3();

  return (
    <group>
      {renderedChunks.map(key => {
        const [x, z] = key.split(',').map(Number);
        
        // Extra safety check for distance culling on the CPU
        chunkCenter.set(
            x * Config.CHUNK_SIZE + Config.CHUNK_SIZE / 2,
            camera.position.y, 
            z * Config.CHUNK_SIZE + Config.CHUNK_SIZE / 2
        );

        if (camera.position.distanceToSquared(chunkCenter) > maxDistSq) {
            return null;
        }

        return <Chunk key={key} chunkX={x} chunkZ={z} noise={noise} modifiedBlocks={modifiedBlocks} version={chunkVersions.get(key) || 0} visualStyle={visualStyle} />;
      })}
    </group>
  );
};