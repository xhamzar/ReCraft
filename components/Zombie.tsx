import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimplexNoise } from '../engine/math/Noise';
import { applyPhysics } from '../engine/physics/PhysicsSystem';
import { getBlock } from '../engine/world/WorldGen';

interface DamageEvent {
    timestamp: number;
    direction: THREE.Vector3;
    isCritical: boolean;
}

interface ZombieProps {
  id: string;
  startPosition: THREE.Vector3;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  terrainSeed: number;
  onDamagePlayer: (amount: number, attackerPosition: THREE.Vector3) => void;
  onDeath: (id: string) => void;
  reportPosition: (pos: THREE.Vector3) => void;
  damageEvent?: DamageEvent;
}

export const Zombie: React.FC<ZombieProps> = ({ 
  id, 
  startPosition, 
  playerPositionRef, 
  modifiedBlocks, 
  terrainSeed,
  onDamagePlayer,
  onDeath,
  reportPosition,
  damageEvent
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const position = useRef(startPosition.clone());
  const [health, setHealth] = useState(3);
  const lastAttackTime = useRef(0);
  const isDead = useRef(false);
  const deathAnimProgress = useRef(-1); // -1: alive, 0-1: dying animation
  const damageFlashTime = useRef(0); // countdown for red flash
  const attackAnimProgress = useRef(-1); // -1: not attacking, 0-1: attacking
  
  const headRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);
  const lastDamageTimestamp = useRef(0);
  
  const SPEED = 2.5;
  const JUMP_FORCE = 8;
  const ZOMBIE_DIMS = { width: 0.6, height: 1.8 };

  const handleTakeDamage = (direction: THREE.Vector3, isCritical: boolean) => {
    if (isDead.current) return;
    damageFlashTime.current = isCritical ? 0.4 : 0.2; // Flash longer for crits

    const knockbackStrength = isCritical ? 12 : 8;
    const damageAmount = isCritical ? 2 : 1;

    velocity.current.add(direction.multiplyScalar(knockbackStrength));
    velocity.current.y = 5;

    setHealth(h => {
        const newHealth = h - damageAmount;
        if (newHealth <= 0) {
            isDead.current = true;
            deathAnimProgress.current = 0;
        }
        return newHealth;
    });
  };
  
  useEffect(() => {
    if (damageEvent && damageEvent.timestamp > lastDamageTimestamp.current) {
        lastDamageTimestamp.current = damageEvent.timestamp;
        handleTakeDamage(damageEvent.direction, damageEvent.isCritical);
    }
  }, [damageEvent]);


  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    
    // Death Animation
    if (isDead.current) {
        if (deathAnimProgress.current >= 0 && deathAnimProgress.current < 1) {
            deathAnimProgress.current += dt * 2; // 0.5s animation
            const progress = Math.min(deathAnimProgress.current, 1);
            groupRef.current.rotation.z = progress * (Math.PI / 2);
            groupRef.current.position.y -= dt;

            if (progress >= 1) {
                setTimeout(() => onDeath(id), 50);
            }
        }
        return; // Stop all other logic
    }
    
    // Damage Flash Effect
    if (damageFlashTime.current > 0) {
        damageFlashTime.current -= dt;
        const flashIntensity = Math.sin((damageFlashTime.current / 0.2) * Math.PI);
        groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive.set('red');
                child.material.emissiveIntensity = flashIntensity;
            }
        });
    } else {
         groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive.set('black');
                child.material.emissiveIntensity = 0;
            }
        });
    }

    const time = state.clock.getElapsedTime();

    const distToPlayer = position.current.distanceTo(playerPositionRef.current);
    const dirToPlayer = new THREE.Vector3().subVectors(playerPositionRef.current, position.current);
    dirToPlayer.y = 0;
    
    let moveX = 0;
    let moveZ = 0;

    if (distToPlayer < 20 && distToPlayer > 0.5) {
        dirToPlayer.normalize();
        const targetRotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        groupRef.current.rotation.y = targetRotation;
        moveX = dirToPlayer.x * SPEED;
        moveZ = dirToPlayer.z * SPEED;
    }

    velocity.current.x = moveX;
    velocity.current.z = moveZ;

    if (distToPlayer < 1.2) {
        if (time - lastAttackTime.current > 1.0) {
            onDamagePlayer(1, position.current);
            lastAttackTime.current = time;
            attackAnimProgress.current = 0; // Start attack animation
        }
    }

    const { grounded } = applyPhysics(
        position.current,
        velocity.current,
        ZOMBIE_DIMS,
        dt,
        noise,
        modifiedBlocks.current
    );

    if (grounded && (moveX !== 0 || moveZ !== 0)) {
        const checkPos = position.current.clone().add(new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(0.8));
        const wallBlock = getBlock(checkPos.x, position.current.y + 0.5, checkPos.z, noise, modifiedBlocks.current);
        const headBlock = getBlock(checkPos.x, position.current.y + 2.5, checkPos.z, noise, modifiedBlocks.current);
        if (wallBlock !== 0 && wallBlock !== 6 && headBlock === 0) {
            velocity.current.y = JUMP_FORCE;
        }
    }

    if (position.current.y < -20) {
        onDeath(id);
        return;
    }

    groupRef.current.position.copy(position.current);
    reportPosition(position.current);

    const isMoving = velocity.current.lengthSq() > 0.1;

    // Attack Animation
    if (attackAnimProgress.current >= 0) {
        attackAnimProgress.current += dt * 2.5; // 0.4s animation
        const progress = Math.min(attackAnimProgress.current, 1);
        const swing = Math.sin(progress * Math.PI);

        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 2 - swing * 1.2;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 2 - swing * 1.2;
        
        if (progress >= 1) {
            attackAnimProgress.current = -1; // End animation
        }
    } 
    // Walking / Idle Animation
    else {
        if (isMoving) {
            // Walking
            const walkTime = time * 10;
            if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(walkTime) * 0.5;
            if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(walkTime + Math.PI) * 0.5;
            if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 2.5 + Math.sin(walkTime) * 0.1;
            if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 2.5 + Math.sin(walkTime + Math.PI) * 0.1;
        } else {
            // Idle
            const idleTime = time * 0.5;
            if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
            if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
            if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 2.5;
            if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 2.5;
            if (headRef.current) headRef.current.rotation.y = Math.sin(idleTime) * 0.1; // Head sway
        }
    }
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); }}>
        <group position={[0, 0, 0]}>
            <mesh ref={headRef} position={[0, 1.75, 0]} castShadow receiveShadow> <boxGeometry args={[0.5, 0.5, 0.5]} /> <meshStandardMaterial color="#32CD32" /> </mesh>
            <mesh position={[0, 1.125, 0]} castShadow receiveShadow> <boxGeometry args={[0.5, 0.75, 0.25]} /> <meshStandardMaterial color="#008080" /> </mesh>
            <mesh ref={leftArmRef} position={[-0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow> <meshStandardMaterial color="#32CD32" /> </mesh>
            <mesh ref={rightArmRef} position={[0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow> <meshStandardMaterial color="#32CD32" /> </mesh>
            <mesh ref={leftLegRef} position={[-0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow> <meshStandardMaterial color="#4B0082" /> </mesh>
            <mesh ref={rightLegRef} position={[0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow> <meshStandardMaterial color="#4B0082" /> </mesh>
        </group>
        {health < 3 && ( <mesh position={[0, 2.2, 0]}> <planeGeometry args={[health * 0.3, 0.1]} /> <meshBasicMaterial color="red" side={THREE.DoubleSide} /> </mesh> )}
    </group>
  );
};