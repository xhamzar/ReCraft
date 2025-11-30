
import React from 'react';
import { SimplexNoise } from '../math/Noise';
import { BLOCK } from './BlockRegistry';
import { getBlock } from './WorldGen';
import * as THREE from 'three';
import { Config } from '../core/Config';

const waterUpdateQueue = new Set<string>();
const NEIGHBORS = [ { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 } ];

export const addToWaterQueue = (x: number, y: number, z: number) => {
    const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    waterUpdateQueue.add(key);
};

const isWater = (type: number) => {
    return type === BLOCK.WATER || type === BLOCK.WATER_FLOW_1 || type === BLOCK.WATER_FLOW_2 || type === BLOCK.WATER_FLOW_3;
};

const isPassable = (type: number) => {
    return type === BLOCK.AIR || type === BLOCK.TALL_GRASS || type === BLOCK.RED_FLOWER || type === BLOCK.YELLOW_FLOWER || type === BLOCK.WHEAT;
};

const getNextFlowBlock = (currentType: number) => {
    if (currentType === BLOCK.WATER) return BLOCK.WATER_FLOW_1;
    if (currentType === BLOCK.WATER_FLOW_1) return BLOCK.WATER_FLOW_2;
    if (currentType === BLOCK.WATER_FLOW_2) return BLOCK.WATER_FLOW_3;
    return BLOCK.AIR;
};

export const updateFluids = (
    _playerPosition: THREE.Vector3,
    noise: SimplexNoise,
    modifiedBlocks: Map<string, number>,
    updateChunkVersions: (keys: string[]) => void
) => {
    if (waterUpdateQueue.size === 0) return;

    const changes = new Map<string, number>();
    const nextQueue = new Set<string>();

    const getB = (x: number, y: number, z: number) => {
        const key = `${x},${y},${z}`;
        if (changes.has(key)) return changes.get(key)!;
        return getBlock(x, y, z, noise, modifiedBlocks);
    };

    const currentWork = Array.from(waterUpdateQueue);
    waterUpdateQueue.clear(); 

    for (const key of currentWork) {
        const [x, y, z] = key.split(',').map(Number);
        const currentBlock = getBlock(x, y, z, noise, modifiedBlocks);
        
        if (isWater(currentBlock)) {
            const belowKey = `${x},${y - 1},${z}`;
            const belowBlock = getBlock(x, y - 1, z, noise, modifiedBlocks);

            if (isPassable(belowBlock) && !isWater(belowBlock)) {
                changes.set(belowKey, BLOCK.WATER_FLOW_1);
                nextQueue.add(belowKey); 
                nextQueue.add(key); 
            } else if (!isWater(belowBlock)) {
                const nextFlow = getNextFlowBlock(currentBlock);
                if (nextFlow !== BLOCK.AIR) {
                    for (const dir of NEIGHBORS) {
                        const nx = x + dir.x;
                        const nz = z + dir.z;
                        const neighborKey = `${nx},${y},${nz}`;
                        const neighborBlock = getBlock(nx, y, nz, noise, modifiedBlocks);

                        if (isPassable(neighborBlock) && !isWater(neighborBlock)) {
                            changes.set(neighborKey, nextFlow);
                            nextQueue.add(neighborKey);
                            nextQueue.add(key); 
                        }
                    }
                }
            }
        }
    }

    if (changes.size > 0) {
        const affectedChunks = new Set<string>();
        for (const [key, type] of changes.entries()) {
            modifiedBlocks.set(key, type);
            const [x, , z] = key.split(',').map(Number);
            affectedChunks.add(`${Math.floor(x / Config.CHUNK_SIZE)},${Math.floor(z / Config.CHUNK_SIZE)}`);
        }
        
        for(const key of nextQueue) {
            const [x, , z] = key.split(',').map(Number);
            affectedChunks.add(`${Math.floor(x / Config.CHUNK_SIZE)},${Math.floor(z / Config.CHUNK_SIZE)}`);
            waterUpdateQueue.add(key);
        }
        
        if (affectedChunks.size > 0) {
            updateChunkVersions(Array.from(affectedChunks));
        }
    }
};
