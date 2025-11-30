import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ControlState } from '../../types';
import { BLOCK } from '../world/BlockRegistry';
import { INVENTORY, getItemDef } from '../items/ItemRegistry';
import { SimplexNoise } from '../math/Noise';
import { applyPhysics } from '../physics/PhysicsSystem';
import { BLOCK_TEXTURES } from '../graphics/TextureGenerator';

export interface PlayerControllerHandle {
  attack: () => void;
  takeDamage: (attackerPosition: THREE.Vector3) => void;
  isFalling: () => boolean;
}

interface PlayerProps {
  controls: React.MutableRefObject<ControlState>;
  terrainSeed: number;
  positionRef: React.MutableRefObject<THREE.Vector3>;
  rotationRef: React.MutableRefObject<THREE.Quaternion>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  selectedBlock: number;
}

export const PlayerController = forwardRef<PlayerControllerHandle, PlayerProps>(({ 
  controls, 
  terrainSeed, 
  positionRef, 
  rotationRef, 
  modifiedBlocks,
  selectedBlock
}, ref) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const jumping = useRef(false);
  const isGroundedRef = useRef(false);
  const groupRef = useRef<THREE.Group>(null);
  const cameraAngle = useRef(Math.PI / 4); 
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const [isUnderwater, setIsUnderwater] = React.useState(false);
  const attackState = useRef({ active: false, time: 0 });

  // Animation State
  const animState = useRef({
      bobTime: 0,
      breathTime: 0
  });

  // Reusable vectors to reduce garbage collection
  const vecDirection = useRef(new THREE.Vector3());
  const vecCamDir = useRef(new THREE.Vector3());
  const vecCamRight = useRef(new THREE.Vector3());
  const quatTarget = useRef(new THREE.Quaternion());
  const vecTargetLook = useRef(new THREE.Vector3());
  const vecTargetCamPos = useRef(new THREE.Vector3());

  const BASE_SPEED = 5;
  const JUMP_FORCE = 8.5;
  const SWIM_FORCE = 4.0;
  const NORMAL_DIMS = { width: 0.6, height: 1.8 }; 
  const CROUCH_DIMS = { width: 0.6, height: 1.5 };
  const ISO_DISTANCE = 35;
  const ISO_HEIGHT = 35;

  const noise = new SimplexNoise(terrainSeed);
  const blockData = INVENTORY.find(i => i.id === selectedBlock);

  useImperativeHandle(ref, () => ({
    attack: () => {
      if (!attackState.current.active) {
        attackState.current = { active: true, time: 0 };
      }
    },
    takeDamage: (attackerPosition: THREE.Vector3) => {
        const knockbackDir = positionRef.current.clone().sub(attackerPosition).normalize();
        knockbackDir.y = 0.4; // Push up a bit
        knockbackDir.normalize();
        velocity.current.add(knockbackDir.multiplyScalar(10));
    },
    isFalling: () => {
        return !isGroundedRef.current && velocity.current.y < -0.5;
    }
  }));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // Cap delta to prevent explosion on lag spikes
    const isCrouching = controls.current.crouch;

    // --- 1. MOVEMENT INPUT CALCULATION ---
    if (controls.current.look.x !== 0) {
        cameraAngle.current -= controls.current.look.x * dt * 2.0;
    }

    const moveX = controls.current.move.x;
    const moveY = controls.current.move.y;

    vecDirection.current.set(0, 0, 0);
    
    if (moveX !== 0 || moveY !== 0) {
        camera.getWorldDirection(vecCamDir.current);
        vecCamDir.current.y = 0;
        vecCamDir.current.normalize();

        vecCamRight.current.crossVectors(vecCamDir.current, new THREE.Vector3(0, 1, 0)).normalize();

        const forwardMove = vecCamDir.current.multiplyScalar(-moveY);
        const rightMove = vecCamRight.current.multiplyScalar(moveX);
        vecDirection.current.add(forwardMove).add(rightMove).normalize();
    }

    // --- 2. ROTATION ---
    if (vecDirection.current.lengthSq() > 0.001) {
        const angle = Math.atan2(vecDirection.current.x, vecDirection.current.z);
        quatTarget.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        rotationRef.current.slerp(quatTarget.current, 10 * dt); // Smooth rotation
    } 

    const currentSpeed = isCrouching ? BASE_SPEED * 0.4 : BASE_SPEED;
    velocity.current.x = vecDirection.current.x * currentSpeed;
    velocity.current.z = vecDirection.current.z * currentSpeed;

    const pos = positionRef.current.clone(); // Clone is okay here as it's the master pos
    const currentDims = isCrouching ? CROUCH_DIMS : NORMAL_DIMS;
    
    // --- 3. PHYSICS EXECUTION ---
    const { grounded, inWater } = applyPhysics(pos, velocity.current, currentDims, dt, noise, modifiedBlocks.current);
    isGroundedRef.current = grounded;
    
    if (inWater !== isUnderwater) setIsUnderwater(inWater);

    if (grounded) {
        jumping.current = false;
        if (controls.current.jump) {
            velocity.current.y = JUMP_FORCE;
            jumping.current = true;
            controls.current.jump = false;
            pos.y += 0.05; 
        }
    } else if (inWater) {
        if (controls.current.jump) {
             velocity.current.y = SWIM_FORCE;
             controls.current.jump = false;
        }
    }

    positionRef.current.copy(pos);
    
    // --- 4. VISUAL UPDATE (MESH) ---
    if (groupRef.current) {
        // Linear Interpolate render position for smoothness if needed, 
        // but for tight controls, direct copy is often better unless utilizing a separate render tick.
        // We stick to direct copy here to avoid "floaty" feeling controls.
        groupRef.current.position.copy(pos);
        groupRef.current.quaternion.copy(rotationRef.current);
        
        const crouchOffset = isCrouching ? -0.2 : 0;
        const currentY = groupRef.current.children[0].position.y;
        const targetY = crouchOffset;
        // Damp the crouch animation
        groupRef.current.children[0].position.y = THREE.MathUtils.damp(currentY, targetY, 15, dt);
    }
    
    // --- 5. CAMERA LOGIC ---
    const isMoving = vecDirection.current.lengthSq() > 0.1 && (grounded || inWater);
    if (isMoving) {
        animState.current.bobTime += dt * (isCrouching ? 8 : 12);
    } else {
        animState.current.bobTime = 0;
    }
    animState.current.breathTime += dt * 0.8;

    const eyeHeight = isCrouching ? 1.4 : 1.7;
    const headBob = isMoving ? Math.sin(animState.current.bobTime) * 0.05 : 0;
    
    // Stabilize Camera:
    // Look Target shouldn't bob as much, otherwise the world shakes.
    vecTargetLook.current.copy(pos).add(new THREE.Vector3(0, eyeHeight * 0.5, 0));
    
    const offsetX = Math.sin(cameraAngle.current) * ISO_DISTANCE;
    const offsetZ = Math.cos(cameraAngle.current) * ISO_DISTANCE;
    
    // Camera position gets the bob
    vecTargetCamPos.current.copy(pos).add(new THREE.Vector3(offsetX, ISO_HEIGHT - (1.8 - eyeHeight) + headBob, offsetZ));
    
    // Use MathUtils.damp (frame-rate independent smoothing) instead of simple lerp
    // Lambda 5 = slow smooth, Lambda 20 = fast snap. 8-10 is a good sweet spot for isometric.
    const smoothSpeed = 8;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, vecTargetCamPos.current.x, smoothSpeed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, vecTargetCamPos.current.y, smoothSpeed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, vecTargetCamPos.current.z, smoothSpeed, dt);
    
    camera.lookAt(vecTargetLook.current);
    
    // --- 6. ANIMATION UPDATES ---
    if (attackState.current.active) {
        attackState.current.time += dt;
        const progress = Math.min(attackState.current.time / 0.3, 1); // 0.3s swing
        if (rightArmRef.current) {
            rightArmRef.current.rotation.x = -0.2 - Math.sin(progress * Math.PI) * 2.2;
        }
        if (progress >= 1) {
            attackState.current.active = false;
        }
    } else if (bodyRef.current && leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
        const breath = Math.sin(animState.current.breathTime) * 0.01;
        
        if (grounded || inWater) {
            if (isMoving) { // Walking
                leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, Math.sin(animState.current.bobTime) * 0.5, 0.2);
                rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, Math.sin(animState.current.bobTime + Math.PI) * 0.5, 0.2);
            } else { // Idle
                leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.2);
                rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.2);
            }
        } else { // In-air pose
            leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, -0.3, 0.2);
            rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0.3, 0.2);
        }

        // Arm Animation
        if (isMoving) { // Walking arm swing
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(animState.current.bobTime + Math.PI) * 0.5, 0.2);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, Math.sin(animState.current.bobTime) * 0.5, 0.2);
        } else { // Idle arm pose
            const heldItemTargetRot = (selectedBlock !== BLOCK.AIR) ? -0.2 : 0;
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0 + breath * 2, 0.2);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, heldItemTargetRot + breath * 2, 0.2);
        }
        
        // Breathing animation for body
        bodyRef.current.position.y = 1.125 + breath;
    }
  });

  return (
    <group ref={groupRef}>
      {selectedBlock === BLOCK.TORCH && (
          <pointLight position={[0.2, 1.2, 0.5]} intensity={2.0} distance={15} decay={2} color="#ffaa00" />
      )}
      <group position={[0, 0, 0]}> 
        <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial attach="material-0" map={BLOCK_TEXTURES.player_head_side} />
            <meshStandardMaterial attach="material-1" map={BLOCK_TEXTURES.player_head_side} />
            <meshStandardMaterial attach="material-2" map={BLOCK_TEXTURES.player_head_top} />
            <meshStandardMaterial attach="material-3" map={BLOCK_TEXTURES.player_head_bottom} />
            <meshStandardMaterial attach="material-4" map={BLOCK_TEXTURES.player_head_front} />
            <meshStandardMaterial attach="material-5" map={BLOCK_TEXTURES.player_head_back} />
        </mesh>
        <mesh ref={bodyRef} position={[0, 1.125, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.75, 0.25]} />
            <meshStandardMaterial map={BLOCK_TEXTURES.player_torso} />
        </mesh>
        <mesh ref={leftArmRef} position={[-0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_arm} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_arm} />
            {selectedBlock === BLOCK.FISHING_ROD && (
                <group position={[0, -0.3, 0]} rotation={[1.3, 0, 0]}>
                     <mesh position={[0, 0.75, 0]} castShadow> <boxGeometry args={[0.04, 1.8, 0.04]} /> <meshStandardMaterial color="#5C4033" /> </mesh>
                     <mesh position={[0, 0.2, 0.06]}> <boxGeometry args={[0.06, 0.08, 0.08]} /> <meshStandardMaterial color="#333" /> </mesh>
                     <mesh position={[0, 1.6, 0]}> <boxGeometry args={[0.02, 0.02, 0.02]} /> <meshStandardMaterial color="#ddd" /> </mesh>
                </group>
            )}
            {selectedBlock === BLOCK.WOOD_SWORD && (
                <group position={[0, -0.6, 0.05]} rotation={[1.8, 0.3, -0.4]}>
                    <mesh castShadow> <boxGeometry args={[0.05, 0.05, 0.2]} /> <meshStandardMaterial color="#654321" /> </mesh>
                    <mesh position={[0, 0, 0.45]} castShadow> <boxGeometry args={[0.2, 0.07, 0.7]} /> <meshStandardMaterial color="#a0522d" /> </mesh>
                </group>
            )}
            {blockData?.isBlock && (
                <mesh position={[0, -0.3, 0.15]} rotation={[0, Math.PI / 4, 0]} castShadow> <boxGeometry args={[0.2, 0.2, 0.2]} /> <meshStandardMaterial color={blockData.color} /> </mesh>
            )}
        </mesh>
        <mesh ref={leftLegRef} position={[-0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_leg} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_leg} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}> <circleGeometry args={[0.3, 16]} /> <meshBasicMaterial color="black" opacity={0.3} transparent /> </mesh>
    </group>
  );
});