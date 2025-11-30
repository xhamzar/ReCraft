
import React, { useState, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BLOCK } from '../engine/world/BlockRegistry';
import { INVENTORY } from '../engine/items/ItemRegistry';
import { getBlock } from '../engine/world/WorldGen';
import { SimplexNoise } from '../engine/math/Noise';
import { BLOCK_TEXTURES } from '../engine/graphics/TextureGenerator';
import { TERRAIN_DATA } from '../data/blocks/terrain';

export interface ItemDropManagerHandle {
  dropItem: (itemType: number, position: THREE.Vector3, direction: THREE.Vector3) => void;
}

interface DroppedItem {
  uid: string;
  type: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  creationTime: number;
  isBlock: boolean;
  color: string;
}

interface ItemDropManagerProps {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  terrainSeed: number;
  onPickup: (itemType: number) => boolean;
}

const getTexture = (id: number) => {
    const def = TERRAIN_DATA.find(d => d.type === id);
    if (!def) return null;
    let key = def.id;
    if (key === 'grass') key = 'grass_side';
    if (key === 'wood') key = 'wood_side';
    if (key === 'seeds') key = 'wheat_0'; // Fallback texture for seeds
    return (BLOCK_TEXTURES as any)[key] || null;
}

const ItemMesh: React.FC<{ item: DroppedItem }> = ({ item }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const texture = useMemo(() => item.isBlock ? getTexture(item.type) : null, [item.type, item.isBlock]);
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.copy(item.position);
            meshRef.current.rotation.y += 0.03;
            // Add a little bounce
            meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 4 + parseInt(item.uid.slice(0, 4), 36)) * 0.003;
        }
    });

    return (
        <mesh ref={meshRef} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial 
                color={item.color} 
                map={texture} 
                roughness={0.6}
                emissive={item.color}
                emissiveIntensity={0.2}
            />
        </mesh>
    );
};

export const ItemDropManager = forwardRef<ItemDropManagerHandle, ItemDropManagerProps>(({
  playerPositionRef,
  modifiedBlocks,
  terrainSeed,
  onPickup
}, ref) => {
  const [items, setItems] = useState<DroppedItem[]>([]);
  const itemsRef = useRef<DroppedItem[]>([]);
  const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);
  
  // Use a ref for onPickup to avoid stale closures if this component doesn't re-render often
  const onPickupRef = useRef(onPickup);
  onPickupRef.current = onPickup;

  useImperativeHandle(ref, () => ({
    dropItem: (itemType, position, direction) => {
       const itemDef = INVENTORY.find(i => i.id === itemType);
       const newItem: DroppedItem = {
           uid: Math.random().toString(36),
           type: itemType,
           position: position.clone(),
           velocity: direction.clone().multiplyScalar(6).add(new THREE.Vector3(0, 3, 0)), // Higher toss
           creationTime: Date.now(),
           isBlock: itemDef?.isBlock ?? true,
           color: itemDef?.color ?? '#ffffff'
       };
       const next = [...itemsRef.current, newItem];
       itemsRef.current = next;
       setItems(next);
    }
  }));

  useFrame((state, delta) => {
    if (itemsRef.current.length === 0) return;
    
    const dt = Math.min(delta, 0.05);
    const time = Date.now();
    let needsUpdate = false;
    const nextItems: DroppedItem[] = [];

    const DESPAWN_DIST_SQ = 80 * 80; // Despawn if further than 80 blocks

    for (const item of itemsRef.current) {
        // Physics
        item.velocity.y -= 20 * dt; 
        item.velocity.multiplyScalar(0.98); 

        const nextPos = item.position.clone().add(item.velocity.clone().multiplyScalar(dt));
        
        const bx = Math.round(nextPos.x);
        const by = Math.round(nextPos.y - 0.2); 
        const bz = Math.round(nextPos.z);
        
        const block = getBlock(bx, by, bz, noise, modifiedBlocks.current);
        // Collision check
        const isSolid = block !== BLOCK.AIR && block !== BLOCK.WATER && block !== BLOCK.WATER_FLOW_1 && block !== BLOCK.WATER_FLOW_2 && block !== BLOCK.WATER_FLOW_3 && block !== BLOCK.WHEAT && block !== BLOCK.TALL_GRASS && block !== BLOCK.RED_FLOWER && block !== BLOCK.YELLOW_FLOWER;

        if (isSolid) {
             // If falling down into a solid block, snap to top
             if (item.velocity.y < 0 && nextPos.y < by + 0.5 + 0.3) {
                 item.position.y = by + 0.5 + 0.25;
                 item.velocity.y *= -0.5; // Bounce
                 item.velocity.x *= 0.6; 
                 item.velocity.z *= 0.6;
             } else {
                 // Hitting side or bottom? Just stop for now to prevent clipping
                 item.position.copy(nextPos);
             }
        } else {
            item.position.copy(nextPos);
        }
        
        const distSq = item.position.distanceToSquared(playerPositionRef.current);

        // Pickup Logic
        const age = (time - item.creationTime);
        if (age > 1000) { 
            if (distSq < 2.25) { // 1.5 * 1.5
                if (onPickupRef.current(item.type)) {
                    needsUpdate = true;
                    continue; 
                }
            }
        }
        
        // Despawn logic: 5 mins time limit OR distance limit
        if (age > 300000 || distSq > DESPAWN_DIST_SQ) { 
            needsUpdate = true;
            continue;
        }

        nextItems.push(item);
    }

    if (needsUpdate || itemsRef.current.length !== nextItems.length) {
        itemsRef.current = nextItems;
        setItems(nextItems);
    }
  });

  return (
    <group>
        {items.map(item => (
            <ItemMesh key={item.uid} item={item} />
        ))}
    </group>
  );
});
