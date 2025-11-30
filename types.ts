
export interface ControlState {
  move: { x: number; y: number };
  look: { x: number; y: number };
  jump: boolean;
  crouch: boolean;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ItemStack {
  id: number;
  count: number;
  enchantments?: { [key: string]: number };
}