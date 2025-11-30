import * as THREE from 'three';

const createCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    return canvas;
};

const createTexture = (drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture => {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
};

const fill = (ctx: CanvasRenderingContext2D, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
};

const noise = (ctx: CanvasRenderingContext2D, amount: number, scale: number = 4) => {
    for (let x = 0; x < 64; x += scale) {
        for (let y = 0; y < 64; y += scale) {
            if (Math.random() < amount) {
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
                ctx.fillRect(x, y, scale, scale);
            } else if (Math.random() < amount) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }
};

export const BLOCK_TEXTURES = {
    grass_top: createTexture((ctx) => {
        fill(ctx, '#5ca904');
        noise(ctx, 0.4, 4);
        // Random darker patches
        for(let i=0; i<8; i++) {
            const x = Math.floor(Math.random()*16)*4;
            const y = Math.floor(Math.random()*16)*4;
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(x, y, 8, 8);
        }
    }),
    grass_side: createTexture((ctx) => {
        // Dirt Background
        fill(ctx, '#8b5a2b');
        noise(ctx, 0.5, 4);
        
        // Grass Top Trim
        ctx.fillStyle = '#5ca904';
        ctx.fillRect(0, 0, 64, 12); // Top strip
        
        // Grass Drips
        for (let x = 0; x < 64; x += 4) {
             const height = 12 + Math.floor(Math.random() * 4) * 4;
             ctx.fillRect(x, 0, 4, height);
        }
        
        // Noise on the grass part
        for (let x = 0; x < 64; x += 4) {
            for (let y = 0; y < 24; y += 4) {
                 if (Math.random() < 0.3) {
                      ctx.fillStyle = 'rgba(255,255,255,0.1)';
                      ctx.fillRect(x,y,4,4);
                 }
            }
        }
    }),
    dirt: createTexture((ctx) => {
        fill(ctx, '#8b5a2b');
        noise(ctx, 0.5, 4);
        // Larger chunks
        for(let i=0; i<6; i++) {
             const x = Math.floor(Math.random()*16)*4;
             const y = Math.floor(Math.random()*16)*4;
             ctx.fillStyle = 'rgba(0,0,0,0.15)';
             ctx.fillRect(x,y,8,8);
        }
    }),
    stone: createTexture((ctx) => {
        fill(ctx, '#7d7d7d');
        noise(ctx, 0.3, 4);
        // Stone pattern
        for(let i=0; i<16; i++) {
            if (Math.random() > 0.5) continue;
            const x = Math.floor(Math.random()*16)*4;
            const y = Math.floor(Math.random()*16)*4;
            ctx.fillStyle = '#666';
            ctx.fillRect(x, y, 8, 4);
        }
    }),
    wood_side: createTexture((ctx) => {
        fill(ctx, '#5c4033');
        ctx.fillStyle = '#4a332a';
        // Vertical bark lines
        for(let i=0; i<64; i+=8) {
            ctx.fillRect(i + 4, 0, 4, 64);
        }
        noise(ctx, 0.1, 4);
        // Horizontal cuts
         for(let i=0; i<4; i++) {
            const y = Math.floor(Math.random()*16)*4;
            ctx.fillStyle = '#3e2b23';
            ctx.fillRect(0, y, 64, 4);
         }
    }),
    wood_top: createTexture((ctx) => {
        fill(ctx, '#5c4033');
        // Rings
        ctx.fillStyle = '#4a332a';
        ctx.fillRect(8, 8, 48, 48);
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(16, 16, 32, 32);
        ctx.fillStyle = '#4a332a';
        ctx.fillRect(24, 24, 16, 16);
        noise(ctx, 0.1, 4);
    }),
    leaf: createTexture((ctx) => {
        fill(ctx, '#3a5f0b');
        noise(ctx, 0.4, 4);
        ctx.fillStyle = '#2d4c09';
        // Detailed leaf pattern
        for(let x=0; x<64; x+=8) {
             for(let y=0; y<64; y+=8) {
                  if (Math.random() > 0.5) ctx.fillRect(x, y, 4, 4);
             }
        }
        
        // Punch transparency holes
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'black';
        for(let x=0; x<64; x+=8) {
            for(let y=0; y<64; y+=8) {
                if(Math.random() < 0.25) { // 25% holes
                    ctx.fillRect(x+2, y+2, 4, 4);
                }
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }),
    pine_leaf: createTexture((ctx) => {
        fill(ctx, '#2d4c1e');
        noise(ctx, 0.5, 4);
        ctx.fillStyle = '#1b3012';
        for(let i=0; i<12; i++) {
            const x = Math.floor(Math.random() * 16) * 4;
            const y = Math.floor(Math.random() * 16) * 4;
            ctx.fillRect(x, y, 4, 4);
        }

        // Punch transparency holes
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'black';
        for(let x=0; x<64; x+=4) {
            for(let y=0; y<64; y+=4) {
                if(Math.random() < 0.2) {
                    ctx.fillRect(x+1, y+1, 2, 2);
                }
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }),
    plank: createTexture((ctx) => {
        fill(ctx, '#a0522d');
        ctx.fillStyle = '#7a3e21';
        // Horizontal planks
        ctx.fillRect(0, 0, 64, 2);
        ctx.fillRect(0, 16, 64, 2);
        ctx.fillRect(0, 32, 64, 2);
        ctx.fillRect(0, 48, 64, 2);
        // Short vertical lines
        ctx.fillRect(16, 0, 2, 16);
        ctx.fillRect(48, 16, 2, 16);
        ctx.fillRect(32, 32, 2, 16);
        ctx.fillRect(10, 48, 2, 16);
        
        noise(ctx, 0.05, 2);
    }),
    sand: createTexture((ctx) => {
        fill(ctx, '#E2C58B');
        ctx.fillStyle = '#D6B066';
        noise(ctx, 0.3, 4);
    }),
    brick: createTexture((ctx) => {
        fill(ctx, '#905040');
        ctx.fillStyle = '#cccccc'; // Mortar
        // Horizontal mortar
        ctx.fillRect(0, 14, 64, 4);
        ctx.fillRect(0, 30, 64, 4);
        ctx.fillRect(0, 46, 64, 4);
        // Vertical mortar staggered
        ctx.fillRect(30, 0, 4, 14);
        ctx.fillRect(10, 18, 4, 12);
        ctx.fillRect(45, 18, 4, 12);
        ctx.fillRect(20, 34, 4, 12);
        ctx.fillRect(50, 34, 4, 12);
        ctx.fillRect(5, 50, 4, 14);
        ctx.fillRect(35, 50, 4, 14);
        noise(ctx, 0.1, 2);
    }),
    cobblestone: createTexture((ctx) => {
        fill(ctx, '#777');
        ctx.fillStyle = '#444'; // borders
        ctx.fillRect(16, 0, 4, 64);
        ctx.fillRect(48, 0, 4, 64);
        ctx.fillRect(0, 16, 64, 4);
        ctx.fillRect(0, 48, 64, 4);
        noise(ctx, 0.3, 4);
    }),
    gravel: createTexture((ctx) => {
        fill(ctx, '#888');
        ctx.fillStyle = '#666';
        noise(ctx, 0.6, 4);
        for(let i=0; i<12; i++) {
             const x = Math.floor(Math.random()*16)*4;
             const y = Math.floor(Math.random()*16)*4;
             ctx.fillRect(x,y,4,4);
        }
    }),
    snow: createTexture((ctx) => {
        fill(ctx, '#ffffff');
        ctx.fillStyle = '#e0f6ff';
        noise(ctx, 0.05, 4);
    }),
    water: createTexture((ctx) => {
        fill(ctx, '#00b4d8');
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        noise(ctx, 0.1, 8);
    }),
    glass: createTexture((ctx) => {
        fill(ctx, 'rgba(200, 240, 255, 0.1)'); // Very transparent
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(0,0,64,4);
        ctx.fillRect(0,60,64,4);
        ctx.fillRect(0,0,4,64);
        ctx.fillRect(60,0,4,64);
        // Glare
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(10,10, 8, 8);
        ctx.fillRect(20,20, 4, 4);
    }),
    cactus: createTexture((ctx) => {
        fill(ctx, '#2d5a27');
        ctx.fillStyle = '#20401b';
        // Stripes
        for(let i=8; i<64; i+=16) {
            ctx.fillRect(i, 0, 4, 64);
        }
        // Spikes
        ctx.fillStyle = '#000';
        for(let y=8; y<64; y+=16) {
             ctx.fillRect(0, y, 2, 2);
             ctx.fillRect(62, y, 2, 2);
        }
    }),
    farmland: createTexture((ctx) => {
        fill(ctx, '#4a3627');
        ctx.fillStyle = '#2e2118';
        ctx.fillRect(10, 10, 44, 44);
        noise(ctx, 0.2, 4);
    }),
    
    // --- WHEAT GROWTH STAGES ---
    wheat_0: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        ctx.fillStyle = '#00ff00';
        // Tiny sprouts
        ctx.fillRect(16, 56, 4, 8);
        ctx.fillRect(32, 52, 4, 12);
        ctx.fillRect(48, 56, 4, 8);
    }),
    wheat_1: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        ctx.fillStyle = '#44dd00';
        // Medium growth
        ctx.fillRect(14, 40, 6, 24);
        ctx.fillRect(30, 32, 6, 32);
        ctx.fillRect(46, 40, 6, 24);
    }),
    wheat_2: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        ctx.fillStyle = '#aaaa00'; // Yellowing
        ctx.fillRect(12, 24, 6, 40);
        ctx.fillRect(44, 24, 6, 40);
        ctx.fillStyle = '#88aa00';
        ctx.fillRect(28, 16, 8, 48);
    }),
    wheat_3: createTexture((ctx) => { // Mature
        ctx.clearRect(0,0,64,64);
        ctx.fillStyle = '#dcb158'; // Wheat color
        // Stalks
        ctx.fillRect(12, 16, 6, 48);
        ctx.fillRect(28, 8, 8, 56);
        ctx.fillRect(46, 16, 6, 48);
        // Heads (Grain)
        ctx.fillStyle = '#b38f46';
        ctx.fillRect(10, 16, 10, 12);
        ctx.fillRect(26, 8, 12, 16);
        ctx.fillRect(44, 16, 10, 12);
    }),

    door: createTexture((ctx) => {
        fill(ctx, '#654321');
        ctx.fillStyle = '#4a3118';
        ctx.fillRect(4,4,56,56);
        ctx.fillStyle = '#654321';
        ctx.fillRect(12, 12, 16, 40);
        ctx.fillRect(36, 12, 16, 40);
        // Knob
        ctx.fillStyle = 'gold';
        ctx.fillRect(6, 30, 4, 4);
    }),
    bed_head: createTexture((ctx) => {
        fill(ctx, '#b91717'); // Red blanket
        
        // Pillow
        ctx.fillStyle = '#dddddd';
        ctx.fillRect(4, 4, 56, 36);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 8, 48, 28);
        
        // Border shading
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0,0,64,4);
        ctx.fillRect(0,0,4,64);
        ctx.fillRect(60,0,4,64);
        ctx.fillRect(0,60,64,4);
        
        noise(ctx, 0.1, 2);
    }),
    bed_foot: createTexture((ctx) => {
        fill(ctx, '#b91717'); // Red blanket
        
        // Fold/crease lines
        ctx.fillStyle = '#9e1212';
        ctx.fillRect(0, 10, 64, 4);
        ctx.fillRect(0, 30, 64, 4);
        
        // Border shading
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(0,0,64,4);
        ctx.fillRect(0,0,4,64);
        ctx.fillRect(60,0,4,64);
        ctx.fillRect(0,60,64,4);
        
        noise(ctx, 0.1, 2);
    }),
    torch: createTexture((ctx) => {
        // Transparent Background
        ctx.clearRect(0,0,64,64);
        
        // Stick
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(26, 20, 12, 44);
        
        // Charcoal top
        ctx.fillStyle = '#333';
        ctx.fillRect(26, 16, 12, 8);
        
        // Flame
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(28, 4, 8, 14);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(30, 8, 4, 8);
    }),
    torch_emissive: createTexture((ctx) => {
        fill(ctx, 'black'); // Background and stick are black (no emission)
        
        // Flame location matches 'torch' texture
        // Flame
        ctx.fillStyle = '#ffffff'; // Max emission
        ctx.fillRect(28, 4, 8, 14);
        ctx.fillRect(30, 8, 4, 8);
    }),
    tall_grass: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        ctx.fillStyle = '#6bb524';
        // Draw some grass blades
        ctx.fillRect(10, 32, 4, 32);
        ctx.fillRect(20, 20, 4, 44);
        ctx.fillRect(35, 28, 4, 36);
        ctx.fillRect(50, 32, 4, 32);
    }),
    red_flower: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        // Stem
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(30, 32, 4, 32);
        ctx.fillRect(26, 48, 12, 4); // leaves
        // Flower
        ctx.fillStyle = '#dd2222';
        ctx.fillRect(24, 20, 16, 16);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(28, 24, 8, 8);
    }),
    yellow_flower: createTexture((ctx) => {
        ctx.clearRect(0,0,64,64);
        // Stem
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(30, 32, 4, 32);
        ctx.fillRect(26, 48, 12, 4); // leaves
        // Flower
        ctx.fillStyle = '#f0d500';
        ctx.fillRect(26, 22, 12, 12);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(30, 26, 4, 4);
    }),
    crafting_table_top: createTexture((ctx) => {
        fill(ctx, '#d19a66'); // Light wood
        noise(ctx, 0.1, 4);
        // Grid lines
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(4, 20, 56, 4);
        ctx.fillRect(4, 40, 56, 4);
        ctx.fillRect(20, 4, 4, 56);
        ctx.fillRect(40, 4, 4, 56);
    }),
    crafting_table_side: createTexture((ctx) => {
        fill(ctx, '#a0522d'); // Plank texture
        ctx.fillStyle = '#7a3e21';
        ctx.fillRect(0, 0, 64, 2);
        ctx.fillRect(0, 31, 64, 2);
        ctx.fillRect(0, 62, 64, 2);
        ctx.fillRect(31, 0, 2, 64);

        // Draw some tools on the side
        ctx.fillStyle = '#888';
        ctx.fillRect(10, 24, 20, 4); // Saw handle
        ctx.fillRect(12, 22, 4, 8);
        ctx.fillRect(28, 26, 2, 10); // Saw blade part
        
        ctx.fillStyle = '#666';
        ctx.fillRect(40, 30, 12, 12); // Hammer head
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(44, 42, 4, 10); // Hammer handle
    }),
    enchanting_table_top: createTexture((ctx) => {
        fill(ctx, '#4a044e'); // Dark purple
        // Red cloth
        ctx.fillStyle = '#b91717';
        ctx.fillRect(4, 4, 56, 56);
        // Diamond corners
        ctx.fillStyle = '#00f2ea';
        ctx.fillRect(0,0,8,8);
        ctx.fillRect(56,0,8,8);
        ctx.fillRect(0,56,8,8);
        ctx.fillRect(56,56,8,8);
    }),
    enchanting_table_side: createTexture((ctx) => {
        fill(ctx, '#3d0340'); // Darker purple
        // Obsidian pattern
        ctx.fillStyle = '#222';
        noise(ctx, 0.4, 8);
        // Book pages
        ctx.fillStyle = '#e0d6b3';
        ctx.fillRect(4, 0, 56, 12);
        ctx.fillStyle = '#c4b895';
        ctx.fillRect(4, 8, 56, 4);
    }),
    enchanting_table_bottom: createTexture((ctx) => {
        fill(ctx, '#222'); // Obsidian base
        noise(ctx, 0.2, 4);
    }),


    // --- PLAYER TEXTURES ---
    player_head_front: createTexture((ctx) => {
        fill(ctx, '#eec39a'); // Skin color
        // Hair
        ctx.fillStyle = '#3d2b1f'; // Dark brown
        ctx.fillRect(0, 0, 64, 20);
        ctx.fillRect(0, 20, 8, 8);
        ctx.fillRect(56, 20, 8, 8);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(16, 28, 8, 8);
        ctx.fillRect(40, 28, 8, 8);
        ctx.fillStyle = '#4488ff'; // Blue eyes
        ctx.fillRect(20, 28, 4, 8);
        ctx.fillRect(44, 28, 4, 8);
        // Mouth
        ctx.fillStyle = '#c58c85'; // Darker lip color
        ctx.fillRect(24, 48, 16, 4);
    }),
    player_head_side: createTexture((ctx) => {
        fill(ctx, '#eec39a'); // Skin color
        // Hair
        ctx.fillStyle = '#3d2b1f';
        ctx.fillRect(0, 0, 64, 20);
        ctx.fillRect(0, 20, 64, 8);
    }),
    player_head_back: createTexture((ctx) => {
        fill(ctx, '#3d2b1f'); // Full hair
    }),
    player_head_top: createTexture((ctx) => {
        fill(ctx, '#3d2b1f'); // Full hair
    }),
    player_head_bottom: createTexture((ctx) => {
        fill(ctx, '#eec39a'); // Full skin for neck
    }),
    player_torso: createTexture((ctx) => {
        fill(ctx, '#00aa00'); // Green shirt
        // V-neck
        ctx.fillStyle = '#008800'; // Darker green
        ctx.beginPath();
        ctx.moveTo(32, 28);
        ctx.lineTo(16, 4);
        ctx.lineTo(48, 4);
        ctx.closePath();
        ctx.fill();
    }),
    player_arm: createTexture((ctx) => {
        fill(ctx, '#88aa00'); // Lighter green sleeve
        // Hand
        ctx.fillStyle = '#eec39a'; // Skin color
        ctx.fillRect(0, 44, 64, 20);
    }),
    player_leg: createTexture((ctx) => {
        fill(ctx, '#4444aa'); // Blue pants
        // Shoes
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 52, 64, 12);
    }),
    
    // --- COW TEXTURES ---
    cow_head_top: createTexture((ctx) => {
        fill(ctx, '#f2f2f2');
        // Black patch
        ctx.fillStyle = '#222';
        ctx.fillRect(16, 0, 32, 32);
    }),
    cow_head_side: createTexture((ctx) => {
        fill(ctx, '#f2f2f2');
        // Horn
        ctx.fillStyle = '#d1c4a5';
        ctx.fillRect(0, 8, 8, 12);
    }),
    cow_head_front: createTexture((ctx) => {
        fill(ctx, '#f2f2f2');
        // Nose
        ctx.fillStyle = '#f7b5c5';
        ctx.fillRect(12, 40, 40, 20);
        // Eyes
        ctx.fillStyle = '#222';
        ctx.fillRect(12, 24, 8, 8);
        ctx.fillRect(44, 24, 8, 8);
    }),
    cow_body_top: createTexture((ctx) => {
        fill(ctx, '#f2f2f2');
        ctx.fillStyle = '#222';
        ctx.fillRect(8, 8, 24, 48);
        ctx.fillRect(40, 24, 16, 24);
    }),
    cow_body_side: createTexture((ctx) => {
        fill(ctx, '#f2f2f2');
        ctx.fillStyle = '#222';
        ctx.fillRect(40, 8, 16, 24);
        ctx.fillRect(8, 16, 20, 20);
    }),

    // --- ZOMBIE TEXTURES ---
    zombie_head_front: createTexture((ctx) => {
        fill(ctx, '#32CD32');
        // Eyes
        ctx.fillStyle = 'black';
        ctx.fillRect(16, 28, 8, 8);
        ctx.fillRect(40, 28, 8, 8);
        // Mouth
        ctx.fillStyle = '#228B22';
        ctx.fillRect(24, 48, 16, 4);
    }),
    zombie_head_side: createTexture((ctx) => { fill(ctx, '#32CD32'); }),
    zombie_head_top: createTexture((ctx) => { fill(ctx, '#32CD32'); }),
    zombie_head_bottom: createTexture((ctx) => { fill(ctx, '#32CD32'); }),
    zombie_head_back: createTexture((ctx) => { fill(ctx, '#32CD32'); }),
    zombie_torso: createTexture((ctx) => { fill(ctx, '#008080'); }),
    zombie_arm: createTexture((ctx) => { fill(ctx, '#32CD32'); }),
    zombie_leg: createTexture((ctx) => { fill(ctx, '#4B0082'); }),
};