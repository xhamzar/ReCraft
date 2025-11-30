import React from 'react';
import { INVENTORY } from '../../engine/items/ItemRegistry';
import { ItemStack } from '../../types';

interface InventoryBarProps {
  hotbar: ItemStack[];
  activeSlot: number;
  onSelectSlot: (index: number) => void;
  onOpenInventory: () => void;
  onDrop: () => void;
}

const DropIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-white">
        <path d="M11 14.17V5h2v9.17l2.59-2.58L17 13l-5 5-5-5 1.41-1.41z"/>
    </svg>
);

export const InventoryBar: React.FC<InventoryBarProps> = ({ 
  hotbar, 
  activeSlot, 
  onSelectSlot, 
  onOpenInventory,
  onDrop
}) => {
  return (
    <div 
        className="absolute bottom-2 left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
        {/* Reduced padding and gap for mobile compact view */}
        <div className="pixel-panel flex items-center gap-1 p-1 sm:p-1.5 pointer-events-auto max-w-full mx-1 sm:max-w-[98vw] overflow-x-auto no-scrollbar">
            <button 
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
                className="w-8 h-8 sm:w-14 sm:h-14 pixel-btn flex items-center justify-center active:scale-95 bg-gray-600 hover:bg-gray-500 flex-shrink-0"
                style={{ touchAction: 'none' }}
                aria-label="Drop Item"
            >
                <DropIcon />
            </button>
            <div className="w-0.5 h-6 bg-white/20 mx-0.5" />
            <div className="flex gap-1">
                {hotbar.map((item, index) => {
                    const blockId = item.id;
                    const blockData = INVENTORY.find(i => i.id === blockId);
                    const isActive = activeSlot === index;
                    const IconComponent = blockData?.icon;
                    const isEnchanted = item.enchantments && Object.keys(item.enchantments).length > 0;
                    return (
                        <button 
                            key={index}
                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onSelectSlot(index); }}
                            className={`relative w-8 h-8 sm:w-14 sm:h-14 flex-shrink-0 pixel-btn transition-transform ${isActive ? 'bg-gray-400 scale-105 z-10 border-white' : ''} ${isEnchanted ? 'animate-pulse border-purple-500' : ''}`}
                            style={{ touchAction: 'none' }}
                        >
                            {blockData && item.count > 0 ? (
                                <>
                                    {IconComponent ? (
                                        <div className="w-full h-full flex items-center justify-center p-1">
                                            <IconComponent />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-1.5 border-2 border-black/20" style={{ backgroundColor: blockData.color }} />
                                    )}
                                    {item.count > 1 && (
                                        <span className="absolute bottom-0 right-0 text-white text-[9px] sm:text-xs font-bold leading-none px-1 bg-black/50 rounded-tl-sm">
                                            {item.count}
                                        </span>
                                    )}
                                </>
                            ) : null}
                            {isActive && <div className="absolute inset-0 border-2 border-white animate-pulse pointer-events-none" />}
                        </button>
                    );
                })}
            </div>
            <div className="w-0.5 h-6 bg-white/20 mx-0.5" />
            <button 
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onOpenInventory(); }}
                className="w-8 h-8 sm:w-14 sm:h-14 pixel-btn flex items-center justify-center active:scale-95 flex-shrink-0"
            >
                <span className="text-white font-bold text-lg sm:text-2xl leading-none mb-1 sm:mb-2 tracking-widest">...</span>
            </button>
        </div>
    </div>
  );
};