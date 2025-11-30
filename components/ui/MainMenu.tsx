import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenSettings }) => {
  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#3b3b3b] font-vt323">
      <div className="text-center">
        <h1 className="text-8xl font-black text-white mb-4 tracking-widest drop-shadow-[6px_6px_0_rgba(0,0,0,0.5)]">
          React Craft
        </h1>
        <p className="text-2xl text-gray-300 mb-12 uppercase tracking-wider">A Voxel Adventure</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={onStartGame}
          className="w-full py-4 pixel-btn text-white font-bold text-3xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-green-700 hover:bg-green-600"
        >
          Start Game
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1"
        >
          Options
        </button>
      </div>
      
      <p className="absolute bottom-4 text-gray-500 text-lg">Created with React & Three.js</p>
    </div>
  );
};
