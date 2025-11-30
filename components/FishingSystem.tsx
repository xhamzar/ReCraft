import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Config } from '../engine/core/Config';

export interface FishingHandle {
  trigger: () => void;
}

interface FishingSystemProps {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  playerRotationRef: React.MutableRefObject<THREE.Quaternion>;
  onCatch: () => void;
}

const LineSegment: React.FC<{ startRef: React.MutableRefObject<THREE.Vector3>, endRef: React.MutableRefObject<THREE.Vector3> }> = ({ startRef, endRef }) => {
    const geomRef = useRef<THREE.BufferGeometry>(null);
    useFrame(() => {
        if (geomRef.current) {
            geomRef.current.setFromPoints([startRef.current, endRef.current]);
            geomRef.current.attributes.position.needsUpdate = true;
        }
    });
    return ( <line> <bufferGeometry ref={geomRef} /> <lineBasicMaterial color="white" linewidth={1} /> </line> );
};

export const FishingSystem = forwardRef<FishingHandle, FishingSystemProps>(({ playerPositionRef, playerRotationRef, onCatch }, ref) => {
  const [state, setState] = useState<'IDLE' | 'CAST' | 'WAITING' | 'BITING'>('IDLE');
  const bobberPos = useRef(new THREE.Vector3());
  const bobberVel = useRef(new THREE.Vector3());
  const rodTipPos = useRef(new THREE.Vector3());
  const biteStartTime = useRef(0);
  const bobberMeshRef = useRef<THREE.Mesh>(null);

  useImperativeHandle(ref, () => ({
    trigger: () => {
      if (state === 'IDLE') {
        const startPos = playerPositionRef.current.clone().add(new THREE.Vector3(0, 1.2, 0));
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRotationRef.current).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const throwDir = forward.clone().multiplyScalar(12).add(up.multiplyScalar(4));
        bobberPos.current.copy(startPos);
        bobberVel.current.copy(throwDir);
        setState('CAST');
      } else {
        if (state === 'BITING') onCatch();
        setState('IDLE');
      }
    }
  }));

  useFrame((stateCtx, delta) => {
    const tipOffset = new THREE.Vector3(0.4, 1.2, 1.5).applyQuaternion(playerRotationRef.current);
    rodTipPos.current.copy(playerPositionRef.current).add(tipOffset);

    if (state === 'IDLE') return;

    const dt = Math.min(delta, 0.1);
    const time = stateCtx.clock.getElapsedTime();

    bobberVel.current.y -= 25.0 * dt;
    bobberVel.current.multiplyScalar(0.98);
    bobberPos.current.add(bobberVel.current.clone().multiplyScalar(dt));

    if (bobberPos.current.y < Config.WATER_LEVEL) {
        if (state === 'CAST') {
            setState('WAITING');
            biteStartTime.current = time + 3 + Math.random() * 5;
            bobberVel.current.multiplyScalar(0.2);
        }
        const depth = Config.WATER_LEVEL - bobberPos.current.y;
        bobberVel.current.y += depth * 15.0 * dt;
        bobberVel.current.multiplyScalar(0.9);
    }

    if (state === 'WAITING') {
        if (bobberPos.current.y <= Config.WATER_LEVEL + 0.1) {
             bobberPos.current.y = Config.WATER_LEVEL - 0.1 + Math.sin(time * 3) * 0.05;
        }
        if (time > biteStartTime.current) {
            setState('BITING');
            biteStartTime.current = time + 1.5;
        }
    }

    if (state === 'BITING') {
        bobberPos.current.y = Config.WATER_LEVEL - 0.3 + Math.sin(time * 20) * 0.1;
        bobberPos.current.x += (Math.random() - 0.5) * 0.05;
        bobberPos.current.z += (Math.random() - 0.5) * 0.05;
        if (time > biteStartTime.current) {
            setState('WAITING');
            biteStartTime.current = time + 3 + Math.random() * 5;
        }
    }

    if (bobberMeshRef.current) bobberMeshRef.current.position.copy(bobberPos.current);
  });

  if (state === 'IDLE') return null;

  return (
    <group>
        <mesh ref={bobberMeshRef} castShadow> <boxGeometry args={[0.15, 0.15, 0.15]} /> <meshStandardMaterial color={state === 'BITING' ? '#ff2200' : '#ffffff'} emissive={state === 'BITING' ? '#ff0000' : '#000000'} emissiveIntensity={state === 'BITING' ? 0.5 : 0} /> </mesh>
        <LineSegment startRef={rodTipPos} endRef={bobberPos} />
    </group>
  );
});