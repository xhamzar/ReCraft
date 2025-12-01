
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { BLOCK_TEXTURES } from '../engine/graphics/TextureGenerator';

interface RemotePlayerProps {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  isCrouching: boolean;
  username: string;
  color: string;
}

export const RemotePlayer: React.FC<RemotePlayerProps> = ({ position, quaternion, isCrouching, username, color }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Animation refs
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  
  const currentPos = useRef(position.clone());
  const currentQuat = useRef(quaternion.clone());

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // INTERPOLATION: Smoothly move current visuals to target props
    // Using a high lerp factor (10-15) for responsive but non-jittery movement
    currentPos.current.lerp(position, delta * 15);
    currentQuat.current.slerp(quaternion, delta * 15);

    groupRef.current.position.copy(currentPos.current);
    groupRef.current.quaternion.copy(currentQuat.current);
    
    // Simple walking animation based on movement speed
    const velocity = position.distanceTo(currentPos.current) / delta;
    const isMoving = velocity > 0.1;
    const time = state.clock.getElapsedTime();

    if (leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current && bodyRef.current) {
        if (isMoving) {
            const walkTime = time * 12;
            leftLegRef.current.rotation.x = Math.sin(walkTime) * 0.5;
            rightLegRef.current.rotation.x = Math.sin(walkTime + Math.PI) * 0.5;
            leftArmRef.current.rotation.x = Math.sin(walkTime + Math.PI) * 0.5;
            rightArmRef.current.rotation.x = Math.sin(walkTime) * 0.5;
        } else {
            leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.2);
            rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.2);
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.2);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.2);
        }
        
        // Crouch visual
        const targetBodyY = isCrouching ? 0.9 : 1.125;
        bodyRef.current.position.y = THREE.MathUtils.lerp(bodyRef.current.position.y, targetBodyY, 0.2);
    }
  });

  return (
    <group ref={groupRef}>
      <group position={[0, isCrouching ? -0.2 : 0, 0]}> 
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
            <meshStandardMaterial map={BLOCK_TEXTURES.player_torso} color={color} /> 
        </mesh>
        <mesh ref={leftArmRef} position={[-0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_arm} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.375, 1.125, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_arm} />
        </mesh>
        <mesh ref={leftLegRef} position={[-0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_leg} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.125, 0.375, 0]} geometry={new THREE.BoxGeometry(0.25, 0.75, 0.25)} castShadow receiveShadow>
            <meshStandardMaterial map={BLOCK_TEXTURES.player_leg} />
        </mesh>
      </group>
      
      {/* Nametag */}
      <group position={[0, 2.3, 0]}>
         {/* Background for text legibility */}
         <mesh position={[0, 0, -0.01]}>
             <planeGeometry args={[username.length * 0.15 + 0.2, 0.3]} />
             <meshBasicMaterial color="black" opacity={0.4} transparent />
         </mesh>
         <Text
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ih+F2yuMtiGx2.woff" // VT323 Font
         >
            {username}
         </Text>
      </group>
    </group>
  );
};