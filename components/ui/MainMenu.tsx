import React, { useState, useEffect } from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenSettings }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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
        
        <button
          onClick={toggleFullscreen}
          className="w-full py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-blue-700 hover:bg-blue-600"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
      
      <p className="absolute bottom-4 text-gray-500 text-lg">Created with React & Three.js</p>
    </div>
  );
};