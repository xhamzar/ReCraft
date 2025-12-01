
import React, { useState, useEffect } from 'react';

export interface GameSettings {
  renderDistance: number;
  shadows: boolean;
  zoom: number;
  antiAliasing: boolean;
  visualStyle: 'pixel' | 'smooth';
  showFps: boolean;
}

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onQuit: () => void;
  hostId?: string;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, settings, onUpdateSettings, onQuit, hostId }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    // Initial check
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof GameSettings, value: number | boolean | string) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

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

  const isPixel = settings.visualStyle === 'pixel';

  return (
    <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 transition-all duration-300 pointer-events-auto" 
        onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={`p-6 w-full max-w-md mx-4 flex flex-col gap-6 ${isPixel ? 'pixel-panel' : 'bg-slate-800 rounded-xl border border-slate-600 shadow-2xl'}`}>
        <div className={`flex justify-between items-center pb-4 ${isPixel ? 'border-b-4 border-black' : 'border-b border-slate-600'}`}>
          <h2 className={`text-3xl font-bold text-white tracking-widest uppercase ${isPixel ? 'font-vt323' : 'font-sans'}`}>Options</h2>
          <button onClick={onClose} className={`w-10 h-10 flex items-center justify-center text-white font-bold text-xl ${isPixel ? 'pixel-btn hover:bg-red-600' : 'bg-red-500 hover:bg-red-600 rounded-lg'}`}>X</button>
        </div>

        <div className={`space-y-6 ${isPixel ? 'font-vt323' : 'font-sans'}`}>
          
          {/* Host ID Section - Only visible if hosting */}
          {hostId && (
            <div className={`p-3 ${isPixel ? 'bg-black/40 border-2 border-yellow-600' : 'bg-yellow-900/20 border border-yellow-600/50 rounded-lg'}`}>
               <span className="text-yellow-500 text-sm font-bold uppercase block mb-2">Server Host ID (Share this)</span>
               <div className="flex gap-2">
                   <code className="flex-1 bg-black/60 text-white p-2 font-mono text-sm border border-white/20 truncate select-all flex items-center">
                       {hostId}
                   </code>
                   <button 
                       onClick={() => {
                           navigator.clipboard.writeText(hostId);
                           setCopyFeedback(true);
                           setTimeout(() => setCopyFeedback(false), 2000);
                       }}
                       className={`px-4 py-1 text-white font-bold text-sm uppercase flex items-center justify-center min-w-[80px] ${isPixel ? 'pixel-btn bg-yellow-700 hover:bg-yellow-600' : 'bg-yellow-600 hover:bg-yellow-500 rounded shadow-sm'}`}
                   >
                       {copyFeedback ? 'COPIED!' : 'COPY'}
                   </button>
               </div>
            </div>
          )}
            
          <div className={`flex items-center justify-between p-3 ${isPixel ? 'bg-black/40 border-2 border-gray-700' : 'bg-slate-700/50 rounded-lg'}`}>
            <span className="text-white text-xl uppercase">Visual Style</span>
            <button 
              onClick={() => handleChange('visualStyle', settings.visualStyle === 'pixel' ? 'smooth' : 'pixel')}
              className={`px-4 py-1 flex items-center justify-center text-white min-w-[100px] ${isPixel ? 'border-2 border-white pixel-btn bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold shadow-sm'}`}
            >
               {settings.visualStyle === 'pixel' ? 'PIXEL' : 'SMOOTH'}
            </button>
          </div>

          <div className={`flex items-center justify-between p-3 ${isPixel ? 'bg-black/40 border-2 border-gray-700' : 'bg-slate-700/50 rounded-lg'}`}>
            <span className="text-white text-xl uppercase">Screen Mode</span>
            <button 
              onClick={toggleFullscreen}
              className={`px-4 py-1 flex items-center justify-center text-white min-w-[100px] ${isPixel ? 'border-2 border-white pixel-btn bg-blue-700' : 'bg-blue-600 hover:bg-blue-500 rounded-md font-bold shadow-sm'}`}
            >
               {isFullscreen ? 'FULL' : 'WINDOW'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-white">
              <span className="font-medium text-xl uppercase">View Distance</span>
              <span className={`px-2 text-xl ${isPixel ? 'bg-black border-2 border-gray-600' : 'bg-slate-900 rounded'}`}>{settings.renderDistance}</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="8" 
              step="1"
              value={settings.renderDistance}
              onChange={(e) => handleChange('renderDistance', parseInt(e.target.value))}
              className={`w-full h-4 appearance-none cursor-pointer ${isPixel ? 'bg-gray-700 border-2 border-black' : 'bg-slate-600 rounded-full'}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-white">
              <span className="font-medium text-xl uppercase">Zoom Level</span>
              <span className={`px-2 text-xl ${isPixel ? 'bg-black border-2 border-gray-600' : 'bg-slate-900 rounded'}`}>{settings.zoom}</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="40" 
              step="1"
              value={settings.zoom}
              onChange={(e) => handleChange('zoom', parseInt(e.target.value))}
              className={`w-full h-4 appearance-none cursor-pointer ${isPixel ? 'bg-gray-700 border-2 border-black' : 'bg-slate-600 rounded-full'}`}
            />
          </div>

          <div className={`flex items-center justify-between p-3 ${isPixel ? 'bg-black/40 border-2 border-gray-700' : 'bg-slate-700/50 rounded-lg'}`}>
            <span className="text-white text-xl uppercase">Shadows</span>
            <button 
              onClick={() => handleChange('shadows', !settings.shadows)}
              className={`w-12 h-10 flex items-center justify-center text-white ${isPixel ? 'border-2 border-white' : 'rounded'} ${settings.shadows ? (isPixel ? 'bg-green-600' : 'bg-green-500') : (isPixel ? 'bg-red-600' : 'bg-red-500')}`}
            >
               {settings.shadows ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className={`flex items-center justify-between p-3 ${isPixel ? 'bg-black/40 border-2 border-gray-700' : 'bg-slate-700/50 rounded-lg'}`}>
            <span className="text-white text-xl uppercase">Show FPS</span>
            <button 
              onClick={() => handleChange('showFps', !settings.showFps)}
              className={`w-12 h-10 flex items-center justify-center text-white ${isPixel ? 'border-2 border-white' : 'rounded'} ${settings.showFps ? (isPixel ? 'bg-green-600' : 'bg-green-500') : (isPixel ? 'bg-red-600' : 'bg-red-500')}`}
            >
               {settings.showFps ? 'ON' : 'OFF'}
            </button>
          </div>
          
        </div>
        
        <div className="flex flex-col gap-2 mt-2">
             <button onClick={onClose} className={`w-full py-3 text-white font-bold text-xl uppercase ${isPixel ? 'pixel-btn hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg'}`}>
              Return to Game
            </button>
            <button onClick={onQuit} className={`w-full py-3 text-white font-bold text-xl uppercase ${isPixel ? 'pixel-btn bg-red-800 hover:bg-red-700' : 'bg-red-700 hover:bg-red-600 rounded-lg shadow-lg'}`}>
              Disconnect / Quit
            </button>
        </div>

      </div>
    </div>
  );
};
