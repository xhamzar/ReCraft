import { BLOCK } from '../engine/world/BlockRegistry';

export interface Recipe {
    outputId: number;
    outputCount: number;
    shape: string[];
    ingredients: { [key: string]: number };
    requiresTable: boolean;
}

export const CRAFTING_RECIPES: Recipe[] = [
    // Resep 2x2 (Player Inventory)
    {
        outputId: BLOCK.PLANK,
        outputCount: 4,
        shape: ["W"],
        ingredients: { W: BLOCK.WOOD },
        requiresTable: false
    },
    {
        outputId: BLOCK.STICK,
        outputCount: 4,
        shape: ["P", "P"],
        ingredients: { P: BLOCK.PLANK },
        requiresTable: false
    },
    {
        outputId: BLOCK.CRAFTING_TABLE,
        outputCount: 1,
        shape: ["PP", "PP"],
        ingredients: { P: BLOCK.PLANK },
        requiresTable: false
    },
    {
        outputId: BLOCK.TORCH,
        outputCount: 4,
        shape: ["P", "S"],
        ingredients: { P: BLOCK.PLANK, S: BLOCK.STICK }, // Menggunakan papan sebagai pengganti batu bara
        requiresTable: false
    },
    
    // Resep 3x3 (Crafting Table)
    {
        outputId: BLOCK.WOOD_SWORD,
        outputCount: 1,
        shape: [" P ", " P ", " S "],
        ingredients: { P: BLOCK.PLANK, S: BLOCK.STICK },
        requiresTable: true
    },
    {
        outputId: BLOCK.FENCE,
        outputCount: 3,
        shape: ["PSP", "PSP"],
        ingredients: { P: BLOCK.PLANK, S: BLOCK.STICK },
        requiresTable: true
    },
    {
        outputId: BLOCK.COBBLESTONE_STAIR,
        outputCount: 4,
        shape: ["C  ", "CC ", "CCC"],
        ingredients: { C: BLOCK.COBBLESTONE },
        requiresTable: true
    },
    {
        outputId: BLOCK.STAIR,
        outputCount: 4,
        shape: ["P  ", "PP ", "PPP"],
        ingredients: { P: BLOCK.PLANK },
        requiresTable: true
    },
    {
        outputId: BLOCK.STONE,
        outputCount: 1,
        shape: ["C"],
        ingredients: { C: BLOCK.COBBLESTONE },
        requiresTable: true // Mensimulasikan furnace
    }
];
