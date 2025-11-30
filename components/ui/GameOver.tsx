
import React from 'react';

interface GameOverProps {
  onRespawn: (e: React.SyntheticEvent) => void;
}

export const GameOver: React.FC<GameOverProps> = ({ onRespawn }) => {
  return (
    <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-500"
        onTouchStart={(e) => e.stopPropagation()} 
        onTouchMove={(e) => e.stopPropagation()} 
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    >
        <div className="pixel-panel p-8 text-center max-w-sm w-full mx-4">
            <h1 className="text-6xl font-black text-red-600 mb-4 tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                WASTED
            </h1>
            <p className="text-gray-300 mb-8 text-xl uppercase">You ran out of health.</p>
            
            <button 
                className="w-full py-4 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1"
                style={{ touchAction: 'manipulation' }}
                onPointerDown={onRespawn}
            >
                Try Again
            </button>
        </div>
    </div>
  );
};
