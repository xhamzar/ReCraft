
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
  const [activeTab, setActiveTab] = useState<'general' | 'graphics'>('general');

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

  // Styles
  const panelClass = isPixel ? "pixel-panel p-6 gap-6" : "bg-[#333] border-4 border-black text-white font-sans shadow-2xl";
  const headerClass = isPixel ? "pb-4 border-b-4 border-black" : "bg-[#222] border-b-4 border-black p-4";
  const rowClass = isPixel ? "p-3 bg-black/40 border-2 border-gray-700" : "bg-[#444] border-2 border-[#222] p-3";
  const btnClass = isPixel ? "pixel-btn border-2 border-white" : "border-2 border-[#222] font-bold transition-colors active:translate-y-0.5 bg-[#555] hover:bg-[#666] text-white";
  const btnActive = isPixel ? "bg-green-600 border-white" : "bg-green-700 hover:bg-green-600 border-green-900 text-white";
  const btnInactive = isPixel ? "bg-red-600 border-white" : "bg-[#555] hover:bg-[#666] text-gray-300 border-[#222]";

  const tabBtnClass = (isActive: boolean) => 
      `flex-1 py-3 font-bold uppercase tracking-wider transition-all ${
          isActive 
          ? (isPixel ? 'bg-[#555] text-white translate-y-1' : 'bg-[#444] text-white border-b-4 border-green-500 bg-gradient-to-t from-[#444] to-[#333]') 
          : (isPixel ? 'bg-[#333] text-gray-500' : 'bg-[#222] text-gray-500 hover:bg-[#2a2a2a] hover:text-gray-300')
      }`;

  return (
    <div 
        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 transition-all duration-300 pointer-events-auto" 
        onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={`w-full max-w-md mx-4 flex flex-col gap-0 overflow-hidden ${panelClass} h-[80vh] max-h-[600px]`}>
        
        {/* HEADER */}
        <div className={`flex justify-between items-center shrink-0 ${headerClass}`}>
          <h2 className={`text-3xl font-bold tracking-widest uppercase ${isPixel ? 'font-vt323 text-white' : 'font-sans text-gray-200'}`}>Settings</h2>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 flex items-center justify-center font-bold text-xl text-white ${isPixel ? 'pixel-btn hover:bg-red-600' : 'bg-red-600 hover:bg-red-500 border-2 border-red-800'}`}
          >
            X
          </button>
        </div>

        {/* TABS */}
        <div className="flex bg-black shrink-0 border-b-4 border-black">
            <button onClick={() => setActiveTab('general')} className={tabBtnClass(activeTab === 'general')}>
                General
            </button>
            <div className="w-1 bg-black"></div>
            <button onClick={() => setActiveTab('graphics')} className={tabBtnClass(activeTab === 'graphics')}>
                Graphics
            </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className={`flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar ${isPixel ? 'font-vt323 p-2' : 'font-sans p-6 bg-[#2a2a2a]'}`}>
          
          {/* === GENERAL TAB === */}
          {activeTab === 'general' && (
              <>
                {/* Host ID Section */}
                {hostId ? (
                    <div className={`p-3 mb-2 ${isPixel ? 'bg-black/40 border-2 border-yellow-600' : 'bg-[#333] border-2 border-yellow-700/50'}`}>
                    <span className="text-yellow-500 text-sm font-bold uppercase block mb-2">Server Host ID</span>
                    <div className="flex gap-2">
                        <code className={`flex-1 p-2 font-mono text-sm truncate select-all flex items-center ${isPixel ? 'bg-black/60 text-white border border-white/20' : 'bg-black text-gray-300 border border-gray-600'}`}>
                            {hostId}
                        </code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(hostId);
                                setCopyFeedback(true);
                                setTimeout(() => setCopyFeedback(false), 2000);
                            }}
                            className={`px-4 py-1 font-bold text-sm uppercase flex items-center justify-center min-w-[80px] text-white ${isPixel ? 'pixel-btn bg-yellow-700 hover:bg-yellow-600' : 'bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-900'}`}
                        >
                            {copyFeedback ? 'COPIED' : 'COPY'}
                        </button>
                    </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 italic text-sm mb-2">
                        Multiplayer not active
                    </div>
                )}

                {/* Fullscreen */}
                <div className={`flex items-center justify-between ${rowClass}`}>
                    <span className="text-xl uppercase">Screen Mode</span>
                    <button 
                    onClick={toggleFullscreen}
                    className={`px-4 py-1 flex items-center justify-center min-w-[100px] ${isPixel ? 'border-2 border-white pixel-btn bg-blue-700 text-white' : btnClass}`}
                    >
                    {isFullscreen ? 'FULL' : 'WINDOW'}
                    </button>
                </div>

                {/* Show FPS */}
                <div className={`flex items-center justify-between ${rowClass}`}>
                    <span className="text-xl uppercase">Show FPS</span>
                    <button 
                    onClick={() => handleChange('showFps', !settings.showFps)}
                    className={`w-16 h-8 flex items-center justify-center ${settings.showFps ? btnActive : btnInactive}`}
                    >
                    {settings.showFps ? 'ON' : 'OFF'}
                    </button>
                </div>
              </>
          )}

          {/* === GRAPHICS TAB === */}
          {activeTab === 'graphics' && (
              <>
                {/* Visual Style */}
                <div className={`flex items-center justify-between ${rowClass}`}>
                    <span className="text-xl uppercase">Style</span>
                    <button 
                    onClick={() => handleChange('visualStyle', settings.visualStyle === 'pixel' ? 'smooth' : 'pixel')}
                    className={`px-4 py-1 flex items-center justify-center min-w-[120px] ${isPixel ? 'border-2 border-white pixel-btn bg-purple-700 text-white' : btnClass}`}
                    >
                    {settings.visualStyle === 'pixel' ? 'PIXEL' : 'SMOOTH'}
                    </button>
                </div>

                {/* Render Distance */}
                <div className={`space-y-2 ${isPixel ? '' : rowClass}`}>
                    <div className="flex justify-between text-white">
                    <span className="font-medium text-xl uppercase">View Dist.</span>
                    <span className={`px-2 text-xl ${isPixel ? 'bg-black border-2 border-gray-600' : 'bg-black text-gray-300 border border-gray-600'}`}>{settings.renderDistance}</span>
                    </div>
                    <input 
                    type="range" 
                    min="2" 
                    max="8" 
                    step="1"
                    value={settings.renderDistance}
                    onChange={(e) => handleChange('renderDistance', parseInt(e.target.value))}
                    className={`w-full h-4 appearance-none cursor-pointer ${isPixel ? 'bg-gray-700 border-2 border-black' : 'bg-[#222] border border-gray-600 rounded-none'}`}
                    />
                </div>

                {/* Zoom */}
                <div className={`space-y-2 ${isPixel ? '' : rowClass}`}>
                    <div className="flex justify-between text-white">
                    <span className="font-medium text-xl uppercase">Zoom</span>
                    <span className={`px-2 text-xl ${isPixel ? 'bg-black border-2 border-gray-600' : 'bg-black text-gray-300 border border-gray-600'}`}>{settings.zoom}</span>
                    </div>
                    <input 
                    type="range" 
                    min="10" 
                    max="40" 
                    step="1"
                    value={settings.zoom}
                    onChange={(e) => handleChange('zoom', parseInt(e.target.value))}
                    className={`w-full h-4 appearance-none cursor-pointer ${isPixel ? 'bg-gray-700 border-2 border-black' : 'bg-[#222] border border-gray-600 rounded-none'}`}
                    />
                </div>

                {/* Shadows */}
                <div className={`flex items-center justify-between ${rowClass}`}>
                    <span className="text-xl uppercase">Shadows</span>
                    <button 
                    onClick={() => handleChange('shadows', !settings.shadows)}
                    className={`w-16 h-8 flex items-center justify-center ${settings.shadows ? btnActive : btnInactive}`}
                    >
                    {settings.shadows ? 'ON' : 'OFF'}
                    </button>
                </div>
              </>
          )}

        </div>
        
        {/* FOOTER */}
        <div className={`flex flex-col gap-2 mt-auto shrink-0 ${isPixel ? '' : 'p-4 bg-[#222] border-t-4 border-black'}`}>
             <button onClick={onClose} className={`w-full py-3 font-bold text-xl uppercase text-white ${isPixel ? 'pixel-btn hover:bg-gray-600' : 'bg-[#555] hover:bg-[#666] border-2 border-[#333]'}`}>
              Resume Game
            </button>
            <button onClick={onQuit} className={`w-full py-3 font-bold text-xl uppercase text-white ${isPixel ? 'pixel-btn bg-red-800 hover:bg-red-700' : 'bg-red-700 hover:bg-red-600 border-2 border-red-900'}`}>
              Disconnect / Quit
            </button>
        </div>

      </div>
    </div>
  );
};
