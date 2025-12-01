
import React from 'react';
import { Joystick } from '../Joystick';

interface GameControlsProps {
  onMove: (x: number, y: number) => void;
  onAction: (action: 'attack') => void;
  onJump: () => void;
  onCrouch: () => void;
  isCrouching: boolean;
  visualStyle?: 'pixel' | 'smooth';
}

// Icons
const SwordIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-md">
        <path d="M22.41,3.59L20.41,1.59C20,1.19 19.37,1.19 18.97,1.59L15,5.59L12,8.59L5,15.59L3.59,17C3.19,17.37 3.19,18 3.59,18.41L5.59,20.41C6,20.81 6.63,20.81 7,20.41L8.41,19L15.41,12L18.41,9L22.41,5C22.81,4.63 22.81,4 22.41,3.59Z" />
    </svg>
);

const JumpIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-md">
    <path d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z" />
  </svg>
);

const CrouchIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white drop-shadow-md">
     <path d="M11,14 L13,14 L13,6 L11,6 L11,14 Z M7,14 L9,14 L9,10 L7,10 L7,14 Z M15,14 L17,14 L17,10 L15,10 L15,14 Z M6,16 L18,16 L18,18 L6,18 L6,16 Z" transform="translate(0, 3)"/>
     <path d="M12,2 L14,6 L10,6 L12,2 Z" transform="translate(0, 3) rotate(180 12 4)"/>
  </svg>
);

export const GameControls: React.FC<GameControlsProps> = ({ onMove, onAction, onJump, onCrouch, isCrouching, visualStyle = 'pixel' }) => {
  const isPixel = visualStyle === 'pixel';
  
  // Smaller buttons on mobile default, larger on sm screens
  const jumpBtnClass = isPixel 
    ? "w-14 h-14 sm:w-16 sm:h-16 pixel-btn active:bg-gray-400 active:translate-y-1"
    : "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 active:bg-white/30 active:scale-95 shadow-lg";

  const attackBtnClass = isPixel
    ? "w-20 h-20 sm:w-24 sm:h-24 bg-red-600 border-4 border-red-900 shadow-[inset_4px_4px_0_rgba(255,255,255,0.2)] active:shadow-none active:bg-red-700 active:translate-y-1"
    : "w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500/80 backdrop-blur-md border border-white/30 active:bg-red-600/90 active:scale-95 shadow-xl";
    
  const crouchBtnClass = isPixel
    ? `w-12 h-12 sm:w-14 sm:h-14 pixel-btn transition-transform ${isCrouching ? 'bg-gray-500 translate-y-1 shadow-[inset_2px_2px_0px_0px_#222]' : 'active:bg-gray-400 active:translate-y-1'}`
    : `w-12 h-12 sm:w-14 sm:h-14 rounded-full backdrop-blur-md border border-white/30 transition-all ${isCrouching ? 'bg-white/40 scale-95 shadow-inner' : 'bg-white/20 active:bg-white/30 active:scale-95 shadow-lg'}`;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end">
        {/* Adjusted padding to clear inventory bar + safe area */}
        <div className="flex justify-between items-end px-2 sm:px-8 pb-24 sm:pb-32 w-full">
            
            {/* Left: Joystick */}
            <div className="pointer-events-auto">
                <Joystick onMove={onMove} visualStyle={visualStyle} />
            </div>

            {/* Right: Actions */}
            <div className="pointer-events-auto flex items-end gap-2 sm:gap-4">
                 <button 
                    className={`${crouchBtnClass} flex items-center justify-center`}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onCrouch(); }}
                    style={{ touchAction: 'none' }}
                    aria-label="Crouch"
                >
                    <CrouchIcon />
                </button>
                <button 
                    className={`${jumpBtnClass} flex items-center justify-center transition-transform`}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onJump(); }}
                    style={{ touchAction: 'none' }}
                    aria-label="Jump"
                >
                    <JumpIcon />
                </button>
                <button 
                    className={`${attackBtnClass} flex items-center justify-center transition-transform`}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onAction('attack'); }}
                    style={{ touchAction: 'none' }}
                    aria-label="Attack"
                >
                    <SwordIcon />
                </button>
            </div>
        </div>
    </div>
  );
};
