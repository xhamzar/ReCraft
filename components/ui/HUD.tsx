
import React from 'react';

interface HUDProps {
  health: number;
  onOpenSettings: () => void;
}

const PixelHeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <div className={`w-5 h-5 relative ${filled ? 'opacity-100' : 'opacity-40'}`}>
     <svg viewBox="0 0 10 10" className="w-full h-full fill-current text-red-600 drop-shadow-sm">
        <rect x="2" y="1" width="2" height="1" />
        <rect x="6" y="1" width="2" height="1" />
        <rect x="1" y="2" width="4" height="1" />
        <rect x="5" y="2" width="4" height="1" />
        <rect x="1" y="3" width="8" height="1" />
        <rect x="1" y="4" width="8" height="1" />
        <rect x="2" y="5" width="6" height="1" />
        <rect x="3" y="6" width="4" height="1" />
        <rect x="4" y="7" width="2" height="1" />
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

export const HUD: React.FC<HUDProps> = ({ health, onOpenSettings }) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-between items-start font-vt323">
        {/* Health */}
        <div className="pixel-panel flex flex-col items-start px-4 py-2 gap-1">
            <span className="text-white text-xl uppercase tracking-widest leading-none">Health</span>
            <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                     <PixelHeartIcon key={i} filled={i < health} />
                ))}
            </div>
        </div>

        {/* Settings Button */}
        <button 
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onOpenSettings(); }}
            className="pointer-events-auto w-12 h-12 flex items-center justify-center pixel-btn active:translate-y-1 transition-transform"
        >
            <PixelGearIcon />
        </button>
    </div>
  );
};
