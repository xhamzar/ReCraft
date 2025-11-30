
import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars } from '@react-three/drei';
import { Config } from '../engine/core/Config';

export const DayNightCycle: React.FC<{ shadowsEnabled: boolean, timeOffsetRef?: React.MutableRefObject<number> }> = ({ shadowsEnabled, timeOffsetRef }) => {
  const { scene } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const [isNight, setIsNight] = useState(false);
  const RADIUS = 150; 

  useFrame((state) => {
    const time = state.clock.getElapsedTime() + (timeOffsetRef?.current || 0);
    const cyclePos = (time % Config.CYCLE_DURATION) / Config.CYCLE_DURATION; 
    const angle = cyclePos * Math.PI * 2; 

    const x = Math.cos(angle) * RADIUS;
    const y = Math.sin(angle) * RADIUS;
    
    if (sunMeshRef.current) {
        sunMeshRef.current.position.set(x, y, -30);
        sunMeshRef.current.lookAt(0, 0, 0);
    }
    if (moonMeshRef.current) {
        moonMeshRef.current.position.set(-x, -y, 30);
        moonMeshRef.current.lookAt(0, 0, 0);
    }

    if (sunRef.current) {
        sunRef.current.castShadow = shadowsEnabled;

        if (y > 0) {
            sunRef.current.position.set(x, y, -30);
            sunRef.current.intensity = Math.max(0, Math.sin(angle)) * 1.5;
            sunRef.current.color.setHSL(0.1, 1, 0.95);
            if (isNight) setIsNight(false);
        } else {
            sunRef.current.position.set(-x, -y, 30); 
            sunRef.current.intensity = Math.max(0.2, Math.sin(angle + Math.PI)) * 0.8;
            sunRef.current.color.setHSL(0.6, 0.6, 0.8); 
            if (!isNight) setIsNight(true);
        }
    }

    const dayColor = new THREE.Color("#87CEEB");
    const nightColor = new THREE.Color("#151d33"); 
    const sunsetColor = new THREE.Color("#fd5e53");
    let targetColor = dayColor;
    
    if (y > 0) {
        if (y < 40) {
             const t = y / 40;
             targetColor = sunsetColor.clone().lerp(dayColor, t);
        } else {
             targetColor = dayColor;
        }
    } else {
        if (y > -40) {
             const t = Math.abs(y) / 40;
             targetColor = sunsetColor.clone().lerp(nightColor, t);
        } else {
             targetColor = nightColor;
        }
    }
    
    scene.background = targetColor;
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(targetColor);
    
    let envIntensity = 0.2;
    if (y > 0) envIntensity = 0.2 + Math.max(0, Math.sin(angle)) * 0.8; 
    // @ts-ignore
    scene.environmentIntensity = envIntensity;
  });

  return (
    <>
      <ambientLight intensity={isNight ? 0.4 : 0.6} color={isNight ? "#4040aa" : "#ffffff"} />
      <directionalLight 
        ref={sunRef}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={1}
        shadow-camera-far={400}
        shadow-bias={-0.0005}
      />
      <mesh ref={sunMeshRef}> <boxGeometry args={[12, 12, 12]} /> <meshBasicMaterial color="#FDB813" /> </mesh>
      <mesh ref={moonMeshRef}> <boxGeometry args={[10, 10, 10]} /> <meshBasicMaterial color="#E0E0E0" /> </mesh>
      {isNight && ( <Stars radius={120} depth={50} count={3000} factor={4} saturation={0} fade speed={1} /> )}
    </>
  );
};
