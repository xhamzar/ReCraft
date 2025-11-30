import { getBlock } from '../world/WorldGen';
import { SimplexNoise } from '../math/Noise';
import * as THREE from 'three';
import { BLOCK_DEFS } from '../world/BlockRegistry';

interface Node {
    pos: THREE.Vector3;
    g: number; // cost from start
    h: number; // heuristic cost to end
    f: number; // g + h
    parent: Node | null;
}

const manhattanDistance = (a: THREE.Vector3, b: THREE.Vector3): number => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
};

const isSolidForPathfinding = (x: number, y: number, z: number, noise: SimplexNoise, modifiedBlocks: Map<string, number>): boolean => {
    const type = getBlock(x, y, z, noise, modifiedBlocks);
    const def = BLOCK_DEFS[type];
    return def ? def.solid : true;
};

// A simplified A* implementation for our voxel world
export const findPath = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    noise: SimplexNoise,
    modifiedBlocks: Map<string, number>,
    maxSteps: number = 200
): THREE.Vector3[] | null => {

    const startNode: Node = { pos: start.clone().round(), g: 0, h: manhattanDistance(start, end), f: manhattanDistance(start, end), parent: null };
    const endNodePos = end.clone().round();

    const openList: Node[] = [startNode];
    const closedList = new Set<string>();

    const posToKey = (pos: THREE.Vector3) => `${pos.x},${pos.y},${pos.z}`;

    let steps = 0;
    while (openList.length > 0 && steps < maxSteps) {
        steps++;
        
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        const currentNode = openList.splice(lowestIndex, 1)[0];
        closedList.add(posToKey(currentNode.pos));

        if (currentNode.pos.distanceTo(endNodePos) < 1.5) {
            const path: THREE.Vector3[] = [];
            let current: Node | null = currentNode;
            while (current) {
                path.push(current.pos.clone());
                current = current.parent;
            }
            return path.reverse();
        }

        // 6 cardinal neighbors for simpler paths
        const neighbors = [
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
        ];

        for (const dir of neighbors) {
            const neighborPos = currentNode.pos.clone().add(dir);
            const neighborKey = posToKey(neighborPos);

            if (closedList.has(neighborKey)) continue;

            // Check if walkable: requires 2 blocks of air above the mob's feet, and solid ground below.
            const isGroundSolid = isSolidForPathfinding(neighborPos.x, neighborPos.y - 1, neighborPos.z, noise, modifiedBlocks);
            const isBodyClear = !isSolidForPathfinding(neighborPos.x, neighborPos.y, neighborPos.z, noise, modifiedBlocks);
            const isHeadClear = !isSolidForPathfinding(neighborPos.x, neighborPos.y + 1, neighborPos.z, noise, modifiedBlocks);

            if (!isBodyClear || !isHeadClear) continue; // Can't move into a wall
            
            // Handle drops and jumps
            if (dir.y === -1 && !isGroundSolid) continue; // Don't pathfind into open air unless it's the only way
            if (dir.y === 0 && !isGroundSolid) continue; // Can't walk on air

            const gCost = currentNode.g + 1; // All steps cost 1
            const existingNode = openList.find(n => n.pos.equals(neighborPos));

            if (!existingNode || gCost < existingNode.g) {
                 const hCost = manhattanDistance(neighborPos, endNodePos);
                 const fCost = gCost + hCost;

                 if (existingNode) {
                    existingNode.g = gCost;
                    existingNode.f = fCost;
                    existingNode.parent = currentNode;
                 } else {
                    openList.push({ pos: neighborPos, g: gCost, h: hCost, f: fCost, parent: currentNode });
                 }
            }
        }
    }

    return null; // No path found
};