import React, { useState, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Zombie } from './Zombie';
import { Cow } from './Cow';
import { SimplexNoise } from '../engine/math/Noise';
import { getBlockHeight, getBiome } from '../engine/world/WorldGen';
import { Config } from '../engine/core/Config';
import { ItemStack } from '../types';

interface DamageEvent {
  timestamp: number;
  direction: THREE.Vector3;
  isCritical: boolean;
  damage: number;
}

export interface MobManagerHandle {
  performAttack: (playerPos: THREE.Vector3, playerRot: THREE.Quaternion, isCritical: boolean, heldItem: ItemStack) => void;
  isTargetingMob: (playerPos: THREE.Vector3, playerRot: THREE.Quaternion) => boolean;
}

interface MobManagerProps {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  terrainSeed: number;
  onDamagePlayer: (amount: number, attackerPosition: THREE.Vector3) => void;
  timeOffsetRef: React.MutableRefObject<number>;
}

interface MobData {
  id: string;
  startPosition: THREE.Vector3;
}

export const MobManager = forwardRef<MobManagerHandle, MobManagerProps>(({
  playerPositionRef,
  modifiedBlocks,
  terrainSeed,
  onDamagePlayer,
  timeOffsetRef
}, ref) => {
  const [zombies, setZombies] = useState<MobData[]>([]);
  const [cows, setCows] = useState<MobData[]>([]);
  const [damageEvents, setDamageEvents] = useState<Record<string, DamageEvent>>({});
  const mobPositionsRef = useRef(new Map<string, THREE.Vector3>());
  const lastSpawnTime = useRef(0);
  const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);

  useImperativeHandle(ref, () => {
    const findClosestTarget = (playerPos: THREE.Vector3, playerRot: THREE.Quaternion): { id: string, mobPos: THREE.Vector3 } | null => {
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRot);
        const attackRangeSq = 3 * 3; // 3 blocks range, squared
        const attackAngle = 0.7; // Cosine of the angle (wider cone is a smaller number)

        let closestTarget: { id: string, mobPos: THREE.Vector3 } | null = null;
        let minDistanceSq = attackRangeSq;

        for (const [id, mobPos] of mobPositionsRef.current.entries()) {
            const distanceSq = playerPos.distanceToSquared(mobPos);
            if (distanceSq < minDistanceSq) {
                const toMob = mobPos.clone().sub(playerPos).normalize();
                if (playerForward.dot(toMob) > attackAngle) {
                    minDistanceSq = distanceSq;
                    closestTarget = { id, mobPos: mobPos.clone() };
                }
            }
        }
        return closestTarget;
    };

    return {
        isTargetingMob: (playerPos, playerRot) => {
            return findClosestTarget(playerPos, playerRot) !== null;
        },
        performAttack: (playerPos, playerRot, isCritical, heldItem) => {
            const target = findClosestTarget(playerPos, playerRot);
            if (target) {
                let damage = isCritical ? 2 : 1;
                // Check for Sharpness enchantment
                if (heldItem.enchantments?.sharpness) {
                    damage += heldItem.enchantments.sharpness; // Add sharpness level as bonus damage
                }

                const attackDirection = target.mobPos.clone().sub(playerPos).normalize();
                setDamageEvents(prev => ({
                    ...prev,
                    [target.id]: {
                        timestamp: Date.now(),
                        direction: attackDirection,
                        isCritical: isCritical,
                        damage: damage
                    }
                }));
            }
        }
    };
  });

  const handleReportPosition = (id: string, pos: THREE.Vector3) => {
    mobPositionsRef.current.set(id, pos.clone());
  };

  const handleZombieDeath = (id: string) => {
    setZombies(current => current.filter(m => m.id !== id));
    mobPositionsRef.current.delete(id);
  };
  
  const handleCowDeath = (id: string) => {
    setCows(current => current.filter(m => m.id !== id));
    mobPositionsRef.current.delete(id);
  };

  useFrame((state) => {
    const time = state.clock.getElapsedTime() + timeOffsetRef.current;
    const cyclePos = (time % Config.CYCLE_DURATION) / Config.CYCLE_DURATION;
    const isNight = cyclePos >= 0.5;

    if (time - lastSpawnTime.current > 5) {
        lastSpawnTime.current = time;

        const angle = Math.random() * Math.PI * 2;
        const distance = 12 + Math.random() * 8; 
        const x = playerPositionRef.current.x + Math.cos(angle) * distance;
        const z = playerPositionRef.current.z + Math.sin(angle) * distance;
        const ix = Math.floor(x), iz = Math.floor(z);
        const y = getBlockHeight(noise, ix, iz);

        if (y <= 0) return;

        if (isNight && zombies.length < 5) {
            const id = `zombie-${Date.now()}-${Math.random()}`;
            const startPos = new THREE.Vector3(x, y + 2, z);
            setZombies(prev => [...prev, { id, startPosition: startPos }]);
        } else if (!isNight && cows.length < 5) {
            const biome = getBiome(noise, ix, iz);
            if (biome === 'FOREST') {
                const id = `cow-${Date.now()}-${Math.random()}`;
                const startPos = new THREE.Vector3(x, y + 2, z);
                setCows(prev => [...prev, { id, startPosition: startPos }]);
            }
        }
    }
  });

  return (
    <>
      {zombies.map(mob => (
        <Zombie 
            key={mob.id}
            id={mob.id}
            startPosition={mob.startPosition}
            playerPositionRef={playerPositionRef}
            modifiedBlocks={modifiedBlocks}
            terrainSeed={terrainSeed}
            onDamagePlayer={onDamagePlayer}
            onDeath={handleZombieDeath}
            reportPosition={(pos) => handleReportPosition(mob.id, pos)}
            damageEvent={damageEvents[mob.id]}
        />
      ))}
      {cows.map(mob => (
        <Cow
            key={mob.id}
            id={mob.id}
            startPosition={mob.startPosition}
            playerPositionRef={playerPositionRef}
            modifiedBlocks={modifiedBlocks}
            terrainSeed={terrainSeed}
            onDeath={handleCowDeath}
            reportPosition={(pos) => handleReportPosition(mob.id, pos)}
            damageEvent={damageEvents[mob.id]}
        />
      ))}
    </>
  );
});