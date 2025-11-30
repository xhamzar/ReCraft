import { TOOLS_DATA } from '../../data/items/tools';
import { TERRAIN_DATA } from '../../data/blocks/terrain';
import { BLOCK } from '../world/BlockRegistry';
import { FishingRodIcon, RawFishIcon, WoodSwordIcon, SeedsIcon, WheatIcon, FenceIcon, StickIcon, BlockIcon, StairIcon, RawBeefIcon } from '../ui/icons';
import { BLOCK_TEXTURES } from '../graphics/TextureGenerator';
import React from 'react';
import * as THREE from 'three';

export interface ItemDef {
    id: number;
    name: string;
    color: string;
    maxStack?: number;
    isBlock: boolean;
    icon?: React.FC;
}

export const INVENTORY: ItemDef[] = [];

TERRAIN_DATA.forEach((def: any) => {
    if ((def.visible !== false || def.id === 'bed_item') && def.id !== 'wheat_item' && def.id !== 'seeds' && def.id !== 'fence' && def.id !== 'stair' && def.id !== 'cobblestone_stair') {
        
        let icon: React.FC | undefined = undefined;

        // Memetakan ID blok ke kunci tekstur yang representatif
        let textureKey = def.id;
        if (def.id === 'grass') textureKey = 'grass_side';
        else if (def.id === 'wood') textureKey = 'wood_side';
        else if (def.id === 'crafting_table') textureKey = 'crafting_table_top';
        else if (def.id === 'door_bottom') textureKey = 'door';
        else if (def.id === 'bed_item') textureKey = 'bed_head';

        const texture = (BLOCK_TEXTURES as any)[textureKey] as THREE.CanvasTexture | undefined;

        if (texture) {
            icon = () => React.createElement(BlockIcon, { texture: texture });
        }
        
        let name = def.id.charAt(0).toUpperCase() + def.id.slice(1).replace(/_/g, ' ');
        if (def.id === 'door_bottom') {
            name = 'Door';
        }

        INVENTORY.push({
            id: def.type,
            name: name,
            color: def.color || '#ff00ff',
            isBlock: true,
            icon: icon
        });
    }
});

// Entri manual untuk blok khusus
INVENTORY.push({
    id: BLOCK.STAIR,
    name: 'Stair',
    color: '#a0522d',
    isBlock: true,
    icon: () => React.createElement(StairIcon, { color: '#a0522d', shadowColor: '#7a3e21' })
});

INVENTORY.push({
    id: BLOCK.COBBLESTONE_STAIR,
    name: 'Cobblestone Stair',
    color: '#777',
    isBlock: true,
    icon: () => React.createElement(StairIcon, { color: '#777', shadowColor: '#444' })
});

INVENTORY.push({
    id: BLOCK.FENCE,
    name: 'Fence',
    color: '#a0522d',
    isBlock: true,
    icon: FenceIcon
});

INVENTORY.push({
    id: BLOCK.STICK,
    name: 'Stick',
    color: '#8B4513',
    isBlock: false,
    icon: StickIcon
});


const iconMap: Record<number, React.FC> = {
    [BLOCK.FISHING_ROD]: FishingRodIcon,
    [BLOCK.RAW_FISH]: RawFishIcon,
    [BLOCK.WOOD_SWORD]: WoodSwordIcon,
    [BLOCK.SEEDS]: SeedsIcon,
    [BLOCK.WHEAT_ITEM]: WheatIcon,
    [BLOCK.RAW_BEEF]: RawBeefIcon,
};

// Tambahkan Benih secara manual
INVENTORY.push({
    id: BLOCK.SEEDS,
    name: "Seeds",
    color: "#336600",
    isBlock: false, // Menempatkan blok, tetapi ditangani melalui logika kustom
    icon: SeedsIcon
});

// Tambahkan Gandum secara manual
INVENTORY.push({
    id: BLOCK.WHEAT_ITEM,
    name: "Wheat",
    color: "#dcb158",
    isBlock: false,
    icon: WheatIcon
});

TOOLS_DATA.forEach((def: any) => {
    INVENTORY.push({
        id: def.type,
        name: def.name,
        color: def.color,
        isBlock: false,
        icon: iconMap[def.type]
    });
});

export const getItemDef = (id: number) => INVENTORY.find(i => i.id === id);