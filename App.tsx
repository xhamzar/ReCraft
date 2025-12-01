
import React, { useRef, useState, useEffect, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import * as THREE from 'three';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

// Engine Imports
import { Terrain } from './components/Terrain';
import { PlayerController, PlayerControllerHandle } from './engine/entities/PlayerController';
import { PlayerInteraction } from './components/PlayerInteraction';
import { InteractionController, InteractionControllerHandle } from './components/InteractionController';
import { MobManager, MobManagerHandle } from './components/MobManager';
import { DayNightCycle } from './components/DayNightCycle';
import { FishingSystem, FishingHandle } from './components/FishingSystem';
import { TorchLightSystem } from './components/TorchLightSystem';
import { CropSystem } from './components/CropSystem';
import { ItemDropManager, ItemDropManagerHandle } from './components/ItemDropManager';
import { SimplexNoise } from './engine/math/Noise';
import { updateFluids } from './engine/world/WaterSystem';
import { RemotePlayer } from './components/RemotePlayer';

// UI Imports
import { HUD } from './components/ui/HUD';
import { InventoryBar } from './components/ui/InventoryBar';
import { InventoryModal } from './components/ui/InventoryModal'; 
import { GameControls } from './components/ui/GameControls';
import { GameOver } from './components/ui/GameOver';
import { SettingsMenu, GameSettings } from './components/ui/SettingsMenu';
import { MainMenu } from './components/ui/MainMenu';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ChatBox } from './components/ui/ChatBox';

import { ControlState, ItemStack, InitPayload, PlayerUpdatePayload, BlockUpdatePayload, ChatPayload, TimeSyncPayload } from './types';
import { BLOCK } from './engine/world/BlockRegistry';
import { Config } from './engine/core/Config';
import { INVENTORY, getItemDef } from './engine/items/ItemRegistry';
import { Recipe } from './data/recipes';

const FluidSimulator = React.memo(({ 
    playerPositionRef, 
    modifiedBlocks, 
    terrainSeed, 
    updateChunkVersions 
}: { 
    playerPositionRef: React.MutableRefObject<THREE.Vector3>,
    modifiedBlocks: React.MutableRefObject<Map<string, number>>,
    terrainSeed: number,
    updateChunkVersions: (keys: string[]) => void
}) => {
    const noise = useMemo(() => new SimplexNoise(terrainSeed), [terrainSeed]);
    const lastUpdate = useRef(0);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (time - lastUpdate.current > 1.0) {
            updateFluids(playerPositionRef.current, noise, modifiedBlocks.current, updateChunkVersions);
            lastUpdate.current = time;
        }
    });

    return null;
});

// Component to handle Time Sync logic inside Canvas
const MultiplayerSyncManager = React.memo(({ 
    isHost, 
    broadcastData, 
    timeOffsetRef, 
    serverTimeTargetRef,
    reportCurrentTime
}: { 
    isHost: boolean, 
    broadcastData: (data: any) => void, 
    timeOffsetRef: React.MutableRefObject<number>,
    serverTimeTargetRef: React.MutableRefObject<number | null>,
    reportCurrentTime: (time: number) => void
}) => {
    const { clock } = useThree();
    const lastSyncTime = useRef(0);

    useFrame(() => {
        const localElapsed = clock.getElapsedTime();
        const totalGameTime = localElapsed + timeOffsetRef.current;

        // HOST LOGIC: Broadcast time periodically
        if (isHost) {
            // Report current time to parent App for INIT packets
            reportCurrentTime(totalGameTime);

            if (localElapsed - lastSyncTime.current > 5.0) { // Sync every 5 seconds
                lastSyncTime.current = localElapsed;
                broadcastData({ type: 'TIME_SYNC', payload: { time: totalGameTime } });
            }
        } 
        // CLIENT LOGIC: Sync to Host time
        else {
            if (serverTimeTargetRef.current !== null) {
                const targetTime = serverTimeTargetRef.current;
                
                // Calculate what the offset SHOULD be to match server time
                // totalGameTime = localElapsed + offset
                // offset = totalGameTime - localElapsed
                const neededOffset = targetTime - localElapsed;

                // Check difference to avoid jitter
                const diff = Math.abs(timeOffsetRef.current - neededOffset);

                if (diff > 1.0) {
                    // Hard snap if drift is large (e.g. Host slept)
                    timeOffsetRef.current = neededOffset;
                } else {
                    // Smooth lerp for small drift
                    timeOffsetRef.current = THREE.MathUtils.lerp(timeOffsetRef.current, neededOffset, 0.05);
                }

                // Clear target after consuming
                serverTimeTargetRef.current = null;
            }
        }
    });

    return null;
});

export interface GameTimeManagerHandle {
    trySleep: () => void;
}

const GameTimeManager = forwardRef<GameTimeManagerHandle, { 
    timeOffsetRef: React.MutableRefObject<number>, 
    onSleepStart: () => void, 
    onSleepEnd: () => void,
    setToast: (msg: string) => void,
    isMultiplayer: boolean,
    isHost: boolean
}>(({ timeOffsetRef, onSleepStart, onSleepEnd, setToast, isMultiplayer, isHost }, ref) => {
    const { clock } = useThree();

    useImperativeHandle(ref, () => ({
        trySleep: () => {
            // In multiplayer, only Host can trigger sleep (simplification)
            if (isMultiplayer && !isHost) {
                setToast("Only Host can sleep!");
                setTimeout(() => setToast(""), 2000);
                return;
            }

            const totalTime = clock.getElapsedTime() + timeOffsetRef.current;
            const cyclePos = (totalTime % Config.CYCLE_DURATION) / Config.CYCLE_DURATION;
            
            // Night is roughly 0.5 to 1.0
            if (cyclePos > 0.45 && cyclePos < 0.95) {
                onSleepStart();
                setTimeout(() => {
                    const currentTotal = clock.getElapsedTime() + timeOffsetRef.current;
                    const currentCycle = (currentTotal % Config.CYCLE_DURATION) / Config.CYCLE_DURATION;
                    // Calculate exact time needed to reach next cycle start (0.0 = sunrise)
                    const timeToMorning = (1.0 - currentCycle) * Config.CYCLE_DURATION;
                    
                    timeOffsetRef.current += timeToMorning;
                    onSleepEnd();
                }, 1500); // Faster sleep duration (1.5s)
            } else {
                setToast("You can only sleep at night");
                setTimeout(() => setToast(""), 2000);
            }
        }
    }));

    return null;
});

export default function App() {
  const [gameState, setGameState] = useState<'loading' | 'menu' | 'playing'>('loading');
  const controlsRef = useRef<ControlState>({
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    jump: false,
    crouch: false,
  });

  const playerPositionRef = useRef(new THREE.Vector3(0, 40, 0));
  const playerRotationRef = useRef(new THREE.Quaternion());
  const modifiedBlocksRef = useRef(new Map<string, number>());
  
  const [chunkVersions, setChunkVersions] = useState<Map<string, number>>(new Map());
  
  // NETWORKING STATE
  const [seed, setSeed] = useState(() => Math.random());
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [connectedPeers, setConnectedPeers] = useState<Map<string, DataConnection>>(new Map()); // Map of DataConnections
  const [remotePlayers, setRemotePlayers] = useState<Map<string, PlayerUpdatePayload>>(new Map());
  const peerInstance = useRef<Peer | null>(null);
  
  // Identity State
  const [username, setUsername] = useState("Player");
  const [playerColor] = useState(() => {
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
    return colors[Math.floor(Math.random() * colors.length)];
  });

  // Connection / Loading State
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  
  const [chatMessages, setChatMessages] = useState<ChatPayload[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [playerHealth, setPlayerHealth] = useState(10);
  const [damageFlash, setDamageFlash] = useState(false);
  const [respawnKey, setRespawnKey] = useState(0); 
  
  const interactionControllerRef = useRef<InteractionControllerHandle>(null);
  const fishingRef = useRef<FishingHandle>(null);
  const playerControllerRef = useRef<PlayerControllerHandle>(null);
  const mobManagerRef = useRef<MobManagerHandle>(null);
  const gameTimeManagerRef = useRef<GameTimeManagerHandle>(null);
  const itemDropManagerRef = useRef<ItemDropManagerHandle>(null);
  const timeOffsetRef = useRef(0);
  
  // Time Sync Refs
  const serverTimeTargetRef = useRef<number | null>(null);
  const currentGameTimeRef = useRef<number>(0);
  
  const [hotbar, setHotbar] = useState<ItemStack[]>(new Array(7).fill({ id: BLOCK.AIR, count: 0 }));
  const [activeSlot, setActiveSlot] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCraftingTableOpen, setIsCraftingTableOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fishCaught, setFishCaught] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const lastAttackTime = useRef(0);

  const [settings, setSettings] = useState<GameSettings>({
      renderDistance: Config.RENDER_DISTANCE,
      shadows: false,
      zoom: 20,
      antiAliasing: true, 
      visualStyle: 'smooth',
      showFps: false,
  });
  
  const isModalOpen = isInventoryOpen || isSettingsOpen || isCraftingTableOpen || isChatOpen;

  // --- MULTIPLAYER LOGIC ---
  
  const cleanupPeer = useCallback(() => {
    if (peerInstance.current) {
        peerInstance.current.destroy();
        peerInstance.current = null;
    }
    setConnectedPeers(new Map());
    setRemotePlayers(new Map());
    setChatMessages([]);
    setIsMultiplayer(false);
    setIsConnecting(false);
    setIsHost(false);
  }, []);

  const handleConnectionError = useCallback((message: string) => {
    cleanupPeer();
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 5000);
    setGameState('menu');
  }, [cleanupPeer]);

  // Helper to send data to all connected peers
  const broadcastData = useCallback((data: any) => {
      connectedPeers.forEach(conn => {
          if(conn.open) conn.send(data);
      });
  }, [connectedPeers]);

  const initPeer = useCallback((id?: string) => {
    try {
        const peer = id ? new Peer(id) : new Peer();
        peerInstance.current = peer;

        peer.on('error', (err) => {
            console.error("Peer Error:", err);
            // Don't kill host immediately on some errors, but generally report
            if (err.type === 'peer-unavailable') {
                handleConnectionError("Host ID not found. Check the ID.");
            } else if (err.type === 'network') {
                handleConnectionError("Network error. Check connection.");
            } else if (err.type === 'unavailable-id') {
                 handleConnectionError("ID unavailable.");
            } else {
                 setToastMessage(`Network Warning: ${err.type}`);
                 setTimeout(() => setToastMessage(""), 3000);
            }
        });

        peer.on('open', (id: string) => {
            setMyPeerId(id);
            if (isHost) {
                setToastMessage(`ID Generated! Check Settings.`);
                setIsConnecting(false); // Host is ready
                setGameState('playing');
            }
        });

        peer.on('connection', (conn: DataConnection) => {
            // Only Host receives connections usually, but in mesh everyone might
            conn.on('open', () => {
                setConnectedPeers(prev => new Map(prev).set(conn.peer, conn));
                
                // If I am host, send INIT data immediately
                if (isHost) {
                    const initData: InitPayload = {
                        seed,
                        modifiedBlocks: Array.from(modifiedBlocksRef.current.entries()),
                        spawnPos: playerPositionRef.current,
                        time: currentGameTimeRef.current // Send current world time
                    };
                    conn.send({ type: 'INIT', payload: initData });
                    setToastMessage(`Player joined!`);
                    setTimeout(() => setToastMessage(""), 2000);
                }
            });

            conn.on('data', (data: any) => handleNetworkData(data, conn.peer));
            
            conn.on('close', () => {
                setConnectedPeers(prev => {
                    const next = new Map(prev);
                    next.delete(conn.peer);
                    return next;
                });
                setRemotePlayers(prev => {
                    const next = new Map(prev);
                    next.delete(conn.peer);
                    return next;
                });
                setToastMessage("Player left");
                setTimeout(() => setToastMessage(""), 2000);
            });
        });
    } catch (e) {
        handleConnectionError("Failed to initialize network.");
    }
  }, [isHost, seed, handleConnectionError]);

  const handleNetworkData = useCallback((data: any, peerId: string) => {
      if (data.type === 'INIT') {
          // Client receiving world data from Host
          const payload = data.payload as InitPayload;
          setSeed(payload.seed);
          modifiedBlocksRef.current = new Map(payload.modifiedBlocks);
          
          // Initial Time Sync
          serverTimeTargetRef.current = payload.time;
          
          // Teleport to spawn/host position immediately
          if (payload.spawnPos) {
              playerPositionRef.current.copy(new THREE.Vector3(payload.spawnPos.x, payload.spawnPos.y, payload.spawnPos.z));
          }

          // Force terrain refresh
          setChunkVersions(new Map()); 
          setIsConnecting(false); // Client is ready!
          setGameState('playing');
          setToastMessage("Connected to Host!");
          setTimeout(() => setToastMessage(""), 2000);
      } 
      else if (data.type === 'PLAYER_UPDATE') {
          const payload = data.payload as PlayerUpdatePayload;
          setRemotePlayers(prev => new Map(prev).set(payload.id, payload));
      }
      else if (data.type === 'BLOCK_UPDATE') {
          const payload = data.payload as BlockUpdatePayload;
          modifiedBlocksRef.current.set(payload.key, payload.val);
          // Trigger React Update for Chunk
          const [x, , z] = payload.key.split(',').map(Number);
          const chunkKey = `${Math.floor(x / Config.CHUNK_SIZE)},${Math.floor(z / Config.CHUNK_SIZE)}`;
          setChunkVersions(prev => new Map(prev).set(chunkKey, (prev.get(chunkKey)||0) + 1));
          
          // If we are Host, we must rebroadcast this to OTHER clients (Mesh/Star topology)
          if (isHost) {
               connectedPeers.forEach(conn => {
                   if (conn.peer !== peerId && conn.open) conn.send(data);
               });
          }
      }
      else if (data.type === 'CHAT') {
          const payload = data.payload as ChatPayload;
          setChatMessages(prev => [...prev, payload]);
          
          // If we are Host, rebroadcast chat to other clients
          if (isHost) {
               connectedPeers.forEach(conn => {
                   if (conn.peer !== peerId && conn.open) conn.send(data);
               });
          }
      }
      else if (data.type === 'TIME_SYNC') {
          const payload = data.payload as TimeSyncPayload;
          serverTimeTargetRef.current = payload.time;
      }
  }, [isHost, connectedPeers]);

  const handleHostGame = (name: string) => {
      setUsername(name || "Player");
      setIsMultiplayer(true);
      setIsHost(true);
      setIsConnecting(true);
      setLoadingText("Creating Server...");
      initPeer(); // Auto-generate ID
  };

  const handleJoinGame = (hostId: string, name: string) => {
      if (!hostId.trim()) return;
      
      setUsername(name || "Player");
      setIsMultiplayer(true);
      setIsHost(false);
      setIsConnecting(true);
      setLoadingText("Connecting to Host...");
      
      // Connection Timeout Logic
      const timeoutId = setTimeout(() => {
          if (peerInstance.current && !connectedPeers.size && gameState !== 'playing') {
              handleConnectionError("Connection Timed Out. Host unreachable or Firewall blocking.");
          }
      }, 15000); // 15 seconds timeout
      
      try {
          const peer = new Peer();
          peerInstance.current = peer;

          peer.on('error', (err) => {
              clearTimeout(timeoutId);
              if (err.type === 'peer-unavailable') {
                  handleConnectionError("Host ID not found. Please check ID.");
              } else {
                  handleConnectionError(`Connection failed: ${err.type}`);
              }
          });

          peer.on('open', (id: string) => {
              setMyPeerId(id);
              const conn = peer.connect(hostId);
              
              conn.on('open', () => {
                  setConnectedPeers(new Map().set(hostId, conn));
                  setToastMessage("Connected! Waiting for world data...");
              });
              
              conn.on('data', (data: any) => {
                   clearTimeout(timeoutId); // Data received, connection valid
                   handleNetworkData(data, hostId);
              });
              
              conn.on('error', (err: any) => {
                  clearTimeout(timeoutId);
                  handleConnectionError("Connection Failed");
              });
              
              conn.on('close', () => {
                  clearTimeout(timeoutId);
                  handleConnectionError("Disconnected from Host");
              });
          });
      } catch (e) {
          clearTimeout(timeoutId);
          handleConnectionError("Failed to initialize client.");
      }
  };
  
  const handleStartGame = (name: string) => {
      setUsername(name || "Player");
      setIsMultiplayer(false);
      setGameState('playing');
  };

  const handleQuit = useCallback(() => {
    cleanupPeer();
    setIsSettingsOpen(false);
    setGameState('menu');
    setToastMessage("Returned to Main Menu");
    setTimeout(() => setToastMessage(""), 2000);
  }, [cleanupPeer]);

  const handleSendChat = (message: string) => {
      const payload: ChatPayload = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: myPeerId,
          senderName: username, // Use configured username
          message,
          timestamp: Date.now()
      };
      
      // Add locally
      setChatMessages(prev => [...prev, payload]);
      
      // Broadcast
      if (isMultiplayer) {
          broadcastData({ type: 'CHAT', payload });
      }
  };

  // --- NETWORK LOOP ---
  // Broadcast my position every 50ms
  useEffect(() => {
      if (!isMultiplayer || gameState !== 'playing') return;
      
      const interval = setInterval(() => {
          const payload: PlayerUpdatePayload = {
              id: myPeerId,
              pos: playerPositionRef.current.toArray() as [number,number,number],
              rot: playerRotationRef.current.toArray() as [number,number,number,number],
              animState: { walking: false, crouching: isCrouching }, // Simplified anim state
              username: username,
              color: playerColor
          };
          broadcastData({ type: 'PLAYER_UPDATE', payload });
      }, 50);

      return () => clearInterval(interval);
  }, [isMultiplayer, gameState, myPeerId, broadcastData, isCrouching, username, playerColor]);


  useEffect(() => {
    if (gameState === 'loading' && !isMultiplayer) {
      setLoadingText("Generating Terrain...");
      const timer = setTimeout(() => {
        setGameState('menu');
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [gameState, isMultiplayer]);

  useEffect(() => {
      setSettings(prev => ({
          ...prev,
          antiAliasing: prev.visualStyle === 'smooth'
      }));
  }, [settings.visualStyle]);
  
  // Keyboard listeners for Chat
  useEffect(() => {
      if (gameState !== 'playing') return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.key === 't' || e.key === 'T' || e.key === 'Enter') && !isChatOpen && !isInventoryOpen && !isCraftingTableOpen) {
              e.preventDefault();
              setIsChatOpen(true);
          }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isChatOpen, isInventoryOpen, isCraftingTableOpen]);

  const touchLookId = useRef<number | null>(null);
  const lastTouchPos = useRef<{ x: number, y: number } | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  const updateChunkVersions = useCallback((chunkKeys: string[]) => {
    setChunkVersions(prev => {
        const newVersions = new Map<string, number>(prev);
        let updated = false;
        for (const key of chunkKeys) {
            const oldVersion = newVersions.get(key) || 0;
            newVersions.set(key, oldVersion + 1);
            updated = true;
        }
        return updated ? newVersions : prev;
    });
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    controlsRef.current.move = { x, y };
  }, []);

  const handleJump = useCallback(() => {
    controlsRef.current.jump = true;
  }, []);
  
  const handleCrouch = useCallback(() => {
      const newState = !controlsRef.current.crouch;
      controlsRef.current.crouch = newState;
      setIsCrouching(newState);
  }, []);

  const selectedItem = hotbar[activeSlot];

  const handleAction = useCallback((action: 'attack') => {
    if (action === 'attack') {
        if (selectedItem.id === BLOCK.FISHING_ROD) {
            fishingRef.current?.trigger();
            return;
        }

        const now = Date.now();
        if (now - lastAttackTime.current < 500) return; // 500ms cooldown
        lastAttackTime.current = now;

        const isFalling = playerControllerRef.current?.isFalling() ?? false;
        playerControllerRef.current?.attack();
        mobManagerRef.current?.performAttack(playerPositionRef.current, playerRotationRef.current, isFalling, selectedItem);
    }
  }, [selectedItem]);

  const handleCatch = useCallback(() => {
      setFishCaught(true);
      setTimeout(() => setFishCaught(false), 2000);
      // We need to call a function that updates hotbar, handled below
  }, []);

  // Use a ref for handleAddItem to use it inside handleCatch without circular dependency or excessive deps
  const handleAddItemRef = useRef<(item: ItemStack) => boolean>(() => false);

  const handleDamage = useCallback((amount: number, attackerPosition?: THREE.Vector3) => {
      setPlayerHealth(h => Math.max(0, h - amount));
      setDamageFlash(true);
      if (attackerPosition && playerControllerRef.current) {
          playerControllerRef.current.takeDamage(attackerPosition);
      }
      setTimeout(() => setDamageFlash(false), 200);
  }, []);

  const handleRespawn = useCallback((e?: React.SyntheticEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      setPlayerHealth(10);
      playerPositionRef.current.set(0, 40, 0);
      controlsRef.current.move = { x: 0, y: 0 };
      controlsRef.current.look = { x: 0, y: 0 };
      controlsRef.current.jump = false;
      controlsRef.current.crouch = false;
      setIsCrouching(false);
      setRespawnKey(k => k + 1);
  }, []);

  const handleUpdateHotbar = (index: number, item: ItemStack) => {
      const newHotbar = [...hotbar];
      newHotbar[index] = item;
      setHotbar(newHotbar);
  };

  const handleOpenCraftingTable = useCallback(() => {
      setIsCraftingTableOpen(true);
  }, []);

  // Generic function to add any item/stack to inventory
  const handleAddItem = (itemToAdd: ItemStack): boolean => {
    let remainingToAdd = itemToAdd.count;
    const newHotbar = [...hotbar];

    const def = getItemDef(itemToAdd.id);
    const maxStack = def?.maxStack || 64;

    // 1. Try to stack
    for (let i = 0; i < newHotbar.length; i++) {
        if (newHotbar[i].id === itemToAdd.id && newHotbar[i].count < maxStack) {
            const canAdd = maxStack - newHotbar[i].count;
            const add = Math.min(canAdd, remainingToAdd);
            newHotbar[i].count += add;
            remainingToAdd -= add;
            if (remainingToAdd <= 0) break;
        }
    }
    
    // 2. Try empty slots
    if (remainingToAdd > 0) {
        for (let i = 0; i < newHotbar.length; i++) {
            if (newHotbar[i].id === BLOCK.AIR) {
                const add = Math.min(maxStack, remainingToAdd);
                newHotbar[i] = { id: itemToAdd.id, count: add };
                remainingToAdd -= add;
                if (remainingToAdd <= 0) break;
            }
        }
    }

    setHotbar(newHotbar);

    if (remainingToAdd > 0) {
        setToastMessage("Inventory Full");
        setTimeout(() => setToastMessage(""), 2000);
        return false; 
    }
    return true; 
  };
  
  handleAddItemRef.current = handleAddItem;

  // Memoize the catch handler that depends on handleAddItem
  const onCatchHandler = useCallback(() => {
      handleCatch();
      handleAddItemRef.current({ id: BLOCK.RAW_FISH, count: 1 });
  }, [handleCatch]);

  const handleDropItem = () => {
      const itemToDrop = hotbar[activeSlot];
      if (itemToDrop.id === BLOCK.AIR || itemToDrop.count <= 0) return;

      const itemName = INVENTORY.find(i => i.id === itemToDrop.id)?.name || "Item";

      // Decrement stack
      const newHotbar = [...hotbar];
      newHotbar[activeSlot] = { ...itemToDrop, count: itemToDrop.count - 1 };
      if (newHotbar[activeSlot].count <= 0) {
          newHotbar[activeSlot] = { id: BLOCK.AIR, count: 0 };
      }
      setHotbar(newHotbar);

      // Spawn item slightly in front of player
      const forward = new THREE.Vector3(0, 0, 0.5).applyQuaternion(playerRotationRef.current);
      const dropPos = playerPositionRef.current.clone().add(new THREE.Vector3(0, 1.3, 0)).add(forward);
      const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(playerRotationRef.current).normalize();
      
      itemDropManagerRef.current?.dropItem(itemToDrop.id, dropPos, direction);
      
      setToastMessage(`Dropped ${itemName}`);
      setTimeout(() => setToastMessage(""), 1500);
  };

  const handleConsumeItem = useCallback(() => {
      setHotbar(prev => {
          const next = [...prev];
          if (next[activeSlot].id !== BLOCK.AIR) {
              next[activeSlot] = { ...next[activeSlot], count: next[activeSlot].count - 1 };
              if (next[activeSlot].count <= 0) {
                  next[activeSlot] = { id: BLOCK.AIR, count: 0 };
              }
          }
          return next;
      });
  }, [activeSlot]);
  
  const handleBlockBreakDrop = useCallback((blockId: number, x: number, y: number, z: number) => {
      // NETWORK BROADCAST: Block Broken (Air)
      if (isMultiplayer) {
           broadcastData({ type: 'BLOCK_UPDATE', payload: { key: `${x},${y},${z}`, val: BLOCK.AIR } });
      }

      let dropId = blockId;
      let extraItem = -1;

      // Loot Table Overrides
      if (blockId === BLOCK.GRASS) dropId = BLOCK.DIRT;
      if (blockId === BLOCK.STONE) dropId = BLOCK.COBBLESTONE;
      if (blockId === BLOCK.LEAF || blockId === BLOCK.PINE_LEAF) {
           if (Math.random() < 0.1) dropId = BLOCK.SEEDS; 
           else if (Math.random() < 0.05) dropId = BLOCK.STICK;
           else return; 
      }
      if (blockId === BLOCK.GLASS) return;
      if (blockId === BLOCK.TALL_GRASS || blockId === BLOCK.RED_FLOWER || blockId === BLOCK.YELLOW_FLOWER) {
          if (Math.random() < 0.2) dropId = BLOCK.SEEDS;
          else return;
      }
      if (blockId === BLOCK.WHEAT_STAGE_3) {
          dropId = BLOCK.WHEAT_ITEM;
          extraItem = BLOCK.SEEDS; 
      } else if (blockId >= BLOCK.WHEAT_STAGE_0 && blockId <= BLOCK.WHEAT_STAGE_2) {
          dropId = BLOCK.SEEDS; 
      } else if (blockId === BLOCK.DOOR_TOP || blockId === BLOCK.DOOR_TOP_OPEN) {
          return; 
      }
      if (blockId >= BLOCK.BED_FOOT_NORTH && blockId <= BLOCK.BED_HEAD_WEST) {
          dropId = BLOCK.BED_ITEM; 
      }
      if (blockId === BLOCK.FENCE) dropId = BLOCK.FENCE;

      const spawnItem = (id: number) => {
          const pos = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
          const theta = Math.random() * Math.PI * 2;
          const r = 0.2;
          const dir = new THREE.Vector3(Math.sin(theta) * r, 0.5 + Math.random() * 0.5, Math.cos(theta) * r);
          itemDropManagerRef.current?.dropItem(id, pos, dir);
      };

      spawnItem(dropId);
      if (extraItem !== -1) spawnItem(extraItem);
  }, [isMultiplayer, broadcastData]);

  // Wrapped Place handler to broadcast changes
  const handlePlaceBlock = useCallback(() => {
      handleConsumeItem();
  }, [handleConsumeItem]);

  // New specific callback for network syncing placements from InteractionController
  const handleBlockUpdateSync = useCallback((key: string, val: number) => {
      if (isMultiplayer) {
          broadcastData({ type: 'BLOCK_UPDATE', payload: { key, val } });
      }
  }, [isMultiplayer, broadcastData]);

  const handlePickup = useCallback((itemType: number): boolean => {
      const success = handleAddItemRef.current({ id: itemType, count: 1 });
      if (success) {
          const itemName = INVENTORY.find(i => i.id === itemType)?.name || "Item";
          setToastMessage(`Picked up ${itemName}`);
          setTimeout(() => setToastMessage(""), 2000);
      }
      return success;
  }, []);

  const isTouchInControlArea = (x: number, y: number) => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      if (x < 240 && y > h - 240) return true;
      if (x > w - 240 && y > h - 160) return true;
      if (y > h - 80) return true;
      return false;
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const rightZone = document.getElementById('touch-zone-right');
    if (!rightZone) return;

    const onTouchStart = (e: TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || isModalOpen) return;
        const touch = e.changedTouches[0];
        if (isTouchInControlArea(touch.clientX, touch.clientY)) return;

        e.preventDefault();
        touchLookId.current = touch.identifier;
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        touchStartTime.current = Date.now();
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (touchLookId.current === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchLookId.current) {
                const touch = e.changedTouches[i];
                if (lastTouchPos.current) {
                    const dx = touch.clientX - lastTouchPos.current.x;
                    controlsRef.current.look.x = dx * 0.005 * 50; 
                    lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
                }
                break;
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
             if (e.changedTouches[i].identifier === touchLookId.current) {
                 const touch = e.changedTouches[i];
                 const duration = Date.now() - touchStartTime.current;
                 const dist = touchStartPos.current ? Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y) : 999;
                 if (duration < 300 && dist < 20) {
                     if (interactionControllerRef.current) interactionControllerRef.current.handleTap(touch.clientX, touch.clientY);
                 } else if (duration >= 300 && dist < 20) {
                     if (interactionControllerRef.current) interactionControllerRef.current.handleRadiusBreak(touch.clientX, touch.clientY);
                 }
                 touchLookId.current = null;
                 lastTouchPos.current = null;
                 controlsRef.current.look = { x: 0, y: 0 };
             }
        }
    };

    rightZone.addEventListener('touchstart', onTouchStart, { passive: false });
    rightZone.addEventListener('touchmove', onTouchMove, { passive: false });
    rightZone.addEventListener('touchend', onTouchEnd);
    return () => {
        rightZone.removeEventListener('touchstart', onTouchStart);
        rightZone.removeEventListener('touchmove', onTouchMove);
        rightZone.removeEventListener('touchend', onTouchEnd);
    };
  }, [isModalOpen, gameState]);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    const leftZone = document.getElementById('touch-zone-left');
    if (!leftZone) return;
    let leftTouchId: number | null = null;
    let lStartX = 0; let lStartY = 0; let lStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
        if ((e.target as HTMLElement).closest('button') || isModalOpen) return;
        const touch = e.changedTouches[0];
        if (isTouchInControlArea(touch.clientX, touch.clientY)) return;

        e.preventDefault();
        leftTouchId = touch.identifier;
        lStartX = touch.clientX;
        lStartY = touch.clientY;
        lStartTime = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
             if (e.changedTouches[i].identifier === leftTouchId) {
                 const touch = e.changedTouches[i];
                 const duration = Date.now() - lStartTime;
                 const dist = Math.hypot(touch.clientX - lStartX, touch.clientY - lStartY);
                 if (duration < 300 && dist < 20) {
                     if (interactionControllerRef.current) interactionControllerRef.current.handleTap(touch.clientX, touch.clientY);
                 } else if (duration >= 300 && dist < 20) {
                     if (interactionControllerRef.current) interactionControllerRef.current.handleRadiusBreak(touch.clientX, touch.clientY);
                 }
                 leftTouchId = null;
             }
        }
    };

    leftZone.addEventListener('touchstart', onTouchStart, { passive: false });
    leftZone.addEventListener('touchend', onTouchEnd);
    return () => {
        leftZone.removeEventListener('touchstart', onTouchStart);
        leftZone.removeEventListener('touchend', onTouchEnd);
    };
  }, [isModalOpen, gameState]);

  return (
    <div className={`relative w-full h-full bg-slate-900 select-none overflow-hidden touch-none ${settings.visualStyle === 'pixel' ? 'font-vt323' : 'font-sans'}`}>
      {(gameState === 'loading' || isConnecting) && <LoadingScreen message={isConnecting ? loadingText : "Generating Terrain..."} />}
      
      {gameState === 'menu' && (
        <MainMenu 
            onStartGame={handleStartGame} 
            onOpenSettings={() => setIsSettingsOpen(true)}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
        />
      )}

      {gameState === 'playing' && !isConnecting && (
        <>
          <div className={`absolute inset-0 z-50 pointer-events-none bg-red-600 transition-opacity duration-100 ${damageFlash ? 'opacity-30' : 'opacity-0'}`} />
      
          <div className={`absolute inset-0 z-[60] pointer-events-none bg-black transition-opacity duration-[1500ms] flex items-center justify-center ${isSleeping ? 'opacity-100' : 'opacity-0'}`}>
             {isSleeping && <span className="text-white text-4xl animate-pulse">Sleeping...</span>}
          </div>

          <div className={`absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className={`${settings.visualStyle === 'pixel' ? 'pixel-panel' : 'bg-slate-800 rounded-lg shadow-lg border border-slate-700'} px-6 py-2 flex items-center gap-2 text-white`}>
                  <span className="text-xl uppercase tracking-widest">{toastMessage}</span>
              </div>
          </div>
          
          <div className={`absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${fishCaught ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className={`${settings.visualStyle === 'pixel' ? 'pixel-panel' : 'bg-slate-800 rounded-lg shadow-lg border border-slate-700'} px-6 py-2 flex items-center gap-2 text-white`}>
                  <span className="text-xl">🐟</span>
                  <span className="uppercase tracking-widest text-xl">FISH CAUGHT!</span>
              </div>
          </div>
          
          <ChatBox 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
            messages={chatMessages} 
            onSendMessage={handleSendChat}
            myId={myPeerId}
          />

          <Canvas 
            shadows={settings.shadows} 
            orthographic 
            camera={{ zoom: settings.zoom, position: [50, 50, 50], near: 0.1, far: 1000 }}
            dpr={settings.visualStyle === 'pixel' ? 0.35 : 1}
            gl={{ antialias: settings.antiAliasing }}
            style={{ imageRendering: settings.visualStyle === 'pixel' ? 'pixelated' : 'auto' }}
          >
            <GameTimeManager 
                ref={gameTimeManagerRef} 
                timeOffsetRef={timeOffsetRef} 
                onSleepStart={() => setIsSleeping(true)} 
                onSleepEnd={() => setIsSleeping(false)}
                setToast={setToastMessage}
                isMultiplayer={isMultiplayer}
                isHost={isHost}
            />
            {isMultiplayer && (
                <MultiplayerSyncManager 
                    isHost={isHost} 
                    broadcastData={broadcastData} 
                    timeOffsetRef={timeOffsetRef}
                    serverTimeTargetRef={serverTimeTargetRef}
                    reportCurrentTime={(t) => { currentGameTimeRef.current = t; }}
                />
            )}
            <DayNightCycle shadowsEnabled={settings.shadows} timeOffsetRef={timeOffsetRef} />
            <fog attach="fog" args={['#87CEEB', 50, 180]} />
            
            <Terrain 
                seed={seed} 
                playerPosition={playerPositionRef} 
                modifiedBlocks={modifiedBlocksRef} 
                chunkVersions={chunkVersions} 
                renderDistance={settings.renderDistance} 
                visualStyle={settings.visualStyle}
            />
            
            {/* Render Remote Players */}
            {Array.from(remotePlayers.values()).map((rp: PlayerUpdatePayload) => (
                <RemotePlayer 
                    key={rp.id}
                    position={new THREE.Vector3(...rp.pos)}
                    quaternion={new THREE.Quaternion(...rp.rot)}
                    isCrouching={rp.animState.crouching}
                    username={rp.username}
                    color={rp.color}
                />
            ))}

            <TorchLightSystem playerPositionRef={playerPositionRef} modifiedBlocks={modifiedBlocksRef} />
            <CropSystem modifiedBlocks={modifiedBlocksRef} updateChunkVersions={updateChunkVersions} />
            <ItemDropManager 
                ref={itemDropManagerRef}
                playerPositionRef={playerPositionRef} 
                modifiedBlocks={modifiedBlocksRef} 
                terrainSeed={seed}
                onPickup={handlePickup}
            />
            
            <FluidSimulator playerPositionRef={playerPositionRef} modifiedBlocks={modifiedBlocksRef} terrainSeed={seed} updateChunkVersions={updateChunkVersions} />
            <MobManager ref={mobManagerRef} playerPositionRef={playerPositionRef} modifiedBlocks={modifiedBlocksRef} terrainSeed={seed} onDamagePlayer={handleDamage} timeOffsetRef={timeOffsetRef} />
            <PlayerController ref={playerControllerRef} key={respawnKey} controls={controlsRef} terrainSeed={seed} positionRef={playerPositionRef} rotationRef={playerRotationRef} modifiedBlocks={modifiedBlocksRef} selectedBlock={selectedItem.id} />
            <PlayerInteraction playerPositionRef={playerPositionRef} playerRotationRef={playerRotationRef} terrainSeed={seed} modifiedBlocks={modifiedBlocksRef} />
            <InteractionController 
                ref={interactionControllerRef} 
                playerPositionRef={playerPositionRef} 
                playerRotationRef={playerRotationRef} 
                modifiedBlocks={modifiedBlocksRef} 
                updateChunkVersions={updateChunkVersions} 
                terrainSeed={seed} 
                selectedItem={selectedItem}
                onSleep={() => gameTimeManagerRef.current?.trySleep()} 
                onDropItem={handleBlockBreakDrop}
                onPlace={handlePlaceBlock}
                onOpenCraftingTable={handleOpenCraftingTable}
                onBlockUpdate={handleBlockUpdateSync}
            />
            
            <FishingSystem ref={fishingRef} playerPositionRef={playerPositionRef} playerRotationRef={playerRotationRef} onCatch={onCatchHandler} />
            {settings.showFps && <Stats className="!left-auto !right-0 !top-16 opacity-50" />}
          </Canvas>

          <div className="absolute inset-0 pointer-events-none flex flex-col z-20">
            <HUD 
                health={playerHealth} 
                onOpenSettings={() => setIsSettingsOpen(true)} 
                onChat={() => setIsChatOpen(true)}
            />
            {!isModalOpen && ( <div className="flex-1 relative"> 
                <GameControls 
                    onMove={handleMove} 
                    onAction={handleAction} 
                    onJump={handleJump} 
                    onCrouch={handleCrouch} 
                    isCrouching={isCrouching} 
                    visualStyle={settings.visualStyle} 
                /> 
            </div> )}
            <InventoryBar hotbar={hotbar} activeSlot={activeSlot} onSelectSlot={setActiveSlot} onOpenInventory={() => setIsInventoryOpen(true)} onDrop={handleDropItem} />
          </div>
          
          {isInventoryOpen && ( <div id="inventory-modal"> <InventoryModal isOpen={isInventoryOpen} onClose={() => setIsInventoryOpen(false)} hotbar={hotbar} onUpdateHotbar={handleUpdateHotbar} onAddItem={handleAddItem} craftingMode="player" /> </div> )}
          {isCraftingTableOpen && ( <div id="crafting-modal"> <InventoryModal isOpen={isCraftingTableOpen} onClose={() => setIsCraftingTableOpen(false)} hotbar={hotbar} onUpdateHotbar={handleUpdateHotbar} onAddItem={handleAddItem} craftingMode="table" /> </div> )}
          
          {!isModalOpen && (
            <>
                <div id="touch-zone-left" className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-auto z-10" style={{ touchAction: 'none' }} />
                <div id="touch-zone-right" className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-auto z-10" style={{ touchAction: 'none' }} />
            </>
          )}
          {playerHealth <= 0 && <GameOver onRespawn={handleRespawn} />}
        </>
      )}

      {isSettingsOpen && (
          <SettingsMenu 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings}
            onUpdateSettings={setSettings}
            onQuit={handleQuit}
            hostId={isMultiplayer && isHost ? myPeerId : undefined}
          />
      )}
    </div>
  );
}
