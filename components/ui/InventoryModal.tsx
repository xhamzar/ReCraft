import React, { useState, useMemo, useEffect, useRef } from 'react';
import { INVENTORY, getItemDef } from '../../engine/items/ItemRegistry';
import { BLOCK } from '../../engine/world/BlockRegistry';
import { CRAFTING_RECIPES, Recipe } from '../../data/recipes';
import { ItemStack } from '../../types';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotbar: ItemStack[];
  onUpdateHotbar: (index: number, item: ItemStack) => void;
  onAddItem: (item: ItemStack) => boolean;
  craftingMode?: 'player' | 'table';
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ 
  isOpen, 
  onClose, 
  hotbar, 
  onUpdateHotbar,
  onAddItem,
  craftingMode = 'player'
}) => {
  const isTableMode = craftingMode === 'table';
  const [activeTab, setActiveTab] = useState<'crafting' | 'blocks' | 'items'>(isTableMode ? 'crafting' : 'blocks');
  
  // --- Crafting & Item Management State ---
  const gridSize = isTableMode ? 9 : 4;
  const [craftingGrid, setCraftingGrid] = useState<ItemStack[]>(() => Array(gridSize).fill({ id: BLOCK.AIR, count: 0 }));
  const [outputSlot, setOutputSlot] = useState<ItemStack | null>(null);
  const [heldItem, setHeldItem] = useState<ItemStack | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const filteredInventory = useMemo(() => {
    return INVENTORY.filter(item => {
        if (activeTab === 'blocks') return item.isBlock;
        if (activeTab === 'items') return !item.isBlock;
        return false;
    });
  }, [activeTab]);

  const handleClose = () => {
    // Return held item and crafting grid items to inventory on close
    if (heldItem) {
      onAddItem(heldItem);
      setHeldItem(null);
    }
    craftingGrid.forEach(item => {
      if (item.id !== BLOCK.AIR) onAddItem(item);
    });
    setCraftingGrid(Array(gridSize).fill({ id: BLOCK.AIR, count: 0 }));
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onMouseMove = (e: MouseEvent) => {
        if (cursorRef.current) {
            cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isOpen, heldItem]);

  // --- Recipe Matching Logic ---
  useEffect(() => {
    const checkRecipe = () => {
        const gridShape: (number | null)[] = craftingGrid.map(item => item.id !== BLOCK.AIR ? item.id : null);
        
        for (const recipe of CRAFTING_RECIPES) {
            const recipeRequiresTable = recipe.shape.length > 2 || recipe.shape[0].length > 2;
            if (isTableMode !== recipeRequiresTable) continue;

            const recipeHeight = recipe.shape.length;
            const recipeWidth = recipe.shape[0].length;
            const currentGridSize = isTableMode ? 3 : 2;
            
            if (currentGridSize < recipeHeight || currentGridSize < recipeWidth) continue;

            for (let yOffset = 0; yOffset <= currentGridSize - recipeHeight; yOffset++) {
                for (let xOffset = 0; xOffset <= currentGridSize - recipeWidth; xOffset++) {
                    let match = true;
                    const tempGrid = Array(currentGridSize*currentGridSize).fill(null);
                    
                    // Place recipe shape in temp grid
                    for(let ry=0; ry<recipeHeight; ry++) {
                        for(let rx=0; rx<recipeWidth; rx++) {
                            const char = recipe.shape[ry][rx];
                            if (char !== ' ') {
                                tempGrid[(yOffset + ry) * currentGridSize + (xOffset + rx)] = recipe.ingredients[char];
                            }
                        }
                    }

                    // Compare temp grid with actual crafting grid
                    for(let i=0; i<gridShape.length; i++) {
                        if (gridShape[i] !== tempGrid[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        setOutputSlot({ id: recipe.outputId, count: recipe.outputCount });
                        return;
                    }
                }
            }
        }
        setOutputSlot(null); // No match found
    };
    checkRecipe();
  }, [craftingGrid, isTableMode]);


  if (!isOpen) return null;
  
  const handleSlotClick = (index: number, location: 'hotbar' | 'grid') => {
    const isGrid = location === 'grid';
    const sourceArray = isGrid ? craftingGrid : hotbar;
    const clickedItem = sourceArray[index];

    if (heldItem) {
      if (clickedItem.id === BLOCK.AIR) {
        // Place one item from held stack
        const newItem = { ...heldItem, count: 1 };
        const newHeld = { ...heldItem, count: heldItem.count - 1 };
        if (isGrid) {
            const newGrid = [...craftingGrid]; newGrid[index] = newItem; setCraftingGrid(newGrid);
        } else {
            onUpdateHotbar(index, newItem);
        }
        setHeldItem(newHeld.count > 0 ? newHeld : null);
      } else if (clickedItem.id === heldItem.id) {
        // Stack one item onto existing stack
        const maxStack = getItemDef(clickedItem.id)?.maxStack || 64;
        if (clickedItem.count < maxStack) {
            const newSlotItem = { ...clickedItem, count: clickedItem.count + 1 };
            const newHeld = { ...heldItem, count: heldItem.count - 1 };
             if (isGrid) {
                const newGrid = [...craftingGrid]; newGrid[index] = newSlotItem; setCraftingGrid(newGrid);
            } else {
                onUpdateHotbar(index, newSlotItem);
            }
            setHeldItem(newHeld.count > 0 ? newHeld : null);
        }
      } else {
        // Swap held item with slot item
        const tempHeld = heldItem;
        setHeldItem(clickedItem);
         if (isGrid) {
            const newGrid = [...craftingGrid]; newGrid[index] = tempHeld; setCraftingGrid(newGrid);
        } else {
            onUpdateHotbar(index, tempHeld);
        }
      }
    } else { // No item held, pick up from slot
      if (clickedItem.id !== BLOCK.AIR) {
        setHeldItem(clickedItem);
        if (isGrid) {
            const newGrid = [...craftingGrid]; newGrid[index] = {id: BLOCK.AIR, count: 0}; setCraftingGrid(newGrid);
        } else {
            onUpdateHotbar(index, {id: BLOCK.AIR, count: 0});
        }
      }
    }
  };

  const handleCreativeItemClick = (itemId: number) => {
      const itemDef = getItemDef(itemId);
      const maxStack = itemDef?.maxStack || 64;
      const newItem = { id: itemId, count: maxStack };
      
      if (heldItem) {
          // Swap if holding something
          const oldHeld = heldItem;
          setHeldItem(newItem);
          onAddItem(oldHeld); // Return the old item to inventory
      } else {
          setHeldItem(newItem);
      }
  };

  const handleOutputClick = () => {
      if (!outputSlot) return;
      if (heldItem && (heldItem.id !== outputSlot.id || (heldItem.count + outputSlot.count > (getItemDef(outputSlot.id)?.maxStack || 64)))) {
          return; // Can't pick up if holding different item or not enough space
      }

      // Consume ingredients from crafting grid
      const newGrid = [...craftingGrid];
      for (let i = 0; i < newGrid.length; i++) {
          if (newGrid[i].id !== BLOCK.AIR) {
              newGrid[i].count -= 1;
              if (newGrid[i].count <= 0) {
                  newGrid[i] = { id: BLOCK.AIR, count: 0 };
              }
          }
      }
      setCraftingGrid(newGrid);

      // Add to held item
      setHeldItem(prev => ({
          id: outputSlot.id,
          count: (prev ? prev.count : 0) + outputSlot.count
      }));
  };
  
  const HeldItemIcon = heldItem ? getItemDef(heldItem.id)?.icon : null;

  return (
    <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-200" 
        onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('.pixel-panel')) return;
            handleClose();
        }}
    >
        {/* Held item cursor */}
        {heldItem && (
            <div ref={cursorRef} className="fixed top-0 left-0 pointer-events-none z-[120] -translate-x-1/2 -translate-y-1/2 hidden sm:block">
                <div className="w-12 h-12">
                    {HeldItemIcon && <div className="p-1 w-full h-full"><HeldItemIcon /></div>}
                    <span className="absolute bottom-0 right-0 bg-black/60 text-white text-xs px-1">{heldItem.count}</span>
                </div>
            </div>
        )}
        
        {/* Mobile held item indicator */}
        {heldItem && (
             <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] pointer-events-none sm:hidden">
                <div className="w-16 h-16 bg-white/20 border-2 border-yellow-400 rounded-lg backdrop-blur-sm">
                    {HeldItemIcon && <div className="p-2 w-full h-full"><HeldItemIcon /></div>}
                    <span className="absolute bottom-0 right-0 bg-black/60 text-white text-sm px-1 font-bold">{heldItem.count}</span>
                </div>
                <div className="text-white text-center text-xs mt-1 bg-black/50 px-2 rounded">Selected</div>
            </div>
        )}

        <div className="pixel-panel flex flex-col w-full max-w-3xl h-[85vh] sm:h-[80vh] max-h-[90dvh] mx-2 sm:mx-auto overflow-hidden shadow-2xl transition-all">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#222] p-2 sm:p-4 border-b-4 border-black shrink-0">
                <h2 className="text-2xl sm:text-3xl text-white tracking-widest uppercase font-vt323 truncate">{isTableMode ? 'Crafting Table' : 'Inventory'}</h2>
                <button onClick={handleClose} className="w-8 h-8 sm:w-10 sm:h-10 pixel-btn bg-red-600 hover:bg-red-500 flex items-center justify-center text-white text-xl"> X </button>
            </div>

            {/* Tabs */}
            <div className="flex px-2 sm:px-4 pt-2 sm:pt-4 gap-1 sm:gap-2 bg-[#333] shrink-0 overflow-x-auto no-scrollbar">
                {!isTableMode && <>
                  <button onClick={() => setActiveTab('blocks')} className={`flex-1 py-2 px-1 text-lg sm:text-xl font-vt323 uppercase transition-all whitespace-nowrap ${activeTab === 'blocks' ? 'bg-[#555] text-white border-t-4 border-x-4 border-black translate-y-1' : 'bg-[#222] text-gray-500 hover:bg-[#444] border-4 border-transparent'}`}> Blocks </button>
                  <button onClick={() => setActiveTab('items')} className={`flex-1 py-2 px-1 text-lg sm:text-xl font-vt323 uppercase transition-all whitespace-nowrap ${activeTab === 'items' ? 'bg-[#555] text-white border-t-4 border-x-4 border-black translate-y-1' : 'bg-[#222] text-gray-500 hover:bg-[#444] border-4 border-transparent'}`}> Items </button>
                </>}
                <button onClick={() => setActiveTab('crafting')} className={`flex-1 py-2 px-1 text-lg sm:text-xl font-vt323 uppercase transition-all whitespace-nowrap ${activeTab === 'crafting' ? 'bg-[#555] text-white border-t-4 border-x-4 border-black translate-y-1' : 'bg-[#222] text-gray-500 hover:bg-[#444] border-4 border-transparent'}`}> Crafting </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#555] p-2 sm:p-4 overflow-y-auto custom-scrollbar border-4 border-black m-2 sm:m-4 mt-0">
                {activeTab === 'crafting' ? (
                     <div className="flex flex-col items-center justify-center min-h-full gap-4 py-4">
                         <div className={`grid gap-1 ${gridSize === 9 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                             {craftingGrid.map((item, i) => {
                                 const itemDef = getItemDef(item.id);
                                 const Icon = itemDef?.icon;
                                 return (
                                     <button key={i} onClick={() => handleSlotClick(i, 'grid')} className="w-14 h-14 sm:w-16 sm:h-16 pixel-btn bg-[#444] relative active:bg-[#555]">
                                         {item.id !== BLOCK.AIR && Icon && <div className="w-full h-full p-2"><Icon /></div>}
                                         {item.count > 1 && <span className="absolute bottom-0 right-0 text-white text-xs px-1 bg-black/60">{item.count}</span>}
                                     </button>
                                 );
                             })}
                         </div>
                         
                         <div className="flex flex-col items-center justify-center">
                            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-white mb-2"></div>
                         </div>

                         <button onClick={handleOutputClick} className="w-20 h-20 sm:w-24 sm:h-24 pixel-btn bg-[#222] relative active:bg-[#333]">
                              {outputSlot && (() => {
                                  const itemDef = getItemDef(outputSlot.id);
                                  const Icon = itemDef?.icon;
                                  return (
                                     <>
                                         {Icon && <div className="w-full h-full p-2"><Icon /></div>}
                                         {outputSlot.count > 1 && <span className="absolute bottom-1 right-1 text-white text-lg px-1 bg-black/60">{outputSlot.count}</span>}
                                     </>
                                  );
                              })()}
                         </button>
                     </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-9 gap-1 sm:gap-2">
                        {filteredInventory.map(item => {
                            const IconComponent = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleCreativeItemClick(item.id)}
                                    className="aspect-square relative group pixel-btn bg-[#444] hover:bg-[#666] flex items-center justify-center active:scale-95"
                                >
                                     {IconComponent && <div className="w-full h-full p-1.5 sm:p-2"><IconComponent /></div>}
                                     <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 font-vt323 border border-white">
                                        {item.name}
                                     </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Hotbar Section */}
            <div className="p-2 sm:p-4 bg-[#333] border-t-4 border-black shrink-0">
                <div className="text-center text-gray-400 mb-1 text-sm font-vt323">Tap hotbar slot to place/swap</div>
                <div className="flex justify-center gap-1 sm:gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {hotbar.map((item, index) => {
                        const blockData = getItemDef(item.id);
                        const IconComponent = blockData?.icon;
                        return (
                            <button
                                key={index}
                                onClick={() => handleSlotClick(index, 'hotbar')}
                                className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 pixel-btn relative flex items-center justify-center bg-[#444] active:bg-[#555]"
                            >
                                {item.count > 0 && IconComponent && <div className="p-1.5 sm:p-2 w-full h-full"><IconComponent /></div>}
                                {item.count > 1 && <span className="absolute bottom-0 right-0 text-white text-[10px] font-bold px-1 bg-black/50">{item.count}</span>}
                                <span className="absolute top-0.5 left-1 text-[8px] sm:text-[10px] text-white/50 font-mono">{index + 1}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
  );
};