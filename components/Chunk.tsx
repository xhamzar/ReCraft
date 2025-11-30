import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SimplexNoise } from '../engine/math/Noise';
import { Config } from '../engine/core/Config';
import { BLOCK, BLOCK_DEFS } from '../engine/world/BlockRegistry';
import { getBlockHeight, getTreeRandom, getBlock } from '../engine/world/WorldGen';
import { BLOCK_TEXTURES } from '../engine/graphics/TextureGenerator';
import { TERRAIN_DATA } from '../data/blocks/terrain';

interface ChunkProps {
  chunkX: number;
  chunkZ: number;
  noise: SimplexNoise;
  modifiedBlocks: React.MutableRefObject<Map<string, number>>;
  version: number;
  visualStyle: 'pixel' | 'smooth';
}

const getBlockColor = (id: string) => {
    const def = TERRAIN_DATA.find(d => d.id === id);
    return def ? def.color : 'magenta';
};

export const Chunk = React.memo(({ chunkX, chunkZ, noise, modifiedBlocks, version, visualStyle }: ChunkProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dirtRef = useRef<THREE.InstancedMesh>(null);
  const stoneRef = useRef<THREE.InstancedMesh>(null);
  const waterRef = useRef<THREE.InstancedMesh>(null);
  const sandRef = useRef<THREE.InstancedMesh>(null);
  const woodRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const plankRef = useRef<THREE.InstancedMesh>(null);
  const brickRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.InstancedMesh>(null);
  const snowRef = useRef<THREE.InstancedMesh>(null);
  const cactusRef = useRef<THREE.InstancedMesh>(null);
  const pineLeafRef = useRef<THREE.InstancedMesh>(null);
  const stairRef = useRef<THREE.InstancedMesh>(null);
  const doorRef = useRef<THREE.InstancedMesh>(null);
  const cobbleRef = useRef<THREE.InstancedMesh>(null);
  const gravelRef = useRef<THREE.InstancedMesh>(null);
  const farmlandRef = useRef<THREE.InstancedMesh>(null);
  const cobbleStairRef = useRef<THREE.InstancedMesh>(null);
  const torchRef = useRef<THREE.InstancedMesh>(null);
  
  // Fence Refs
  const fencePostRef = useRef<THREE.InstancedMesh>(null);
  const fenceNRef = useRef<THREE.InstancedMesh>(null);
  const fenceERef = useRef<THREE.InstancedMesh>(null);
  const fenceSRef = useRef<THREE.InstancedMesh>(null);
  const fenceWRef = useRef<THREE.InstancedMesh>(null);
  
  const tallGrassRef = useRef<THREE.InstancedMesh>(null);
  const redFlowerRef = useRef<THREE.InstancedMesh>(null);
  const yellowFlowerRef = useRef<THREE.InstancedMesh>(null);
  
  // Wheat Stages
  const wheat0Ref = useRef<THREE.InstancedMesh>(null);
  const wheat1Ref = useRef<THREE.InstancedMesh>(null);
  const wheat2Ref = useRef<THREE.InstancedMesh>(null);
  const wheat3Ref = useRef<THREE.InstancedMesh>(null);
  
  const bedFootRef = useRef<THREE.InstancedMesh>(null);
  const bedHeadRef = useRef<THREE.InstancedMesh>(null);
  
  const waterMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    // Animasi sederhana untuk tekstur air, jauh lebih ringan daripada shader
    if (waterMaterialRef.current && waterMaterialRef.current.map) {
      waterMaterialRef.current.map.offset.y = (clock.getElapsedTime() * -0.1) % 1;
    }
  });

  const stairGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [], normals = [], uvs = [], indices = [];
    let indexOffset = 0;
    const addBox = (w: number, h: number, d: number, tx: number, ty: number, tz: number) => {
        const boxGeo = new THREE.BoxGeometry(w, h, d);
        const posAttr = boxGeo.attributes.position, normAttr = boxGeo.attributes.normal, uvAttr = boxGeo.attributes.uv, indexAttr = boxGeo.index;
        if (indexAttr) for (let i = 0; i < indexAttr.count; i++) indices.push(indexAttr.getX(i) + indexOffset);
        indexOffset += posAttr.count;
        for (let i = 0; i < posAttr.count; i++) {
            vertices.push(posAttr.getX(i) + tx, posAttr.getY(i) + ty, posAttr.getZ(i) + tz);
            normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
            uvs.push(uvAttr.getX(i), uvAttr.getY(i));
        }
    };
    addBox(1, 0.5, 1, 0, -0.25, 0); addBox(1, 0.5, 0.5, 0, 0.25, -0.25);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }, []);

  const plantGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [], normals = [], uvs = [], indices = [];
    let indexOffset = 0;
    const addPlane = (rotationY: number) => {
        const w = 0.8, h = 0.8, yMin = -0.5, yMax = 0.3;
        const cos = Math.cos(rotationY), sin = Math.sin(rotationY);
        const xLeft = -0.5 * w * cos, zLeft = -0.5 * w * sin, xRight = 0.5 * w * cos, zRight = 0.5 * w * sin;
        const v = [xLeft, yMin, zLeft, xRight, yMin, zRight, xLeft, yMax, zLeft, xRight, yMax, zRight];
        vertices.push(...v, ...v);
        normals.push(sin,0,-cos,sin,0,-cos,sin,0,-cos,sin,0,-cos,-sin,0,cos,-sin,0,cos,-sin,0,cos,-sin,0,cos);
        uvs.push(0,0,1,0,0,1,1,1,1,0,0,0,1,1,0,1);
        indices.push(indexOffset, indexOffset+1, indexOffset+2, indexOffset+2, indexOffset+1, indexOffset+3, indexOffset+5, indexOffset+4, indexOffset+7, indexOffset+7, indexOffset+4, indexOffset+6);
        indexOffset += 8;
    };
    addPlane(Math.PI / 4); addPlane(-Math.PI / 4);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  }, []);
  
  const bedGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 0.56, 1);
    geometry.translate(0, -0.22, 0);
    return geometry;
  }, []);
  
  const torchGeometry = useMemo(() => {
      const geometry = new THREE.BoxGeometry(0.125, 0.6, 0.125);
      geometry.translate(0, -0.1, 0);
      return geometry;
  }, []);
  
  const fenceConnectGeometry = useMemo(() => {
      const geometry = new THREE.BoxGeometry(0.15, 0.2, 0.5);
      geometry.translate(0, 0.15, -0.25); // Translate to bridge the gap
      return geometry;
  }, []);

  const { blocks, dirtBlocks, stoneBlocks, waterBlocks, sandBlocks, woodBlocks, leafBlocks, plankBlocks, brickBlocks, glassBlocks, snowBlocks, cactusBlocks, pineLeafBlocks, stairBlocks, doorBlocks, cobbleBlocks, gravelBlocks, farmlandBlocks, wheat0Blocks, wheat1Blocks, wheat2Blocks, wheat3Blocks, tallGrassBlocks, redFlowerBlocks, yellowFlowerBlocks, cobbleStairBlocks, bedFootBlocks, bedHeadBlocks, torchBlocks, fencePostBlocks, fenceNBlocks, fenceEBlocks, fenceSBlocks, fenceWBlocks } = useMemo(() => {
    const _blocks: THREE.Matrix4[] = [], _dirtBlocks: THREE.Matrix4[] = [], _stoneBlocks: THREE.Matrix4[] = [], _waterBlocks: THREE.Matrix4[] = [], _sandBlocks: THREE.Matrix4[] = [], _woodBlocks: THREE.Matrix4[] = [], _leafBlocks: THREE.Matrix4[] = [], _plankBlocks: THREE.Matrix4[] = [], _brickBlocks: THREE.Matrix4[] = [], _glassBlocks: THREE.Matrix4[] = [], _snowBlocks: THREE.Matrix4[] = [], _cactusBlocks: THREE.Matrix4[] = [], _pineLeafBlocks: THREE.Matrix4[] = [], _stairBlocks: THREE.Matrix4[] = [], _doorBlocks: THREE.Matrix4[] = [], _cobbleBlocks: THREE.Matrix4[] = [], _gravelBlocks: THREE.Matrix4[] = [], _farmlandBlocks: THREE.Matrix4[] = [], _wheat0Blocks: THREE.Matrix4[] = [], _wheat1Blocks: THREE.Matrix4[] = [], _wheat2Blocks: THREE.Matrix4[] = [], _wheat3Blocks: THREE.Matrix4[] = [], _tallGrassBlocks: THREE.Matrix4[] = [], _redFlowerBlocks: THREE.Matrix4[] = [], _yellowFlowerBlocks: THREE.Matrix4[] = [], _cobbleStairBlocks: THREE.Matrix4[] = [], _bedFootBlocks: THREE.Matrix4[] = [], _bedHeadBlocks: THREE.Matrix4[] = [], _torchBlocks: THREE.Matrix4[] = [], _fencePostBlocks: THREE.Matrix4[] = [], _fenceNBlocks: THREE.Matrix4[] = [], _fenceEBlocks: THREE.Matrix4[] = [], _fenceSBlocks: THREE.Matrix4[] = [], _fenceWBlocks: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const startX = chunkX * Config.CHUNK_SIZE;
    const startZ = chunkZ * Config.CHUNK_SIZE;

    const addBlockToArrays = (mat: THREE.Matrix4, type: number) => {
        switch(type) {
            case BLOCK.GRASS: _blocks.push(mat); break;
            case BLOCK.DIRT: _dirtBlocks.push(mat); break;
            case BLOCK.STONE: _stoneBlocks.push(mat); break;
            case BLOCK.WATER: 
            case BLOCK.WATER_FLOW_1:
            case BLOCK.WATER_FLOW_2:
            case BLOCK.WATER_FLOW_3:
                _waterBlocks.push(mat); break;
            case BLOCK.SAND: _sandBlocks.push(mat); break;
            case BLOCK.WOOD: _woodBlocks.push(mat); break;
            case BLOCK.LEAF: _leafBlocks.push(mat); break;
            case BLOCK.SNOW: _snowBlocks.push(mat); break;
            case BLOCK.CACTUS: _cactusBlocks.push(mat); break;
            case BLOCK.PINE_LEAF: _pineLeafBlocks.push(mat); break;
            case BLOCK.STAIR_NORTH:
            case BLOCK.STAIR_EAST:
            case BLOCK.STAIR_SOUTH:
            case BLOCK.STAIR_WEST:
                 _stairBlocks.push(mat); break;
            case BLOCK.COBBLESTONE_STAIR_NORTH:
            case BLOCK.COBBLESTONE_STAIR_EAST:
            case BLOCK.COBBLESTONE_STAIR_SOUTH:
            case BLOCK.COBBLESTONE_STAIR_WEST:
                 _cobbleStairBlocks.push(mat); break;
            case BLOCK.PLANK: _plankBlocks.push(mat); break;
            case BLOCK.BRICK: _brickBlocks.push(mat); break;
            case BLOCK.GLASS: _glassBlocks.push(mat); break;
            case BLOCK.COBBLESTONE: _cobbleBlocks.push(mat); break;
            case BLOCK.GRAVEL: _gravelBlocks.push(mat); break;
            case BLOCK.FARMLAND: _farmlandBlocks.push(mat); break;
            case BLOCK.WHEAT_STAGE_0: _wheat0Blocks.push(mat); break;
            case BLOCK.WHEAT_STAGE_1: _wheat1Blocks.push(mat); break;
            case BLOCK.WHEAT_STAGE_2: _wheat2Blocks.push(mat); break;
            case BLOCK.WHEAT_STAGE_3: _wheat3Blocks.push(mat); break;
            case BLOCK.TALL_GRASS: _tallGrassBlocks.push(mat); break;
            case BLOCK.RED_FLOWER: _redFlowerBlocks.push(mat); break;
            case BLOCK.YELLOW_FLOWER: _yellowFlowerBlocks.push(mat); break;
            case BLOCK.DOOR_BOTTOM: case BLOCK.DOOR_TOP: case BLOCK.DOOR_BOTTOM_OPEN: case BLOCK.DOOR_TOP_OPEN: _doorBlocks.push(mat); break;
            case BLOCK.BED_FOOT_NORTH: case BLOCK.BED_FOOT_EAST: case BLOCK.BED_FOOT_SOUTH: case BLOCK.BED_FOOT_WEST: _bedFootBlocks.push(mat); break;
            case BLOCK.BED_HEAD_NORTH: case BLOCK.BED_HEAD_EAST: case BLOCK.BED_HEAD_SOUTH: case BLOCK.BED_HEAD_WEST: _bedHeadBlocks.push(mat); break;
            case BLOCK.TORCH: case BLOCK.TORCH_NORTH: case BLOCK.TORCH_EAST: case BLOCK.TORCH_SOUTH: case BLOCK.TORCH_WEST: _torchBlocks.push(mat); break;
            case BLOCK.FENCE: _fencePostBlocks.push(mat); break;
        }
    };
    
    // Helper to check for fence connections
    const isConnectable = (nType: number) => {
        if (nType === BLOCK.AIR) return false;
        if (nType === BLOCK.FENCE) return true;
        const def = BLOCK_DEFS[nType];
        if (def && def.solid && nType !== BLOCK.CACTUS && nType !== BLOCK.LEAF && nType !== BLOCK.PINE_LEAF && nType !== BLOCK.TORCH) return true;
        return false;
    };

    const processBlock = (vBlock: number, worldX: number, y: number, worldZ: number) => {
        dummy.position.set(worldX, y, worldZ); dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1);
        
        if (vBlock === BLOCK.FENCE) {
             // Check neighbors
             const nN = getBlock(worldX, y, worldZ - 1, noise, modifiedBlocks.current);
             const nE = getBlock(worldX + 1, y, worldZ, noise, modifiedBlocks.current);
             const nS = getBlock(worldX, y, worldZ + 1, noise, modifiedBlocks.current);
             const nW = getBlock(worldX - 1, y, worldZ, noise, modifiedBlocks.current);
             
             if (isConnectable(nN)) _fenceNBlocks.push(dummy.matrix.clone());
             if (isConnectable(nE)) {
                 dummy.rotation.y = -Math.PI / 2;
                 dummy.updateMatrix();
                 _fenceEBlocks.push(dummy.matrix.clone());
                 dummy.rotation.y = 0;
             }
             if (isConnectable(nS)) {
                 dummy.rotation.y = Math.PI;
                 dummy.updateMatrix();
                 _fenceSBlocks.push(dummy.matrix.clone());
                 dummy.rotation.y = 0;
             }
             if (isConnectable(nW)) {
                 dummy.rotation.y = Math.PI / 2;
                 dummy.updateMatrix();
                 _fenceWBlocks.push(dummy.matrix.clone());
                 dummy.rotation.y = 0;
             }
             
             dummy.updateMatrix();
        }

        if ((vBlock >= BLOCK.STAIR_NORTH && vBlock <= BLOCK.STAIR_WEST) || (vBlock >= BLOCK.COBBLESTONE_STAIR_NORTH && vBlock <= BLOCK.COBBLESTONE_STAIR_WEST)) {
            const isSouth = vBlock === BLOCK.STAIR_SOUTH || vBlock === BLOCK.COBBLESTONE_STAIR_SOUTH;
            const isEast = vBlock === BLOCK.STAIR_EAST || vBlock === BLOCK.COBBLESTONE_STAIR_EAST;
            const isWest = vBlock === BLOCK.STAIR_WEST || vBlock === BLOCK.COBBLESTONE_STAIR_WEST;
            
            if (isSouth) dummy.rotation.y = Math.PI;
            else if (isEast) dummy.rotation.y = -Math.PI / 2;
            else if (isWest) dummy.rotation.y = Math.PI / 2;
        }

        if (vBlock >= BLOCK.BED_FOOT_NORTH && vBlock <= BLOCK.BED_HEAD_WEST) {
             if (vBlock === BLOCK.BED_FOOT_SOUTH || vBlock === BLOCK.BED_HEAD_SOUTH) dummy.rotation.y = Math.PI;
             else if (vBlock === BLOCK.BED_FOOT_EAST || vBlock === BLOCK.BED_HEAD_EAST) dummy.rotation.y = -Math.PI / 2;
             else if (vBlock === BLOCK.BED_FOOT_WEST || vBlock === BLOCK.BED_HEAD_WEST) dummy.rotation.y = Math.PI / 2;
        }
        
        if (vBlock >= BLOCK.TORCH && vBlock <= BLOCK.TORCH_WEST) {
             if (vBlock === BLOCK.TORCH_NORTH) {
                 dummy.position.z += 0.35; dummy.position.y += 0.2; dummy.rotation.x = Math.PI / 6;
             } else if (vBlock === BLOCK.TORCH_SOUTH) {
                 dummy.position.z -= 0.35; dummy.position.y += 0.2; dummy.rotation.x = -Math.PI / 6;
             } else if (vBlock === BLOCK.TORCH_WEST) {
                 dummy.position.x += 0.35; dummy.position.y += 0.2; dummy.rotation.z = -Math.PI / 6;
             } else if (vBlock === BLOCK.TORCH_EAST) {
                 dummy.position.x -= 0.35; dummy.position.y += 0.2; dummy.rotation.z = Math.PI / 6;
             }
        }

        if (vBlock === BLOCK.DOOR_BOTTOM_OPEN || vBlock === BLOCK.DOOR_TOP_OPEN) dummy.rotation.y = Math.PI / 2;
        if (vBlock >= BLOCK.WHEAT_STAGE_0 && vBlock <= BLOCK.WHEAT_STAGE_3) { dummy.scale.set(1, 0.7, 1); dummy.position.y -= 0.15; }
        if (vBlock === BLOCK.FARMLAND) { dummy.scale.set(1, 0.94, 1); dummy.position.y -= 0.03; }
        
        if (vBlock === BLOCK.WATER_FLOW_1) { 
            const h = 0.8; dummy.scale.set(1, h, 1); dummy.position.y -= (1-h)/2; 
        } else if (vBlock === BLOCK.WATER_FLOW_2) { 
            const h = 0.5; dummy.scale.set(1, h, 1); dummy.position.y -= (1-h)/2; 
        } else if (vBlock === BLOCK.WATER_FLOW_3) { 
            const h = 0.2; dummy.scale.set(1, h, 1); dummy.position.y -= (1-h)/2; 
        }

        dummy.updateMatrix();
        addBlockToArrays(dummy.matrix.clone(), vBlock);
    };

    for (let x = 0; x < Config.CHUNK_SIZE; x++) {
      for (let z = 0; z < Config.CHUNK_SIZE; z++) {
        const worldX = startX + x, worldZ = startZ + z;
        const groundH = getBlockHeight(noise, worldX, worldZ);
        const scanMax = Math.max(groundH + 10, Config.WATER_LEVEL + 1);
        for (let y = -8; y <= scanMax; y++) {
            const vBlock = getBlock(worldX, y, worldZ, noise, modifiedBlocks.current);
            if (vBlock !== BLOCK.AIR) {
                const key = `${worldX},${y},${worldZ}`;
                if (modifiedBlocks.current.has(key)) continue;
                processBlock(vBlock, worldX, y, worldZ);
            }
        }
      }
    }
    for (const [key, type] of modifiedBlocks.current.entries()) {
        if (type === BLOCK.AIR) continue; 
        const [ux, uy, uz] = key.split(',').map(Number);
        if (ux >= startX && ux < startX + Config.CHUNK_SIZE && uz >= startZ && uz < startZ + Config.CHUNK_SIZE) {
            processBlock(type, ux, uy, uz);
        }
    }
    return { blocks: _blocks, dirtBlocks: _dirtBlocks, stoneBlocks: _stoneBlocks, waterBlocks: _waterBlocks, sandBlocks: _sandBlocks, woodBlocks: _woodBlocks, leafBlocks: _leafBlocks, plankBlocks: _plankBlocks, brickBlocks: _brickBlocks, glassBlocks: _glassBlocks, snowBlocks: _snowBlocks, cactusBlocks: _cactusBlocks, pineLeafBlocks: _pineLeafBlocks, stairBlocks: _stairBlocks, doorBlocks: _doorBlocks, cobbleBlocks: _cobbleBlocks, gravelBlocks: _gravelBlocks, farmlandBlocks: _farmlandBlocks, wheat0Blocks: _wheat0Blocks, wheat1Blocks: _wheat1Blocks, wheat2Blocks: _wheat2Blocks, wheat3Blocks: _wheat3Blocks, tallGrassBlocks: _tallGrassBlocks, redFlowerBlocks: _redFlowerBlocks, yellowFlowerBlocks: _yellowFlowerBlocks, cobbleStairBlocks: _cobbleStairBlocks, bedFootBlocks: _bedFootBlocks, bedHeadBlocks: _bedHeadBlocks, torchBlocks: _torchBlocks, fencePostBlocks: _fencePostBlocks, fenceNBlocks: _fenceNBlocks, fenceEBlocks: _fenceEBlocks, fenceSBlocks: _fenceSBlocks, fenceWBlocks: _fenceWBlocks };
  }, [chunkX, chunkZ, noise, version, modifiedBlocks]);

  useLayoutEffect(() => {
    const apply = (ref: any, data: any) => { if(ref.current) { data.forEach((m:any, i:any)=>ref.current.setMatrixAt(i,m)); ref.current.instanceMatrix.needsUpdate=true; }};
    apply(meshRef, blocks); apply(dirtRef, dirtBlocks); apply(stoneRef, stoneBlocks); apply(waterRef, waterBlocks); apply(sandRef, sandBlocks); apply(woodRef, woodBlocks); apply(leafRef, leafBlocks); apply(plankRef, plankBlocks); apply(brickRef, brickBlocks); apply(glassRef, glassBlocks); apply(snowRef, snowBlocks); apply(cactusRef, cactusBlocks); apply(pineLeafRef, pineLeafBlocks); apply(stairRef, stairBlocks); apply(doorRef, doorBlocks); apply(cobbleRef, cobbleBlocks); apply(gravelRef, gravelBlocks); apply(farmlandRef, farmlandBlocks); apply(wheat0Ref, wheat0Blocks); apply(wheat1Ref, wheat1Blocks); apply(wheat2Ref, wheat2Blocks); apply(wheat3Ref, wheat3Blocks); apply(tallGrassRef, tallGrassBlocks); apply(redFlowerRef, redFlowerBlocks); apply(yellowFlowerRef, yellowFlowerBlocks); apply(cobbleStairRef, cobbleStairBlocks); apply(bedFootRef, bedFootBlocks); apply(bedHeadRef, bedHeadBlocks); apply(torchRef, torchBlocks); apply(fencePostRef, fencePostBlocks); apply(fenceNRef, fenceNBlocks); apply(fenceERef, fenceEBlocks); apply(fenceSRef, fenceSBlocks); apply(fenceWRef, fenceWBlocks);
  }, [blocks]);

  return (
    <group frustumCulled>
        {/* GRASS BLOCK: Uses multi-material for Side/Top/Bottom texture mapping */}
        <instancedMesh ref={meshRef} args={[undefined, undefined, blocks.length]} castShadow receiveShadow userData={{ isTerrain: true }}>
             <boxGeometry args={[1, 1, 1]} />
             {/* Material Index Order: Right, Left, Top, Bottom, Front, Back */}
             <meshStandardMaterial attach="material-0" map={BLOCK_TEXTURES.grass_side} roughness={1} color="white" />
             <meshStandardMaterial attach="material-1" map={BLOCK_TEXTURES.grass_side} roughness={1} color="white" />
             <meshStandardMaterial attach="material-2" map={BLOCK_TEXTURES.grass_top} roughness={1} color="white" />
             <meshStandardMaterial attach="material-3" map={BLOCK_TEXTURES.dirt} roughness={1} color="white" />
             <meshStandardMaterial attach="material-4" map={BLOCK_TEXTURES.grass_side} roughness={1} color="white" />
             <meshStandardMaterial attach="material-5" map={BLOCK_TEXTURES.grass_side} roughness={1} color="white" />
        </instancedMesh>

        <instancedMesh ref={dirtRef} args={[undefined, undefined, dirtBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.dirt} color="white" roughness={1} /> </instancedMesh>
        <instancedMesh ref={stoneRef} args={[undefined, undefined, stoneBlocks.length]} userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.stone} color="white" roughness={0.6} /> </instancedMesh>
        <instancedMesh ref={cobbleRef} args={[undefined, undefined, cobbleBlocks.length]} userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.cobblestone} color="white" roughness={0.9} /> </instancedMesh>
        <instancedMesh ref={sandRef} args={[undefined, undefined, sandBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.sand} color="white" roughness={0.9} /> </instancedMesh>
        <instancedMesh ref={gravelRef} args={[undefined, undefined, gravelBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.gravel} color="white" roughness={1.0} /> </instancedMesh>
        <instancedMesh ref={farmlandRef} args={[undefined, undefined, farmlandBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.farmland} color="white" roughness={1.0} /> </instancedMesh>
        
        {/* Wheat Growth Stages */}
        <instancedMesh ref={wheat0Ref} args={[plantGeometry, undefined, wheat0Blocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.wheat_0} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> </instancedMesh>
        <instancedMesh ref={wheat1Ref} args={[plantGeometry, undefined, wheat1Blocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.wheat_1} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> </instancedMesh>
        <instancedMesh ref={wheat2Ref} args={[plantGeometry, undefined, wheat2Blocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.wheat_2} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> </instancedMesh>
        <instancedMesh ref={wheat3Ref} args={[plantGeometry, undefined, wheat3Blocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.wheat_3} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> </instancedMesh>
        
        <instancedMesh ref={tallGrassRef} args={[plantGeometry, undefined, tallGrassBlocks.length]} userData={{ isTerrain: true }}> 
            <meshStandardMaterial map={BLOCK_TEXTURES.tall_grass} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> 
        </instancedMesh>
        <instancedMesh ref={redFlowerRef} args={[plantGeometry, undefined, redFlowerBlocks.length]} userData={{ isTerrain: true }}> 
            <meshStandardMaterial map={BLOCK_TEXTURES.red_flower} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> 
        </instancedMesh>
        <instancedMesh ref={yellowFlowerRef} args={[plantGeometry, undefined, yellowFlowerBlocks.length]} userData={{ isTerrain: true }}> 
            <meshStandardMaterial map={BLOCK_TEXTURES.yellow_flower} color="white" side={THREE.DoubleSide} transparent alphaTest={0.5} /> 
        </instancedMesh>

        <instancedMesh ref={snowRef} args={[undefined, undefined, snowBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.snow} color="white" roughness={0.5} /> </instancedMesh>
        
        {/* WOOD BLOCK: Uses multi-material for Bark Side / Rings Top */}
        <instancedMesh ref={woodRef} args={[undefined, undefined, woodBlocks.length]} castShadow receiveShadow userData={{ isTerrain: true }}> 
            <boxGeometry args={[1, 1, 1]} /> 
            <meshStandardMaterial attach="material-0" map={BLOCK_TEXTURES.wood_side} roughness={0.9} color="white" />
            <meshStandardMaterial attach="material-1" map={BLOCK_TEXTURES.wood_side} roughness={0.9} color="white" />
            <meshStandardMaterial attach="material-2" map={BLOCK_TEXTURES.wood_top} roughness={0.9} color="white" />
            <meshStandardMaterial attach="material-3" map={BLOCK_TEXTURES.wood_top} roughness={0.9} color="white" />
            <meshStandardMaterial attach="material-4" map={BLOCK_TEXTURES.wood_side} roughness={0.9} color="white" />
            <meshStandardMaterial attach="material-5" map={BLOCK_TEXTURES.wood_side} roughness={0.9} color="white" />
        </instancedMesh>

        <instancedMesh ref={cactusRef} args={[undefined, undefined, cactusBlocks.length]} castShadow receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[0.85, 1, 0.85]} /> <meshStandardMaterial map={BLOCK_TEXTURES.cactus} color="white" roughness={0.8} /> </instancedMesh>
        
        <instancedMesh ref={leafRef} args={[undefined, undefined, leafBlocks.length]} castShadow receiveShadow userData={{ isTerrain: true }}> 
            <boxGeometry args={[1, 1, 1]} /> 
            <meshStandardMaterial map={BLOCK_TEXTURES.leaf} color="white" roughness={0.8} transparent alphaTest={0.5} side={THREE.DoubleSide} /> 
        </instancedMesh>
        <instancedMesh ref={pineLeafRef} args={[undefined, undefined, pineLeafBlocks.length]} castShadow receiveShadow userData={{ isTerrain: true }}> 
            <boxGeometry args={[1, 1, 1]} /> 
            <meshStandardMaterial map={BLOCK_TEXTURES.pine_leaf} color="white" roughness={0.8} transparent alphaTest={0.5} side={THREE.DoubleSide} /> 
        </instancedMesh>

        <instancedMesh ref={plankRef} args={[undefined, undefined, plankBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>
        
        <instancedMesh ref={brickRef} args={[undefined, undefined, brickBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.brick} color="white" roughness={0.9} /> </instancedMesh>
        <instancedMesh ref={stairRef} args={[stairGeometry, undefined, stairBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.6} /> </instancedMesh>
        <instancedMesh ref={cobbleStairRef} args={[stairGeometry, undefined, cobbleStairBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.cobblestone} color="white" roughness={0.9} /> </instancedMesh>
        <instancedMesh ref={doorRef} args={[undefined, undefined, doorBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 0.2]} /> <meshStandardMaterial map={BLOCK_TEXTURES.door} color="white" roughness={0.8} /> </instancedMesh>
        <instancedMesh ref={bedFootRef} args={[bedGeometry, undefined, bedFootBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.bed_foot} color="white" roughness={0.9} /> </instancedMesh>
        <instancedMesh ref={bedHeadRef} args={[bedGeometry, undefined, bedHeadBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.bed_head} color="white" roughness={0.9} /> </instancedMesh>
        
        <instancedMesh ref={torchRef} args={[torchGeometry, undefined, torchBlocks.length]} receiveShadow userData={{ isTerrain: true }}>
             <meshStandardMaterial 
                map={BLOCK_TEXTURES.torch} 
                emissiveMap={BLOCK_TEXTURES.torch_emissive}
                emissive="#ffaa00"
                emissiveIntensity={2.0}
                color="white"
                transparent 
                alphaTest={0.5} 
            />
        </instancedMesh>
        
        {/* FENCE PARTS */}
        <instancedMesh ref={fencePostRef} args={[undefined, undefined, fencePostBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <boxGeometry args={[0.25, 1, 0.25]} /> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>
        <instancedMesh ref={fenceNRef} args={[fenceConnectGeometry, undefined, fenceNBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>
        <instancedMesh ref={fenceERef} args={[fenceConnectGeometry, undefined, fenceEBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>
        <instancedMesh ref={fenceSRef} args={[fenceConnectGeometry, undefined, fenceSBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>
        <instancedMesh ref={fenceWRef} args={[fenceConnectGeometry, undefined, fenceWBlocks.length]} receiveShadow userData={{ isTerrain: true }}> <meshStandardMaterial map={BLOCK_TEXTURES.plank} color="white" roughness={0.8} /> </instancedMesh>

        <instancedMesh ref={glassRef} args={[undefined, undefined, glassBlocks.length]} userData={{ isTerrain: true }}> <boxGeometry args={[1, 1, 1]} /> <meshStandardMaterial map={BLOCK_TEXTURES.glass} color="white" transparent opacity={0.5} side={THREE.DoubleSide} /> </instancedMesh>
        <instancedMesh ref={waterRef} args={[undefined, undefined, waterBlocks.length]} receiveShadow userData={{ isTerrain: true }}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                ref={waterMaterialRef}
                map={BLOCK_TEXTURES.water}
                color="white"
                transparent
                opacity={0.7}
                roughness={1}
                metalness={0}
            />
        </instancedMesh>
    </group>
  );
});
