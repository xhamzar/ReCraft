
import React from 'react';

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
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof GameSettings, value: number | boolean | string) => {
    onUpdateSettings({ ...settings, [key]: value });
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
            
          <div className={`flex items-center justify-between p-3 ${isPixel ? 'bg-black/40 border-2 border-gray-700' : 'bg-slate-700/50 rounded-lg'}`}>
            <span className="text-white text-xl uppercase">Visual Style</span>
            <button 
              onClick={() => handleChange('visualStyle', settings.visualStyle === 'pixel' ? 'smooth' : 'pixel')}
              className={`px-4 py-1 flex items-center justify-center text-white min-w-[100px] ${isPixel ? 'border-2 border-white pixel-btn bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold shadow-sm'}`}
            >
               {settings.visualStyle === 'pixel' ? 'PIXEL' : 'SMOOTH'}
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

        <button onClick={onClose} className={`w-full py-3 text-white font-bold text-xl uppercase ${isPixel ? 'pixel-btn hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg'}`}>
          Return to Game
        </button>
      </div>
    </div>
  );
};
