
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BLOCK } from '../engine/world/BlockRegistry';
import { Config } from '../engine/core/Config';

interface CropSystemProps {
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  updateChunkVersions: (keys: string[]) => void;
}

export const CropSystem: React.FC<CropSystemProps> = ({ modifiedBlocks, updateChunkVersions }) => {
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    // Simulate "Random Tick" every 1 second for a batch of crops
    if (time - lastUpdate.current > 1.0) {
      lastUpdate.current = time;
      
      const updates = new Map<string, number>();
      const affectedChunks = new Set<string>();

      // In a real optimized system, we would track crops separately. 
      // For now, we scan modifiedBlocks. Note: This only grows crops placed by player or generated logic that adds to modifiedBlocks.
      for (const [key, type] of modifiedBlocks.current.entries()) {
        if (type >= BLOCK.WHEAT_STAGE_0 && type <= BLOCK.WHEAT_STAGE_2) {
            // 10% chance to grow per second (fast for gameplay feeling)
            if (Math.random() < 0.10) {
                const nextStage = type + 1;
                updates.set(key, nextStage);
                const [x, , z] = key.split(',').map(Number);
                affectedChunks.add(`${Math.floor(x / Config.CHUNK_SIZE)},${Math.floor(z / Config.CHUNK_SIZE)}`);
            }
        }
      }

      if (updates.size > 0) {
          for (const [key, type] of updates.entries()) {
              modifiedBlocks.current.set(key, type);
          }
          updateChunkVersions(Array.from(affectedChunks));
      }
    }
  });

  return null;
};
