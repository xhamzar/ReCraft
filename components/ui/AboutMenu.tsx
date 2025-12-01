
import React from 'react';

interface AboutMenuProps {
  onClose: () => void;
}

export const AboutMenu: React.FC<AboutMenuProps> = ({ onClose }) => {
  return (
    <div 
        className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto" 
        onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl mx-4 flex flex-col bg-[#333] border-4 border-black text-white font-sans shadow-2xl max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-[#222] border-b-4 border-black p-4 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold tracking-widest uppercase text-gray-200">Credits</h2>
            <span className="text-xs text-gray-500 font-mono">v1.0.0-release</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center font-bold text-xl text-white bg-red-600 hover:bg-red-500 border-2 border-red-800 active:translate-y-0.5 transition-transform"
          >
            X
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-[#2a2a2a]">
          
          {/* LOGO AREA */}
          <div className="text-center space-y-2 border-b-2 border-gray-600 pb-6">
             <h1 className="text-5xl font-black tracking-widest text-white drop-shadow-md font-vt323">RECRAFT</h1>
             <p className="text-gray-400 italic">Infinite Voxel Sandbox Experience</p>
          </div>

          {/* CREATOR SECTION */}
          <div className="space-y-4">
              <h3 className="text-xl font-bold text-yellow-500 uppercase tracking-wider border-b border-gray-600 pb-1">Created By</h3>
              <div className="flex items-center gap-4 bg-[#333] p-4 border-2 border-black">
                  <div className="w-16 h-16 bg-blue-600 flex items-center justify-center border-2 border-white text-2xl font-bold">
                      H
                  </div>
                  <div>
                      <div className="text-2xl font-bold text-white">Hamzar</div>
                      <div className="text-blue-400 text-sm uppercase font-bold tracking-wide">Lead Developer & Designer</div>
                  </div>
              </div>
          </div>

          {/* GAME FEATURES */}
          <div className="space-y-4">
              <h3 className="text-xl font-bold text-green-500 uppercase tracking-wider border-b border-gray-600 pb-1">Game Features</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Procedural Infinite Terrain</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Real-time Multiplayer (P2P)</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Advanced Physics Engine</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Dynamic Day/Night Cycle</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Crafting & Enchanting System</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Mobile & Desktop Support</li>
              </ul>
          </div>

          {/* TECH STACK */}
          <div className="space-y-4">
              <h3 className="text-xl font-bold text-purple-500 uppercase tracking-wider border-b border-gray-600 pb-1">Technology</h3>
              <div className="text-gray-400 text-sm leading-relaxed">
                  Built with high-performance web technologies including <strong className="text-white">React 18</strong>, <strong className="text-white">Three.js</strong> (WebGL), and <strong className="text-white">React Three Fiber</strong>. Networking powered by <strong className="text-white">PeerJS</strong> (WebRTC) for low-latency peer-to-peer connection.
              </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-[#222] border-t-4 border-black text-center shrink-0">
             <div className="text-gray-500 text-xs font-mono mb-2">
                © {new Date().getFullYear()} Hamzar Studios. All rights reserved.
             </div>
             <button onClick={onClose} className="w-full py-3 font-bold text-xl uppercase text-white bg-[#555] hover:bg-[#666] border-2 border-[#333] active:translate-y-0.5 transition-all">
              Close
            </button>
        </div>

      </div>
    </div>
  );
};
