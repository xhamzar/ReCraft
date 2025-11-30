import { TERRAIN_DATA } from '../../data/blocks/terrain';
import { TOOLS_DATA } from '../../data/items/tools';

export interface BlockDef {
    id: string;
    type: number;
    color?: string;
    solid: boolean;
    transparent?: boolean;
    geometry?: string;
    visible?: boolean;
}

export const BLOCK: Record<string, number> = {};
export const BLOCK_DEFS: Record<number, BlockDef> = {};

BLOCK['STAIR'] = 14; // The generic item in the inventory
BLOCK['COBBLESTONE_STAIR'] = 200; // Virtual ID for inventory item to avoid collision with terrain IDs
BLOCK['STICK'] = 201;
BLOCK['RAW_BEEF'] = 105;
BLOCK['ENCHANTING_TABLE'] = 72;


TERRAIN_DATA.forEach((def: any) => {
    const nameKey = def.id.toUpperCase();
    BLOCK[nameKey] = def.type;
    BLOCK_DEFS[def.type] = def;
});

TOOLS_DATA.forEach((def: any) => {
    const nameKey = def.id.toUpperCase();
    BLOCK[nameKey] = def.type;
});

// Alias for generic "WHEAT" used in world gen to point to mature wheat
BLOCK['WHEAT'] = BLOCK['WHEAT_STAGE_3'];

export const getBlockDef = (type: number): BlockDef | undefined => {
    return BLOCK_DEFS[type];
};