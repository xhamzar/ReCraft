
import React from 'react';
import { GameMode } from '../../types';

interface HUDProps {
  health: number;
  onOpenSettings: () => void;
  onChat: () => void;
  gameMode?: GameMode;
}

const PixelHeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <div className={`w-6 h-6 relative ${filled ? 'opacity-100' : 'opacity-40 grayscale'}`}>
     <svg viewBox="0 0 10 10" className="w-full h-full fill-current text-red-600 drop-shadow-[2px_2px_0_rgba(0,0,0,0.75)]">
        <rect x="2" y="1" width="2" height="1" />
        <rect x="6" y="1" width="2" height="1" />
        <rect x="1" y="2" width="4" height="1" />
        <rect x="5" y="2" width="4" height="1" />
        <rect x="1" y="3" width="8" height="1" />
        <rect x="1" y="4" width="8" height="1" />
        <rect x="2" y="5" width="6" height="1" />
        <rect x="3" y="6" width="4" height="1" />
        <rect x="4" y="7" width="2" height="1" />
        {/* Shine/Reflection for depth */}
        <rect x="2" y="2" width="1" height="1" fill="white" fillOpacity="0.4" />
     </svg>
  </div>
);

const PixelGearIcon = () => (
    <svg viewBox="0 0 10 10" className="w-6 h-6 fill-white">
        <rect x="4" y="1" width="2" height="1" />
        <rect x="4" y="8" width="2" height="1" />
        <rect x="1" y="4" width="1" height="2" />
        <rect x="8" y="4" width="1" height="2" />
        <rect x="2" y="2" width="6" height="6" />
        <rect x="4" y="4" width="2" height="2" fill="black" opacity="0.5" />
    </svg>
);

const ChatIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H6L4 18V4H20V16Z" />
    </svg>
);

export const HUD: React.FC<HUDProps> = ({ health, onOpenSettings, onChat, gameMode = 'survival' }) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-between items-start font-vt323">
        {/* Health - Only show in Survival. Simple row, no text, no panel. */}
        <div className={`flex gap-0.5 transition-opacity duration-500 ${gameMode === 'creative' ? 'opacity-0' : 'opacity-100'}`}>
            {Array.from({ length: 10 }).map((_, i) => (
                    <PixelHeartIcon key={i} filled={i < health} />
            ))}
        </div>

        {/* Right Side Buttons */}
        <div className="flex flex-col gap-2 pointer-events-auto items-end">
            {/* Settings Button */}
            <button 
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onOpenSettings(); }}
                className="w-12 h-12 flex items-center justify-center pixel-btn active:translate-y-1 transition-transform"
            >
                <PixelGearIcon />
            </button>

            {/* Chat Button */}
            <button 
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onChat(); }}
                className="w-12 h-12 flex items-center justify-center pixel-btn active:translate-y-1 transition-transform bg-blue-600 hover:bg-blue-500"
            >
                <ChatIcon />
            </button>
            
            {/* Game Mode Indicator */}
            <div className="bg-black/50 text-white px-2 py-1 text-sm font-vt323 uppercase rounded border border-white/20">
                {gameMode}
            </div>
        </div>
    </div>
  );
};
