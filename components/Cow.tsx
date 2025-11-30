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

interface CowProps {
  id: string;
  startPosition: THREE.Vector3;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  terrainSeed: number;
  onDeath: (id: string) => void;
  reportPosition: (pos: THREE.Vector3) => void;
  damageEvent?: DamageEvent;
}

const whiteMaterial = new THREE.MeshStandardMaterial({ color: "#f2f2f2" });
const blackMaterial = new THREE.MeshStandardMaterial({ color: "#222222" });
const hornMaterial = new THREE.MeshStandardMaterial({ color: "#d1c4a5" });
const noseMaterial = new THREE.MeshStandardMaterial({ color: "#f7b5c5" });

export const Cow: React.FC<CowProps> = ({ 
  id, 
  startPosition, 
  playerPositionRef, 
  modifiedBlocks, 
  terrainSeed,
  onDeath,
  reportPosition,
  damageEvent
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const position = useRef(startPosition.clone());
  const [health, setHealth] = useState(5);
  const isDead = useRef(false);
  const deathAnimProgress = useRef(-1);
  const damageFlashTime = useRef(0);
  const lastDamageTimestamp = useRef(0);
  
  // Animation refs
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const legFLRef = useRef<THREE.Mesh>(null); // Front-Left
  const legFRRef = useRef<THREE.Mesh>(null); // Front-Right
  const legBLRef = useRef<THREE.Mesh>(null); // Back-Left
  const legBRRef = useRef<THREE.Mesh>(null); // Back-Right

  const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);
  
  // AI State
  const targetDirection = useRef(new THREE.Vector3());
  const lastDecisionTime = useRef(0);
  
  const SPEED = 1.5;
  const COW_DIMS = { width: 0.9, height: 1.4 };

  const handleTakeDamage = (direction: THREE.Vector3, isCritical: boolean) => {
    if (isDead.current) return;
    damageFlashTime.current = isCritical ? 0.4 : 0.2; // Flash for 0.2 seconds

    const knockbackStrength = isCritical ? 10 : 6;
    const damageAmount = isCritical ? 2 : 1;

    velocity.current.add(direction.multiplyScalar(knockbackStrength));
    velocity.current.y = 4;

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
        return;
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

    // Simple Wandering AI
    if (time - lastDecisionTime.current > 3 + Math.random() * 4) {
      if (Math.random() > 0.3) {
        const angle = Math.random() * Math.PI * 2;
        targetDirection.current.set(Math.sin(angle), 0, Math.cos(angle));
      } else {
        targetDirection.current.set(0, 0, 0); // Stand still
      }
      lastDecisionTime.current = time;
    }

    // Water avoidance logic
    if (targetDirection.current.lengthSq() > 0.1) {
        const checkDir = targetDirection.current.clone().normalize();
        const checkPos = position.current.clone().add(checkDir.multiplyScalar(0.8));
        const blockInFront = getBlock(checkPos.x, position.current.y, checkPos.z, noise, modifiedBlocks.current);
        
        // Water is type 6, flows are 26-28
        const isWater = blockInFront === 6 || (blockInFront >= 26 && blockInFront <= 28);
        
        if (isWater) {
            // Water ahead, stop and choose a new path immediately
            targetDirection.current.set(0, 0, 0);
            lastDecisionTime.current = 0; // Force re-evaluation next frame
        }
    }

    velocity.current.x = targetDirection.current.x * SPEED;
    velocity.current.z = targetDirection.current.z * SPEED;
    
    if (targetDirection.current.lengthSq() > 0.1) {
        const targetRotation = Math.atan2(targetDirection.current.x, targetDirection.current.z) + Math.PI;
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
        groupRef.current.quaternion.slerp(targetQuaternion, 0.1);
    }

    const { grounded } = applyPhysics(
        position.current,
        velocity.current,
        COW_DIMS,
        dt,
        noise,
        modifiedBlocks.current
    );
    
    // AI Jump Logic
    if (grounded && targetDirection.current.lengthSq() > 0.1) {
        const JUMP_FORCE = 6.0;
        const checkDir = targetDirection.current.clone().normalize();
        const checkPos = position.current.clone().add(checkDir.multiplyScalar(0.8));
        
        // Check for a 1-block high obstacle at body height
        const wallBlock = getBlock(checkPos.x, position.current.y + 0.5, checkPos.z, noise, modifiedBlocks.current);
        
        if (wallBlock !== 0 && wallBlock !== 6) { // It's a solid obstacle (not air or water)
            // Check if space above is clear for the cow to jump into. Cow is 1.4m high.
            // Needs clearance at y+1.5m and y+2.5m from its base to be safe.
            const headClearBlock = getBlock(checkPos.x, position.current.y + 1.5, checkPos.z, noise, modifiedBlocks.current);
            const aboveHeadClearBlock = getBlock(checkPos.x, position.current.y + 2.5, checkPos.z, noise, modifiedBlocks.current);

            if (headClearBlock === 0 && aboveHeadClearBlock === 0) {
                // Space is clear, let's jump.
                velocity.current.y = JUMP_FORCE;
            } else {
                // It's a wall higher than 1 block, force new direction.
                lastDecisionTime.current = 0; 
            }
        }
    }


    if (position.current.y < -20) {
        onDeath(id);
        return;
    }

    groupRef.current.position.copy(position.current);
    reportPosition(position.current);

    // Animation
    const isMoving = velocity.current.lengthSq() > 0.1;

    if (isMoving) {
        // Walking animation
        const walkTime = time * 8;
        if (legFLRef.current) legFLRef.current.rotation.x = Math.sin(walkTime) * 0.4;
        if (legBLRef.current) legBLRef.current.rotation.x = Math.sin(walkTime) * 0.4;
        if (legFRRef.current) legFRRef.current.rotation.x = Math.sin(walkTime + Math.PI) * 0.4;
        if (legBRRef.current) legBRRef.current.rotation.x = Math.sin(walkTime + Math.PI) * 0.4;
        
        if (bodyRef.current) bodyRef.current.position.y = 0.85 + Math.sin(walkTime * 2) * 0.02;
        if (headRef.current) headRef.current.rotation.x = Math.sin(walkTime) * 0.05;
        if (tailRef.current) tailRef.current.rotation.x = 0.3 + Math.sin(walkTime / 2) * 0.2;
    } else {
        // Idle animation
        const idleTime = time * 0.8;
        if (legFLRef.current) legFLRef.current.rotation.x = 0;
        if (legFRRef.current) legFRRef.current.rotation.x = 0;
        if (legBLRef.current) legBLRef.current.rotation.x = 0;
        if (legBRRef.current) legBRRef.current.rotation.x = 0;

        if (bodyRef.current) bodyRef.current.position.y = 0.85;
        if (headRef.current) headRef.current.rotation.x = Math.sin(idleTime) * 0.03;
        if (tailRef.current) tailRef.current.rotation.x = 0.3 + Math.sin(idleTime * 1.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef} onClick={(e) => { e.stopPropagation(); }}>
        {/* Body */}
        <mesh ref={bodyRef} position={[0, 0.85, 0]} castShadow receiveShadow material={whiteMaterial}>
            <boxGeometry args={[0.9, 0.8, 1.4]} />
        </mesh>
        <mesh position={[0.25, 1.05, 0.3]} castShadow receiveShadow material={blackMaterial}>
            <boxGeometry args={[0.3, 0.4, 0.5]} />
        </mesh>
         <mesh position={[-0.3, 0.8, -0.4]} castShadow receiveShadow material={blackMaterial}>
            <boxGeometry args={[0.2, 0.3, 0.4]} />
        </mesh>
        
        {/* Head */}
        <group ref={headRef} position={[0, 0.9, -0.8]}>
            <mesh position={[0, 0, 0]} castShadow receiveShadow material={whiteMaterial} >
                <boxGeometry args={[0.7, 0.6, 0.7]} />
            </mesh>
            <mesh position={[0, -0.1, -0.4]} castShadow receiveShadow material={noseMaterial} >
                <boxGeometry args={[0.5, 0.3, 0.2]} />
            </mesh>
             <mesh position={[-0.2, 0.15, -0.4]} castShadow material={blackMaterial}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
            </mesh>
             <mesh position={[0.2, 0.15, -0.4]} castShadow material={blackMaterial}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
            </mesh>
            <mesh position={[-0.4, 0.25, 0]} castShadow receiveShadow material={hornMaterial} >
                <boxGeometry args={[0.1, 0.3, 0.1]} />
            </mesh>
            <mesh position={[0.4, 0.25, 0]} castShadow receiveShadow material={hornMaterial} >
                <boxGeometry args={[0.1, 0.3, 0.1]} />
            </mesh>
        </group>

        {/* Tail */}
        <mesh ref={tailRef} position={[0, 1, 0.7]} castShadow receiveShadow material={whiteMaterial}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
        </mesh>

        {/* Legs */}
        <mesh ref={legFLRef} position={[-0.3, 0.3, -0.5]} castShadow receiveShadow material={whiteMaterial}>
            <boxGeometry args={[0.25, 0.6, 0.25]} />
        </mesh>
        <mesh ref={legFRRef} position={[0.3, 0.3, -0.5]} castShadow receiveShadow material={whiteMaterial} >
            <boxGeometry args={[0.25, 0.6, 0.25]} />
        </mesh>
        <mesh ref={legBLRef} position={[-0.3, 0.3, 0.5]} castShadow receiveShadow material={whiteMaterial}>
            <boxGeometry args={[0.25, 0.6, 0.25]} />
        </mesh>
        <mesh ref={legBRRef} position={[0.3, 0.3, 0.5]} castShadow receiveShadow material={whiteMaterial}>
            <boxGeometry args={[0.25, 0.6, 0.25]} />
        </mesh>

        {health < 5 && ( <mesh position={[0, 1.8, 0]}> <planeGeometry args={[health * 0.2, 0.1]} /> <meshBasicMaterial color="red" side={THREE.DoubleSide} /> </mesh> )}
    </group>
  );
};