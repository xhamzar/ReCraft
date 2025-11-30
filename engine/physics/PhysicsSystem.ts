import * as THREE from 'three';
import { SimplexNoise } from '../math/Noise';
import { BLOCK, BLOCK_DEFS } from '../world/BlockRegistry';
import { getBlock } from '../world/WorldGen';
import { AABB } from '../math/AABB';

export const createAABB = (pos: THREE.Vector3, width: number, height: number): AABB => {
    const halfW = width / 2;
    return {
        minX: pos.x - halfW, minY: pos.y, minZ: pos.z - halfW,
        maxX: pos.x + halfW, maxY: pos.y + height, maxZ: pos.z + halfW
    };
};

const intersectAABB = (a: AABB, b: AABB): boolean => {
    return (
        a.minX < b.maxX && a.maxX > b.minX &&
        a.minY < b.maxY && a.maxY > b.minY &&
        a.minZ < b.maxZ && a.maxZ > b.minZ
    );
};

// Helper to check if a block is any type of water
const isWater = (type: number) => {
    return type === BLOCK.WATER || type === BLOCK.WATER_FLOW_1 || type === BLOCK.WATER_FLOW_2 || type === BLOCK.WATER_FLOW_3;
};

const getCandidateBlocks = (box: AABB, noise: SimplexNoise, modifiedBlocks: Map<string, number>): AABB[] => {
    const boxes: AABB[] = [];
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
                
                // Exclude Passable Blocks & Water
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
                    // Common bottom slab
                    boxes.push({ minX: x - 0.5, maxX: x + 0.5, minY: y - 0.5, maxY: y, minZ: z - 0.5, maxZ: z + 0.5 });
                    
                    const isNorth = type === BLOCK.STAIR_NORTH || type === BLOCK.COBBLESTONE_STAIR_NORTH;
                    const isSouth = type === BLOCK.STAIR_SOUTH || type === BLOCK.COBBLESTONE_STAIR_SOUTH;
                    const isEast = type === BLOCK.STAIR_EAST || type === BLOCK.COBBLESTONE_STAIR_EAST;
                    
                    // Top slab depends on rotation
                    if (isNorth) {
                        boxes.push({ minX: x - 0.5, maxX: x + 0.5, minY: y, maxY: y + 0.5, minZ: z - 0.5, maxZ: z });
                    } else if (isSouth) {
                        boxes.push({ minX: x - 0.5, maxX: x + 0.5, minY: y, maxY: y + 0.5, minZ: z, maxZ: z + 0.5 });
                    } else if (isEast) {
                        boxes.push({ minX: x, maxX: x + 0.5, minY: y, maxY: y + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
                    } else { // WEST
                        boxes.push({ minX: x - 0.5, maxX: x, minY: y, maxY: y + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
                    }
                } else if (isBed) {
                        boxes.push({ minX: x - 0.5, minY: y - 0.5, minZ: z - 0.5, maxX: x + 0.5, maxY: y + 0.06, maxZ: z + 0.5 });
                } else if (type === BLOCK.CACTUS) {
                        boxes.push({ minX: x - 0.4, minY: y - 0.5, minZ: z - 0.4, maxX: x + 0.4, maxY: y + 0.5, maxZ: z + 0.4 });
                } else if (type === BLOCK.FENCE) {
                        const connectN = isConnectable(getBlock(x, y, z - 1, noise, modifiedBlocks));
                        const connectS = isConnectable(getBlock(x, y, z + 1, noise, modifiedBlocks));
                        const connectW = isConnectable(getBlock(x - 1, y, z, noise, modifiedBlocks));
                        const connectE = isConnectable(getBlock(x + 1, y, z, noise, modifiedBlocks));

                        // A single, expandable AABB
                        let minX = x - 0.125;
                        let maxX = x + 0.125;
                        let minZ = z - 0.125;
                        let maxZ = z + 0.125;
                        
                        if (connectW) minX = x - 0.5;
                        if (connectE) maxX = x + 0.5;
                        if (connectN) minZ = z - 0.5;
                        if (connectS) maxZ = z + 0.5;
                        
                        boxes.push({ minX, maxX, minY: y - 0.5, maxY: y + 1.0, minZ, maxZ });
                } else if (type === BLOCK.DOOR_BOTTOM || type === BLOCK.DOOR_TOP) {
                    boxes.push({ minX: x - 0.5, maxX: x + 0.5, minY: y - 0.5, maxY: y + 0.5, minZ: z - 0.1, maxZ: z + 0.1 });
                } else if (type === BLOCK.DOOR_BOTTOM_OPEN || type === BLOCK.DOOR_TOP_OPEN) {
                } else if (type === BLOCK.FARMLAND) {
                        boxes.push({ minX: x - 0.5, minY: y - 0.5, minZ: z - 0.5, maxX: x + 0.5, maxY: y + 0.4375, maxZ: z + 0.5 });
                } else {
                    boxes.push({ minX: x - 0.5, minY: y - 0.5, minZ: z - 0.5, maxX: x + 0.5, maxY: y + 0.5, maxZ: z + 0.5 });
                }
            }
        }
    }
    return boxes;
};

export const applyPhysics = (
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    dims: { width: number, height: number },
    dt: number,
    noise: SimplexNoise,
    modifiedBlocks: Map<string, number>
) => {
    const grounded = { value: false };
    const stepHeight = 0.6; 
    
    // Check Water Status (Check block at center body)
    const centerBlock = getBlock(position.x, position.y + dims.height / 2, position.z, noise, modifiedBlocks);
    const inWater = isWater(centerBlock);

    // Apply Forces
    if (inWater) {
        // Water Physics
        velocity.y -= 5.0 * dt; 
        
        velocity.x *= 0.8;
        velocity.z *= 0.8;
        velocity.y *= 0.9;
        
        if (velocity.y < -3) velocity.y = -3;
    } else {
        // Air/Ground Physics
        velocity.y -= 25.0 * dt;
        if (velocity.y < -30) velocity.y = -30;
    }

    // 1. Move X
    position.x += velocity.x * dt;
    let box = createAABB(position, dims.width, dims.height);
    let candidates = getCandidateBlocks(box, noise, modifiedBlocks);
    
    for (const blockBox of candidates) {
        if (intersectAABB(box, blockBox)) {
            const overlapY = blockBox.maxY - position.y;
            if (overlapY > 0 && overlapY <= stepHeight) {
                const targetY = blockBox.maxY + 0.001;
                const testBox = createAABB({ ...position, y: targetY } as THREE.Vector3, dims.width, dims.height);
                const stepCandidates = getCandidateBlocks(testBox, noise, modifiedBlocks);
                let canStep = true;
                for (const cb of stepCandidates) {
                    if (intersectAABB(testBox, cb)) { canStep = false; break; }
                }
                if (canStep) { position.y = targetY; continue; }
            }
            if (velocity.x > 0) position.x = blockBox.minX - dims.width / 2 - 0.001;
            else if (velocity.x < 0) position.x = blockBox.maxX + dims.width / 2 + 0.001;
            velocity.x = 0;
            box = createAABB(position, dims.width, dims.height);
        }
    }

    // 2. Move Z 
    position.z += velocity.z * dt;
    box = createAABB(position, dims.width, dims.height);
    candidates = getCandidateBlocks(box, noise, modifiedBlocks);

    for (const blockBox of candidates) {
        if (intersectAABB(box, blockBox)) {
            const overlapY = blockBox.maxY - position.y;
            if (overlapY > 0 && overlapY <= stepHeight) {
                const targetY = blockBox.maxY + 0.001;
                const testBox = createAABB({ ...position, y: targetY } as THREE.Vector3, dims.width, dims.height);
                const stepCandidates = getCandidateBlocks(testBox, noise, modifiedBlocks);
                let canStep = true;
                for (const cb of stepCandidates) {
                    if (intersectAABB(testBox, cb)) { canStep = false; break; }
                }
                if (canStep) { position.y = targetY; continue; }
            }
            if (velocity.z > 0) position.z = blockBox.minZ - dims.width / 2 - 0.001;
            else if (velocity.z < 0) position.z = blockBox.maxZ + dims.width / 2 + 0.001;
            velocity.z = 0;
            box = createAABB(position, dims.width, dims.height);
        }
    }

    // 3. Move Y
    position.y += velocity.y * dt;
    box = createAABB(position, dims.width, dims.height);
    candidates = getCandidateBlocks(box, noise, modifiedBlocks);

    for (const blockBox of candidates) {
        if (intersectAABB(box, blockBox)) {
            if (velocity.y > 0) { position.y = blockBox.minY - dims.height - 0.001; velocity.y = 0; } 
            else if (velocity.y < 0) { position.y = blockBox.maxY + 0.001; velocity.y = 0; grounded.value = true; }
            box = createAABB(position, dims.width, dims.height);
        }
    }
    
    if (position.y < -20) position.y = -20;

    return { grounded: grounded.value, inWater };
};