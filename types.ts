
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

// --- NETWORK TYPES ---

export type PacketType = 'INIT' | 'PLAYER_UPDATE' | 'BLOCK_UPDATE' | 'CHAT';

export interface NetworkPacket {
  type: PacketType;
  payload: any;
}

export interface InitPayload {
  seed: number;
  modifiedBlocks: [string, number][]; // Send map as array of entries
  spawnPos: {x: number, y: number, z: number};
}

export interface PlayerUpdatePayload {
  id: string;
  pos: [number, number, number];
  rot: [number, number, number, number]; // Quaternion array
  animState: { walking: boolean, crouching: boolean };
}

export interface BlockUpdatePayload {
  key: string;
  val: number;
}

export interface ChatPayload {
  id: string; // Random message ID
  senderId: string;
  senderName: string; // Short ID or custom name
  message: string;
  timestamp: number;
}
