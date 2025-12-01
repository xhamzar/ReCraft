
import React, { useState, useEffect } from 'react';
import { GameMode } from '../../types';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onHostGame: (mode: GameMode) => void;
  onJoinGame: (id: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onOpenSettings, onOpenAbout, onHostGame, onJoinGame }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [hostId, setHostId] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('survival');

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
        <h1 className="text-6xl font-black text-white mb-4 tracking-widest drop-shadow-[6px_6px_0_rgba(0,0,0,0.5)]">
          RECRAFT
        </h1>
        <p className="text-2xl text-gray-300 mb-8 uppercase tracking-wider">A Voxel Adventure</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        
        {!showJoinInput ? (
            <>
                {/* Game Mode Selector */}
                <div className="flex bg-black p-1 rounded border-2 border-gray-600 mb-2">
                    <button 
                        onClick={() => setSelectedMode('survival')}
                        className={`flex-1 py-1 text-xl font-bold uppercase transition-colors ${selectedMode === 'survival' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Survival
                    </button>
                    <button 
                        onClick={() => setSelectedMode('creative')}
                        className={`flex-1 py-1 text-xl font-bold uppercase transition-colors ${selectedMode === 'creative' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Creative
                    </button>
                </div>

                <button
                onClick={() => onStartGame(selectedMode)}
                className="w-full py-4 pixel-btn text-white font-bold text-3xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-green-700 hover:bg-green-600"
                >
                Single Player
                </button>
                
                <div className="flex gap-2">
                    <button
                        onClick={() => onHostGame(selectedMode)}
                        className="flex-1 py-3 pixel-btn text-white font-bold text-xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-purple-700 hover:bg-purple-600"
                    >
                        Host Game
                    </button>
                    <button
                        onClick={() => setShowJoinInput(true)}
                        className="flex-1 py-3 pixel-btn text-white font-bold text-xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-indigo-700 hover:bg-indigo-600"
                    >
                        Join Game
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                    onClick={onOpenSettings}
                    className="flex-1 py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1"
                    >
                    Options
                    </button>
                    <button
                    onClick={onOpenAbout}
                    className="flex-1 py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-gray-600 hover:bg-gray-500"
                    >
                    About
                    </button>
                </div>
                
                <button
                onClick={toggleFullscreen}
                className="w-full py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-blue-700 hover:bg-blue-600"
                >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
            </>
        ) : (
            <div className="flex flex-col gap-4">
                 <div className="text-center text-gray-400 mb-2 uppercase">Connecting to existing world...</div>
                 <input 
                    type="text" 
                    placeholder="Enter Host ID" 
                    value={hostId}
                    onChange={(e) => setHostId(e.target.value)}
                    className="w-full p-4 text-black font-vt323 text-2xl bg-gray-200 border-4 border-black outline-none"
                 />
                 <button
                    onClick={() => onJoinGame(hostId)}
                    disabled={!hostId}
                    className="w-full py-3 pixel-btn text-white font-bold text-2xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1 bg-green-700 hover:bg-green-600 disabled:opacity-50"
                >
                    Connect
                </button>
                <button
                    onClick={() => setShowJoinInput(false)}
                    className="w-full py-3 pixel-btn text-white font-bold text-xl uppercase tracking-widest hover:bg-gray-600 active:translate-y-1"
                >
                    Back
                </button>
            </div>
        )}
      </div>
      
      <p className="absolute bottom-4 text-gray-500 text-lg">Created by Hamzar</p>
    </div>
  );
};
