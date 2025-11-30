import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SimplexNoise } from '../engine/math/Noise';
import { getBlock } from '../engine/world/WorldGen';
import { BLOCK } from '../engine/world/BlockRegistry';
import { addToWaterQueue } from '../engine/world/WaterSystem';
import { Config } from '../engine/core/Config';
import { getItemDef } from '../engine/items/ItemRegistry';
import { ItemStack } from '../types';

export interface InteractionControllerHandle {
  handleTap: (x: number, y: number) => void;
  handleRadiusBreak: (x: number, y: number) => void;
}

interface InteractionControllerProps {
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  terrainSeed: number;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  playerRotationRef: React.MutableRefObject<THREE.Quaternion>;
  updateChunkVersions: (keys: string[]) => void;
  selectedItem: ItemStack;
  onSleep: () => void;
  onDropItem: (blockId: number, x: number, y: number, z: number) => void;
  onPlace: () => void;
  onOpenCraftingTable: () => void;
}

const isWater = (type: number) => {
    return type === BLOCK.WATER || type === BLOCK.WATER_FLOW_1 || type === BLOCK.WATER_FLOW_2 || type === BLOCK.WATER_FLOW_3;
};

const ALL_NEIGHBORS = [ {x:1,y:0,z:0}, {x:-1,y:0,z:0}, {x:0,y:1,z:0}, {x:0,y:-1,z:0}, {x:0,y:0,z:1}, {x:0,y:0,z:-1} ];

export const InteractionController = forwardRef<InteractionControllerHandle, InteractionControllerProps>(
  ({ modifiedBlocks, terrainSeed, playerPositionRef, playerRotationRef, updateChunkVersions, selectedItem, onSleep, onDropItem, onPlace, onOpenCraftingTable }, ref) => {
    const { camera, raycaster, scene } = useThree();
    const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);

    useImperativeHandle(ref, () => ({
      handleTap: (clientX: number, clientY: number) => {
        const x = (clientX / window.innerWidth) * 2 - 1;
        const y = -(clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera({ x, y }, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => i.object.userData?.isTerrain);
        if (!hit || !hit.face) return;

        // 1. Check for Interactable Blocks first (Priority over placement)
        const breakPosVec = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.5));
        const bx = Math.round(breakPosVec.x);
        const by = Math.round(breakPosVec.y);
        const bz = Math.round(breakPosVec.z);
        
        if (breakPosVec.distanceTo(playerPositionRef.current) > 10) return;

        const type = getBlock(bx, by, bz, noise, modifiedBlocks.current);
        const affectedChunks = new Set<string>();
        affectedChunks.add(`${Math.floor(bx / Config.CHUNK_SIZE)},${Math.floor(bz / Config.CHUNK_SIZE)}`);

        // Doors Interaction
        if (type >= BLOCK.DOOR_BOTTOM && type <= BLOCK.DOOR_TOP_OPEN) {
            const isBottom = (type === BLOCK.DOOR_BOTTOM || type === BLOCK.DOOR_BOTTOM_OPEN);
            const isOpen = (type === BLOCK.DOOR_BOTTOM_OPEN || type === BLOCK.DOOR_TOP_OPEN);
            const bottomY = isBottom ? by : by - 1;
            const topY = isBottom ? by + 1 : by;
            const newBottom = isOpen ? BLOCK.DOOR_BOTTOM : BLOCK.DOOR_BOTTOM_OPEN;
            const newTop = isOpen ? BLOCK.DOOR_TOP : BLOCK.DOOR_TOP_OPEN;
            modifiedBlocks.current.set(`${bx},${bottomY},${bz}`, newBottom);
            modifiedBlocks.current.set(`${bx},${topY},${bz}`, newTop);
            updateChunkVersions(Array.from(affectedChunks));
            return;
        } 
        
        // Bed Interaction (Sleep)
        if (type >= BLOCK.BED_FOOT_NORTH && type <= BLOCK.BED_HEAD_WEST) {
            onSleep();
            return;
        }

        // Crafting Table Interaction
        if (type === BLOCK.CRAFTING_TABLE) {
            onOpenCraftingTable();
            return;
        }

        // 2. Place Block logic
        const selectedBlockId = selectedItem.id;
        const itemDef = getItemDef(selectedBlockId);
        // Ensure we have item in stack
        const hasItem = selectedItem.count > 0 && selectedItem.id !== BLOCK.AIR;
        // Seeds are not "isBlock: true" but act like one for placement logic here
        const canPlace = hasItem && ((itemDef && itemDef.isBlock) || selectedBlockId === BLOCK.SEEDS);

        if (canPlace) {
            const placePosVec = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5));
            const placePos = { x: Math.round(placePosVec.x), y: Math.round(placePosVec.y), z: Math.round(placePosVec.z) };

            const pPos = playerPositionRef.current;
            if (Math.abs(placePos.x - pPos.x) < 0.6 && Math.abs(placePos.z - pPos.z) < 0.6 && placePos.y - pPos.y > -1.5 && placePos.y - pPos.y < 1.0) return;

            const placeAffectedChunks = new Set<string>();
            placeAffectedChunks.add(`${Math.floor(placePos.x / Config.CHUNK_SIZE)},${Math.floor(placePos.z / Config.CHUNK_SIZE)}`);
            let placed = false;
            
            // Special Logic: Seeds on Farmland
            if (selectedBlockId === BLOCK.SEEDS) {
                const blockBelow = getBlock(placePos.x, placePos.y - 1, placePos.z, noise, modifiedBlocks.current);
                const blockAt = getBlock(placePos.x, placePos.y, placePos.z, noise, modifiedBlocks.current);
                
                if (blockBelow === BLOCK.FARMLAND && (blockAt === BLOCK.AIR || isWater(blockAt))) {
                    modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, BLOCK.WHEAT_STAGE_0);
                    placed = true;
                }
            } else if (selectedBlockId === BLOCK.STAIR || selectedBlockId === BLOCK.COBBLESTONE_STAIR) {
                const baseDir = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRotationRef.current).normalize();
                let blockToPlace: number;
                const baseStair = selectedBlockId === BLOCK.STAIR ? BLOCK.STAIR_NORTH : BLOCK.COBBLESTONE_STAIR_NORTH;
                if (Math.abs(baseDir.x) > Math.abs(baseDir.z)) {
                    blockToPlace = baseDir.x > 0 ? baseStair + 1 : baseStair + 3;
                } else {
                    blockToPlace = baseDir.z > 0 ? baseStair + 2 : baseStair + 0;
                }
                modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, blockToPlace);
                placed = true;
            } else if (selectedBlockId === BLOCK.DOOR_BOTTOM) {
                const aboveType = getBlock(placePos.x, placePos.y + 1, placePos.z, noise, modifiedBlocks.current);
                if (aboveType === BLOCK.AIR || isWater(aboveType)) {
                    modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, BLOCK.DOOR_BOTTOM);
                    modifiedBlocks.current.set(`${placePos.x},${placePos.y + 1},${placePos.z}`, BLOCK.DOOR_TOP);
                    placed = true;
                }
            } else if (selectedBlockId === BLOCK.BED_ITEM) {
                const baseDir = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRotationRef.current).normalize();
                let headX = placePos.x;
                let headZ = placePos.z;
                let directionIdx = 0; 
                
                if (Math.abs(baseDir.x) > Math.abs(baseDir.z)) {
                     if (baseDir.x > 0) { directionIdx = 1; headX += 1; } // East
                     else { directionIdx = 3; headX -= 1; } // West
                } else {
                     if (baseDir.z > 0) { directionIdx = 2; headZ += 1; } // South
                     else { directionIdx = 0; headZ -= 1; } // North
                }
                
                const headType = getBlock(headX, placePos.y, headZ, noise, modifiedBlocks.current);
                
                if (headType === BLOCK.AIR || isWater(headType)) {
                     const footBlock = BLOCK.BED_FOOT_NORTH + directionIdx;
                     const headBlock = BLOCK.BED_HEAD_NORTH + directionIdx;
                     modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, footBlock);
                     modifiedBlocks.current.set(`${headX},${placePos.y},${headZ}`, headBlock);
                     placeAffectedChunks.add(`${Math.floor(headX / Config.CHUNK_SIZE)},${Math.floor(headZ / Config.CHUNK_SIZE)}`);
                     placed = true;
                }
            } else if (selectedBlockId === BLOCK.TORCH) {
                const nx = hit.face.normal.x;
                const ny = hit.face.normal.y;
                const nz = hit.face.normal.z;
                
                let torchBlock = BLOCK.TORCH;
                
                if (ny > 0.5) {
                    torchBlock = BLOCK.TORCH;
                } else if (nx > 0.5) {
                    torchBlock = BLOCK.TORCH_WEST;
                } else if (nx < -0.5) {
                    torchBlock = BLOCK.TORCH_EAST;
                } else if (nz > 0.5) {
                    torchBlock = BLOCK.TORCH_NORTH;
                } else if (nz < -0.5) {
                    torchBlock = BLOCK.TORCH_SOUTH;
                } else {
                    torchBlock = BLOCK.TORCH;
                }
                
                modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, torchBlock);
                placed = true;

            } else if (selectedBlockId !== BLOCK.AIR) {
                modifiedBlocks.current.set(`${placePos.x},${placePos.y},${placePos.z}`, selectedBlockId);
                if (isWater(selectedBlockId)) addToWaterQueue(placePos.x, placePos.y, placePos.z);
                placed = true;
            }

            if (placed) {
                updateChunkVersions(Array.from(placeAffectedChunks));
                onPlace(); // Consume item
            }

        } else {
            // 3. Break Block (Fall back for Tap if not placeable/interactable)
            if (type === BLOCK.AIR) return;

            // Trigger Loot Drop
            onDropItem(type, bx, by, bz);

            modifiedBlocks.current.set(`${bx},${by},${bz}`, BLOCK.AIR);
            for(const dir of ALL_NEIGHBORS) {
                const nx = bx + dir.x, ny = by + dir.y, nz = bz + dir.z;
                if (isWater(getBlock(nx, ny, nz, noise, modifiedBlocks.current))) {
                    addToWaterQueue(nx, ny, nz);
                }
                affectedChunks.add(`${Math.floor(nx / Config.CHUNK_SIZE)},${Math.floor(nz / Config.CHUNK_SIZE)}`);
            }
            updateChunkVersions(Array.from(affectedChunks));
        }
      },
      handleRadiusBreak: (clientX: number, clientY: number) => {
        const x = (clientX / window.innerWidth) * 2 - 1;
        const y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera({ x, y }, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => i.object.userData?.isTerrain);

        if (hit && hit.face) {
            const point = hit.point;
            const normal = hit.face.normal;
            const breakPos = point.clone().sub(normal.clone().multiplyScalar(0.5));
            const centerX = Math.round(breakPos.x);
            const centerY = Math.round(breakPos.y);
            const centerZ = Math.round(breakPos.z);
            
            if (breakPos.distanceTo(playerPositionRef.current) > 10) return;

            const centerType = getBlock(centerX, centerY, centerZ, noise, modifiedBlocks.current);
            const affectedChunks = new Set<string>();

            // SPECIAL CASE: BED DESTRUCTION (Precision break)
            if (centerType >= BLOCK.BED_FOOT_NORTH && centerType <= BLOCK.BED_HEAD_WEST) {
                // Drop Item
                onDropItem(BLOCK.BED_ITEM, centerX, centerY, centerZ);

                // Remove Clicked Part
                modifiedBlocks.current.set(`${centerX},${centerY},${centerZ}`, BLOCK.AIR);
                affectedChunks.add(`${Math.floor(centerX / Config.CHUNK_SIZE)},${Math.floor(centerZ / Config.CHUNK_SIZE)}`);

                // Remove Partner Part
                let otherX = centerX;
                let otherZ = centerZ;
                let targetOtherType = -1;

                if (centerType >= BLOCK.BED_FOOT_NORTH && centerType <= BLOCK.BED_FOOT_WEST) {
                    const dir = centerType - BLOCK.BED_FOOT_NORTH;
                    if (dir === 0) otherZ -= 1;
                    else if (dir === 1) otherX += 1;
                    else if (dir === 2) otherZ += 1;
                    else if (dir === 3) otherX -= 1;
                    targetOtherType = BLOCK.BED_HEAD_NORTH + dir;
                } else {
                    const dir = centerType - BLOCK.BED_HEAD_NORTH;
                    if (dir === 0) otherZ += 1;
                    else if (dir === 1) otherX -= 1;
                    else if (dir === 2) otherZ -= 1;
                    else if (dir === 3) otherX += 1;
                    targetOtherType = BLOCK.BED_FOOT_NORTH + dir;
                }

                const otherActualType = getBlock(otherX, centerY, otherZ, noise, modifiedBlocks.current);
                if (otherActualType === targetOtherType) {
                    modifiedBlocks.current.set(`${otherX},${centerY},${otherZ}`, BLOCK.AIR);
                    affectedChunks.add(`${Math.floor(otherX / Config.CHUNK_SIZE)},${Math.floor(otherZ / Config.CHUNK_SIZE)}`);
                }
                
                updateChunkVersions(Array.from(affectedChunks));
                return; // Stop here, do not perform radius break
            }

            // STANDARD RADIUS BREAK (3x3x3)
            const breakRadius = 1;

            for (let dx = -breakRadius; dx <= breakRadius; dx++) {
                for (let dy = -breakRadius; dy <= breakRadius; dy++) {
                    for (let dz = -breakRadius; dz <= breakRadius; dz++) {
                        const bx = centerX + dx;
                        const by = centerY + dy;
                        const bz = centerZ + dz;
                        
                        const type = getBlock(bx, by, bz, noise, modifiedBlocks.current);

                        if (type === BLOCK.AIR || (type >= BLOCK.DOOR_BOTTOM && type <= BLOCK.DOOR_TOP_OPEN)) {
                            continue;
                        }

                        // Protect beds from accidental radius destruction (must aim at them directly)
                        if (type >= BLOCK.BED_FOOT_NORTH && type <= BLOCK.BED_HEAD_WEST) continue;

                        modifiedBlocks.current.set(`${bx},${by},${bz}`, BLOCK.AIR);
                        affectedChunks.add(`${Math.floor(bx / Config.CHUNK_SIZE)},${Math.floor(bz / Config.CHUNK_SIZE)}`);

                        for(const dir of ALL_NEIGHBORS) {
                            const nx = bx + dir.x, ny = by + dir.y, nz = bz + dir.z;
                            if (isWater(getBlock(nx, ny, nz, noise, modifiedBlocks.current))) {
                                addToWaterQueue(nx, ny, nz);
                            }
                            affectedChunks.add(`${Math.floor(nx / Config.CHUNK_SIZE)},${Math.floor(nz / Config.CHUNK_SIZE)}`);
                        }
                    }
                }
            }
            
            if (affectedChunks.size > 0) {
                updateChunkVersions(Array.from(affectedChunks));
            }
        }
      }
    }));
    return null;
  }
);
