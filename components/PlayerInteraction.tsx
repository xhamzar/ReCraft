
import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOCK } from '../engine/world/BlockRegistry';
import { getBlock } from '../engine/world/WorldGen';
import { SimplexNoise } from '../engine/math/Noise';

interface PlayerInteractionProps {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  playerRotationRef: React.MutableRefObject<THREE.Quaternion>;
  terrainSeed: number;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
}

const isWater = (type: number) => {
    return type === BLOCK.WATER || type === BLOCK.WATER_FLOW_1 || type === BLOCK.WATER_FLOW_2 || type === BLOCK.WATER_FLOW_3;
};

export const PlayerInteraction: React.FC<PlayerInteractionProps> = ({ 
  playerPositionRef,
  playerRotationRef,
  terrainSeed,
  modifiedBlocks
}) => {
  const [highlightPos, setHighlightPos] = useState<THREE.Vector3 | null>(null);
  const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);

  useFrame(() => {
    const stepSize = 0.1;
    const maxDistance = 5;
    const origins = [new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, -0.5, 0)];
    const baseDir = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRotationRef.current).normalize();
    const headDir = new THREE.Vector3(0, -0.6, 1).applyQuaternion(playerRotationRef.current).normalize();

    let closestHit: { hit: THREE.Vector3, place: THREE.Vector3, dist: number } | null = null;

    for (let i = 0; i < origins.length; i++) {
        const start = playerPositionRef.current.clone().add(origins[i]);
        const direction = i === 0 ? headDir : baseDir;
        let currentPos = start.clone();
        let prevBlockPos = new THREE.Vector3(Math.round(start.x), Math.round(start.y), Math.round(start.z));

        for (let d = 0; d < maxDistance; d += stepSize) {
            currentPos.addScaledVector(direction, stepSize);
            const bx = Math.round(currentPos.x);
            const by = Math.round(currentPos.y);
            const bz = Math.round(currentPos.z);

            const type = getBlock(bx, by, bz, noise, modifiedBlocks.current);
            if (type !== BLOCK.AIR && !isWater(type)) {
                const hitPos = new THREE.Vector3(bx, by, bz);
                const dist = start.distanceTo(currentPos);
                if (!closestHit || dist < closestHit.dist) {
                    closestHit = { hit: hitPos, place: prevBlockPos.clone(), dist };
                }
                break;
            }
            prevBlockPos.set(bx, by, bz);
        }
    }

    if (closestHit) {
        setHighlightPos(closestHit.hit);
    } else {
        setHighlightPos(null);
    }
  });

  return (
    <>
      {highlightPos && (
        <group position={highlightPos}>
            <lineSegments> <edgesGeometry args={[new THREE.BoxGeometry(1.05, 1.05, 1.05)]} /> <lineBasicMaterial color="black" linewidth={2} /> </lineSegments>
            <mesh> <boxGeometry args={[1.05, 1.05, 1.05]} /> <meshBasicMaterial color="white" transparent opacity={0.2} depthTest={false} /> </mesh>
        </group>
      )}
    </>
  );
};
