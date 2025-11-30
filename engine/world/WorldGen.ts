
import { SimplexNoise } from '../math/Noise';
import { BLOCK } from './BlockRegistry';
import { Config } from '../core/Config';

const { NOISE_SCALE, WATER_LEVEL } = Config;

export const getBlockHeight = (noise: SimplexNoise, x: number, z: number) => {
  const noiseVal = noise.noise(x * NOISE_SCALE, z * NOISE_SCALE);
  return Math.round((noiseVal + 1) * 4);
};

export const getTreeRandom = (x: number, z: number) => {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

const BIOME_SCALE = 0.01; 

export const getBiome = (noise: SimplexNoise, x: number, z: number): 'FOREST' | 'DESERT' | 'SNOW' => {
    const val = noise.noise((x + 10000) * BIOME_SCALE, (z + 10000) * BIOME_SCALE);
    if (val < -0.3) return 'SNOW';
    if (val > 0.3) return 'DESERT';
    return 'FOREST';
};

const getVillageBlock = (x: number, y: number, z: number, noise: SimplexNoise): number => {
    const PLOT_SIZE = 32;
    const plotX = Math.floor(x / PLOT_SIZE);
    const plotZ = Math.floor(z / PLOT_SIZE);
    const plotHash = Math.abs(Math.sin(plotX * 12.989 + plotZ * 78.233) * 43758.5453);
    const hasVillage = (plotHash % 1) > 0.4; 

    if (!hasVillage) return -1; 

    const centerX = plotX * PLOT_SIZE + 16;
    const centerZ = plotZ * PLOT_SIZE + 16;
    const groundH = getBlockHeight(noise, centerX, centerZ);
    const biome = getBiome(noise, centerX, centerZ);

    if (biome === 'DESERT' || groundH < WATER_LEVEL) return -1;

    const dx = x - centerX;
    const dz = z - centerZ;

    if (Math.abs(dx) <= 1 || Math.abs(dz) <= 1) {
        const roadY = getBlockHeight(noise, x, z);
        if (y === roadY) return BLOCK.GRAVEL;
        if (y > roadY && y <= roadY + 3) return BLOCK.AIR;
        return -1;
    }
    
    const qx = dx > 0 ? 1 : -1;
    const qz = dz > 0 ? 1 : -1;
    const bCenterX = centerX + qx * 8;
    const bCenterZ = centerZ + qz * 8;
    const buildHash = Math.abs(Math.sin(bCenterX * 34.12 + bCenterZ * 98.65) * 12345.67);
    const buildType = Math.floor((buildHash % 1) * 10); 
    if (buildType === 9) return -1;

    const bdx = x - bCenterX;
    const bdz = z - bCenterZ;
    const bGround = getBlockHeight(noise, bCenterX, bCenterZ);

    if (buildType === 8) {
        if (Math.abs(bdx) === 0 && Math.abs(bdz) === 0) {
            if (y > bGround && y <= bGround + 3) return BLOCK.WOOD;
            if (y === bGround + 4) return BLOCK.GLASS;
        }
        return -1;
    }

    if (buildType === 5 || buildType === 6) {
        const SIZE = 3;
        if (Math.abs(bdx) <= SIZE && Math.abs(bdz) <= SIZE) {
            if (y < bGround) return BLOCK.DIRT;
            if (y === bGround) {
                if (bdx === 0 && bdz === 0) return BLOCK.WATER;
                if (Math.abs(bdx) === SIZE || Math.abs(bdz) === SIZE) return BLOCK.WOOD;
                return BLOCK.FARMLAND;
            }
            if (y === bGround + 1) {
                if (bdx === 0 && bdz === 0) return BLOCK.AIR;
                if (Math.abs(bdx) === SIZE || Math.abs(bdz) === SIZE) return BLOCK.AIR;
                return BLOCK.WHEAT;
            }
        }
        return -1;
    }

    const isLarge = buildType === 7;
    const SIZE = isLarge ? 4 : 3;
    const HEIGHT = isLarge ? 4 : 3;
    
    if (Math.abs(bdx) <= SIZE && Math.abs(bdz) <= SIZE) {
        const localGround = getBlockHeight(noise, x, z);
        if (y <= bGround && y >= localGround) return BLOCK.COBBLESTONE;
        if (y === bGround + 1) return BLOCK.PLANK;

        if (y > bGround + 1 && y <= bGround + 1 + HEIGHT) {
            if (Math.abs(bdx) === SIZE || Math.abs(bdz) === SIZE) {
                if (bdz === -SIZE && bdx === 0 && y <= bGround + 3) {
                    if (y === bGround + 2) return BLOCK.DOOR_BOTTOM;
                    if (y === bGround + 3) return BLOCK.DOOR_TOP;
                    return BLOCK.AIR;
                }
                if (y === bGround + 3 && Math.abs(bdx) === SIZE && bdz === 0) {
                    return BLOCK.GLASS;
                }
                if (Math.abs(bdx) === SIZE && Math.abs(bdz) === SIZE) {
                    return BLOCK.WOOD;
                }
                return BLOCK.PLANK;
            }
            if (Math.abs(bdx) < SIZE && Math.abs(bdz) < SIZE) {
                return BLOCK.AIR;
            }
        }

        const roofBaseY = bGround + 1 + HEIGHT;
        const roofY = y - roofBaseY;
        const ridgeHeight = Math.floor(SIZE / 2) + 1;

        if (roofY >= 1 && roofY <= ridgeHeight) {
            const roofWidthAtY = SIZE - (roofY - 1);
            
            if (Math.abs(bdz) === SIZE && Math.abs(bdx) <= roofWidthAtY) {
                if (Math.abs(bdx) === roofWidthAtY) {
                } else {
                    return BLOCK.PLANK;
                }
            }
            
            if (Math.abs(bdz) <= SIZE) {
                if (Math.abs(bdx) === roofWidthAtY) {
                    return bdx > 0 ? BLOCK.STAIR_WEST : BLOCK.STAIR_EAST;
                }
                if (roofY === ridgeHeight && Math.abs(bdx) < roofWidthAtY) {
                    return BLOCK.PLANK;
                }
            }
        }
    }
    return -1;
};

export const getBlock = (x: number, y: number, z: number, noise: SimplexNoise, modifiedBlocks: Map<string, number>): number => {
  const bx = Math.round(x);
  const by = Math.round(y);
  const bz = Math.round(z);
  const key = `${bx},${by},${bz}`;

  if (modifiedBlocks.has(key)) return modifiedBlocks.get(key) || BLOCK.AIR;
  if (by < Config.WORLD_HEIGHT_MIN) return BLOCK.STONE;

  const vBlock = getVillageBlock(bx, by, bz, noise);
  if (vBlock !== -1) return vBlock;

  const groundHeight = getBlockHeight(noise, bx, bz);
  const biome = getBiome(noise, bx, bz);
  
  if (by > groundHeight && by <= WATER_LEVEL) return BLOCK.WATER;
  if (by <= groundHeight) {
      if (by === groundHeight) {
          if (by < WATER_LEVEL) return BLOCK.SAND; 
          if (biome === 'DESERT') return BLOCK.SAND;
          if (biome === 'SNOW') return BLOCK.SNOW;
          return BLOCK.GRASS;
      }
      if (by > groundHeight - 3) {
          if (by < WATER_LEVEL || biome === 'DESERT') return BLOCK.SAND;
          return BLOCK.DIRT;
      }
      return BLOCK.STONE;
  }

  if (by === groundHeight + 1 && groundHeight >= WATER_LEVEL) {
      if (biome === 'FOREST') {
          const vegHash = Math.abs(Math.sin(bx * 43.12 + bz * 21.32) * 521.21);
          const vegVal = vegHash % 1;
          if (vegVal > 0.85) return BLOCK.TALL_GRASS;
          if (vegVal > 0.83 && vegVal <= 0.85) return BLOCK.RED_FLOWER;
          if (vegVal > 0.81 && vegVal <= 0.83) return BLOCK.YELLOW_FLOWER;
      }
  }

  for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
           const checkX = bx + lx;
           const checkZ = bz + lz;
           if (getVillageBlock(checkX, groundHeight, checkZ, noise) !== -1) continue;

           if (getTreeRandom(checkX, checkZ) > 0.97) {
               const base = getBlockHeight(noise, checkX, checkZ);
               if (base < WATER_LEVEL) continue; 
               const treeBiome = getBiome(noise, checkX, checkZ);

               if (treeBiome === 'DESERT') {
                   const cactusH = 3;
                   if (lx === 0 && lz === 0) {
                       if (by > base && by <= base + cactusH) return BLOCK.CACTUS;
                   }
                   continue;
               }

               if (treeBiome === 'SNOW') {
                   const spruceH = 5;
                   if (lx === 0 && lz === 0) {
                       if (by > base && by <= base + spruceH) return BLOCK.WOOD;
                   }
                   const leavesStart = base + 2;
                   const leavesEnd = base + spruceH + 1;
                   if (by >= leavesStart && by <= leavesEnd) {
                       const layer = by - base;
                       let radius = 1;
                       if (layer <= 3) radius = 2;
                       if (layer > 3) radius = 1;
                       if (layer === spruceH + 1) radius = 0; 
                       if (Math.abs(lx) <= radius && Math.abs(lz) <= radius) {
                           if (lx === 0 && lz === 0 && by <= base + spruceH) continue;
                           return BLOCK.PINE_LEAF;
                       }
                   }
                   continue;
               }

               const th = 4; 
               if (lx === 0 && lz === 0) {
                   if (by > base && by <= base + th) return BLOCK.WOOD;
               }
               const leavesStart = base + th - 1;
               const leavesEnd = base + th + 1;
               if (by >= leavesStart && by <= leavesEnd + 1) {
                    if (by === leavesEnd + 1) {
                        if (lx === 0 && lz === 0) return BLOCK.LEAF;
                    } else {
                        if (Math.abs(lx) <= 1 && Math.abs(lz) <= 1) {
                            if (by === leavesEnd && Math.abs(lx) === 1 && Math.abs(lz) === 1) {} else {
                                return BLOCK.LEAF;
                            }
                        }
                    }
               }
           }
      }
  }
  return BLOCK.AIR;
};
