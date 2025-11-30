import * as THREE from 'three';
import { SimplexNoise } from '../math/Noise';
import { BLOCK, BLOCK_DEFS } from '../world/BlockRegistry';
import { getBlock } from '../world/WorldGen';
import { AABB } from '../math/AABB';

// --- POOLING SYSTEM ---
// Increased POOL_SIZE to prevent overwrites in complex scenes (e.g. many mobs + complex terrain)
const POOL_SIZE = 1000;
const aabbPool: AABB[] = [];
let poolIndex = 0;

// Initialize pool
for (let i = 0; i < POOL_SIZE; i++) {
    aabbPool.push({ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 });
}

const getAABB = (minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): AABB => {
    if (poolIndex >= POOL_SIZE) poolIndex = 0; // Reset cyclic buffer
    const box = aabbPool[poolIndex++];
    box.minX = minX; box.maxX = maxX;
    box.minY = minY; box.maxY = maxY;
    box.minZ = minZ; box.maxZ = maxZ;
    return box;
};

// Reuse this array for candidates instead of creating a new one every frame
const sharedCandidates: AABB[] = [];

// Helper to check if a block is any type of water
const isWater = (type: number) => {
    return type === BLOCK.WATER || type === BLOCK.WATER_FLOW_1 || type === BLOCK.WATER_FLOW_2 || type === BLOCK.WATER_FLOW_3;
};

const intersectAABB = (a: AABB, b: AABB): boolean => {
    return (
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY &&
        a.minZ < b.maxZ && a.maxZ > b.minZ
    );
};

const fillCandidateBlocks = (box: AABB, noise: SimplexNoise, modifiedBlocks: Map<string, number>) => {
    sharedCandidates.length = 0; // Clear array without deallocating
    
    const startX = Math.floor(box.minX);
    const endX = Math.ceil(box.maxX);
    const startY = Math.floor(box.minY);
    const endY = Math.ceil(box.maxY);
    const startZ = Math.floor(box.minZ);
    const endZ = Math.ceil(box.maxZ);

    const isConnectable = (nType: number) => {
        if (nType === BLOCK.AIR) return false;
        if (nType === BLOCK.FENCE) return true;
        const def = BLOCK_DEFS[nType];
        if (def && def.solid && nType !== BLOCK.CACTUS && nType !== BLOCK.LEAF && nType !== BLOCK.PINE_LEAF && nType !== BLOCK.TORCH) return true;
        return false;
    };

    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            for (let z = startZ; z <= endZ; z++) {
                const type = getBlock(x, y, z, noise, modifiedBlocks);
                
                if (type === BLOCK.AIR || isWater(type) || 
                    (type >= BLOCK.WHEAT_STAGE_0 && type <= BLOCK.WHEAT_STAGE_3) ||
                    type === BLOCK.TALL_GRASS || type === BLOCK.RED_FLOWER || type === BLOCK.YELLOW_FLOWER ||
                    (type >= BLOCK.TORCH && type <= BLOCK.TORCH_WEST)) { 
                    continue;
                }
                
                const def = BLOCK_DEFS[type];
                if (!def || !def.solid) continue;

                const isWoodStair = type >= BLOCK.STAIR_NORTH && type <= BLOCK.STAIR_WEST;
                const isCobbleStair = type >= BLOCK.COBBLESTONE_STAIR_NORTH && type <= BLOCK.COBBLESTONE_STAIR_WEST;
                const isBed = type >= BLOCK.BED_FOOT_NORTH && type <= BLOCK.BED_HEAD_WEST;

                if (isWoodStair || isCobbleStair) {
                    sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y - 0.5, y, z - 0.5, z + 0.5));
                    
                    const isNorth = type === BLOCK.STAIR_NORTH || type === BLOCK.COBBLESTONE_STAIR_NORTH;
                    const isSouth = type === BLOCK.STAIR_SOUTH || type === BLOCK.COBBLESTONE_STAIR_SOUTH;
                    const isEast = type === BLOCK.STAIR_EAST || type === BLOCK.COBBLESTONE_STAIR_EAST;
                    
                    if (isNorth) {
                        sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y, y + 0.5, z - 0.5, z));
                    } else if (isSouth) {
                        sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y, y + 0.5, z, z + 0.5));
                    } else if (isEast) {
                        sharedCandidates.push(getAABB(x, x + 0.5, y, y + 0.5, z - 0.5, z + 0.5));
                    } else { // WEST
                        sharedCandidates.push(getAABB(x - 0.5, x, y, y + 0.5, z - 0.5, z + 0.5));
                    }
                } else if (isBed) {
                        sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y - 0.5, y + 0.06, z - 0.5, z + 0.5));
                } else if (type === BLOCK.CACTUS) {
                        sharedCandidates.push(getAABB(x - 0.4, x + 0.4, y - 0.5, y + 0.5, z - 0.4, z + 0.4));
                } else if (type === BLOCK.FENCE) {
                        const connectN = isConnectable(getBlock(x, y, z - 1, noise, modifiedBlocks));
                        const connectS = isConnectable(getBlock(x, y, z + 1, noise, modifiedBlocks));
                        const connectW = isConnectable(getBlock(x - 1, y, z, noise, modifiedBlocks));
                        const connectE = isConnectable(getBlock(x + 1, y, z, noise, modifiedBlocks));

                        let minX = x - 0.125;
                        let maxX = x + 0.125;
                        let minZ = z - 0.125;
                        let maxZ = z + 0.125;
                        
                        if (connectW) minX = x - 0.5;
                        if (connectE) maxX = x + 0.5;
                        if (connectN) minZ = z - 0.5;
                        if (connectS) maxZ = z + 0.5;
                        
                        sharedCandidates.push(getAABB(minX, maxX, y - 0.5, y + 1.0, minZ, maxZ));
                } else if (type === BLOCK.DOOR_BOTTOM || type === BLOCK.DOOR_TOP) {
                    sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y - 0.5, y + 0.5, z - 0.1, z + 0.1));
                } else if (type === BLOCK.DOOR_BOTTOM_OPEN || type === BLOCK.DOOR_TOP_OPEN) {
                    // Open door collision (usually minimal or side, ignoring for simplicity or adding specialized side AABB)
                } else if (type === BLOCK.FARMLAND) {
                        sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y - 0.5, y + 0.4375, z - 0.5, z + 0.5));
                } else {
                    sharedCandidates.push(getAABB(x - 0.5, x + 0.5, y - 0.5, y + 0.5, z - 0.5, z + 0.5));
                }
            }
        }
    }
};

const performPhysicsStep = (
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dims: { width: number, height: number },
    stepDt: number,
    noise: SimplexNoise,
    modifiedBlocks: Map<string, number>
) => {
    let grounded = false;
    const stepHeight = 0.6;
    
    // Check Water Status (Check block at center body)
    const centerBlock = getBlock(position.x, position.y + dims.height / 2, position.z, noise, modifiedBlocks);
    const inWater = isWater(centerBlock);

    // Apply Forces
    if (inWater) {
        velocity.y -= 5.0 * stepDt; 
        velocity.x *= 0.8;
        velocity.z *= 0.8;
        velocity.y *= 0.9;
        if (velocity.y < -3) velocity.y = -3;
    } else {
        velocity.y -= 25.0 * stepDt;
        if (velocity.y < -30) velocity.y = -30;
    }

    const halfW = dims.width / 2;

    // 1. Move X
    position.x += velocity.x * stepDt;
    let box = getAABB(position.x - halfW, position.x + halfW, position.y, position.y + dims.height, position.z - halfW, position.z + halfW);
    fillCandidateBlocks(box, noise, modifiedBlocks);
    
    for (const blockBox of sharedCandidates) {
        if (intersectAABB(box, blockBox)) {
            const overlapY = blockBox.maxY - position.y;
            if (overlapY > 0 && overlapY <= stepHeight) {
                const targetY = blockBox.maxY + 0.001;
                position.y = targetY; 
                continue; 
            }
            if (velocity.x > 0) position.x = blockBox.minX - dims.width / 2 - 0.001;
            else if (velocity.x < 0) position.x = blockBox.maxX + dims.width / 2 + 0.001;
            velocity.x = 0;
            // Update box for next axis
            box.minX = position.x - halfW; box.maxX = position.x + halfW;
        }
    }

    // 2. Move Z 
    position.z += velocity.z * stepDt;
    box.minZ = position.z - halfW; box.maxZ = position.z + halfW;
    fillCandidateBlocks(box, noise, modifiedBlocks);

    for (const blockBox of sharedCandidates) {
        if (intersectAABB(box, blockBox)) {
            const overlapY = blockBox.maxY - position.y;
            if (overlapY > 0 && overlapY <= stepHeight) {
                const targetY = blockBox.maxY + 0.001;
                position.y = targetY; 
                continue; 
            }
            if (velocity.z > 0) position.z = blockBox.minZ - dims.width / 2 - 0.001;
            else if (velocity.z < 0) position.z = blockBox.maxZ + dims.width / 2 + 0.001;
            velocity.z = 0;
            box.minZ = position.z - halfW; box.maxZ = position.z + halfW;
        }
    }

    // 3. Move Y
    position.y += velocity.y * stepDt;
    box.minY = position.y; box.maxY = position.y + dims.height;
    fillCandidateBlocks(box, noise, modifiedBlocks);

    for (const blockBox of sharedCandidates) {
        if (intersectAABB(box, blockBox)) {
            if (velocity.y > 0) { position.y = blockBox.minY - dims.height - 0.001; velocity.y = 0; } 
            else if (velocity.y < 0) { position.y = blockBox.maxY + 0.001; velocity.y = 0; grounded = true; }
            box.minY = position.y; box.maxY = position.y + dims.height;
        }
    }
    
    if (position.y < -20) position.y = -20;

    return { grounded, inWater };
};

export const applyPhysics = (
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dims: { width: number, height: number },
    dt: number,
    noise: SimplexNoise,
    modifiedBlocks: Map<string, number>
) => {
    // Sub-stepping logic to prevent tunneling at high speeds or low frame rates
    // If we move more than 0.4 units per step, split it.
    const maxSpeed = Math.max(Math.abs(velocity.x), Math.abs(velocity.y), Math.abs(velocity.z));
    // Ensure at least 1 step, and max step size is small enough to catch all collisions
    const steps = Math.ceil(Math.max(1, (maxSpeed * dt) / 0.4));
    const stepDt = dt / steps;

    let finalGrounded = false;
    let finalInWater = false;

    for (let i = 0; i < steps; i++) {
        const result = performPhysicsStep(position, velocity, dims, stepDt, noise, modifiedBlocks);
        // We take the final state, but if we grounded in any sub-step and stay grounded, it should persist.
        // Actually, typically the last step dictates the final state for the next frame logic.
        finalGrounded = result.grounded;
        finalInWater = result.inWater;
    }

    return { grounded: finalGrounded, inWater: finalInWater };
};