import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a1a1a] font-vt323">
      <div className="text-center">
        <h1 className="text-6xl font-black text-white mb-8 tracking-widest">
          Go-Craft
        </h1>
        <p className="text-2xl text-gray-400 mb-12 uppercase tracking-wider">
          Generating Terrain...
        </p>
      </div>

      <div className="w-full max-w-md bg-black border-4 border-gray-600 p-1">
        <div className="h-6 bg-green-500 animate-progress"></div>
      </div>
    </div>
  );
};
