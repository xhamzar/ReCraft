import React from 'react';
import * as THREE from 'three';

// Komponen baru untuk merender CanvasTexture
export const BlockIcon: React.FC<{ texture?: THREE.CanvasTexture }> = ({ texture }) => {
    if (!texture) return null;
    const dataUrl = texture.image.toDataURL();
    return <img src={dataUrl} alt="" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />;
};

export const FishingRodIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-current text-white drop-shadow-md" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L2 22" />
    <path d="M12 12l-8 8" />
    <path d="M18 6l-6 6" />
    <path d="M21 21l-2-2" />
  </svg>
);

export const WoodSwordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
    <path fill="#a0522d" d="M22.41,3.59L20.41,1.59C20,1.19 19.37,1.19 18.97,1.59L15,5.59L12,8.59L5,15.59L3.59,17C3.19,17.37 3.19,18 3.59,18.41L5.59,20.41C6,20.81 6.63,20.81 7,20.41L8.41,19L15.41,12L18.41,9L22.41,5C22.81,4.63 22.81,4 22.41,3.59Z" />
    <path fill="#8B4513" d="M5.59,20.41L7,19L5,17L3.59,18.41C3.19,18.81 3.19,19.37 3.59,19.78L4.22,20.41C4.62,20.81 5.25,20.81 5.59,20.41Z" />
    <path fill="#8B4513" d="M18.41,9L15,5.59L12,8.59L15.41,12L18.41,9Z" />
  </svg>
);

export const RawFishIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
        <path fill="#608ba6" d="M16.5,9.5C16.5,12 14.24,14 11.5,14C8.76,14 6.5,12 6.5,9.5C6.5,7 8.76,5 11.5,5C14.24,5 16.5,7 16.5,9.5M16.1,11.2L19.3,12.5C20.1,12.8 20.8,12.1 20.5,11.3L19,6.8C18.7,6 17.9,5.5 17.1,5.8L16.2,6.1C16.8,7.1 17.2,8.2 17.2,9.5C17.2,10.2 17,10.9 16.6,11.5L16.1,11.2Z" />
        <circle fill="black" cx="12.5" cy="8.5" r="1" />
    </svg>
);

export const SeedsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
      <path fill="#44aa00" d="M12,2C12,2 14,4 14,7C14,10 12,12 12,12C12,12 10,10 10,7C10,4 12,2 12,2Z" />
      <path fill="#336600" d="M8,8C8,8 10,10 10,13C10,16 8,18 8,18C8,18 6,16 6,13C6,10 8,8 8,8Z" />
      <path fill="#558811" d="M16,8C16,8 18,10 18,13C18,16 16,18 16,18C16,18 14,16 14,13C14,10 16,8 16,8Z" />
      <path fill="#225500" d="M12,14C12,14 14,16 14,19C14,22 12,24 12,24C12,24 10,22 10,19C10,16 12,14 12,14Z" />
  </svg>
);

export const WheatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
      <path fill="#dcb158" d="M6,22 C6,22 4,10 8,4 L10,6 C10,6 8,12 8,22" />
      <path fill="#dcb158" d="M18,22 C18,22 20,10 16,4 L14,6 C14,6 16,12 16,22" />
      <path fill="#eec369" d="M12,22 C12,22 10,8 12,2 L14,4 C14,4 14,10 12,22" />
      <ellipse fill="#b38f46" cx="8" cy="8" rx="1.5" ry="2.5" transform="rotate(-15 8 8)" />
      <ellipse fill="#b38f46" cx="16" cy="8" rx="1.5" ry="2.5" transform="rotate(15 16 8)" />
      <ellipse fill="#b38f46" cx="12" cy="6" rx="1.5" ry="2.5" />
  </svg>
);

export const FenceIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
        <path fill="#a0522d" d="M6,2 L8,2 L8,22 L6,22 Z" />
        <path fill="#a0522d" d="M16,2 L18,2 L18,22 L16,22 Z" />
        <path fill="#8B4513" d="M4,6 L20,6 L20,9 L4,9 Z" />
        <path fill="#8B4513" d="M4,14 L20,14 L20,17 L4,17 Z" />
    </svg>
);

export const StickIcon = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white drop-shadow-md">
        <path fill="#8B4513" d="M17.66,4.93L19.07,6.34L6.34,19.07L4.93,17.66L17.66,4.93Z" />
    </svg>
);

export const StairIcon: React.FC<{ color: string; shadowColor: string }> = ({ color, shadowColor }) => (
    <svg viewBox="0 0 16 16" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
        <rect x="2" y="10" width="12" height="4" fill={color} />
        <rect x="2" y="6" width="6" height="4" fill={color} />
        <rect x="2" y="10" width="12" height="1" fill={shadowColor} />
        <rect x="2" y="6" width="6" height="1" fill={shadowColor} />
        <rect x="7" y="6" width="1" height="4" fill={shadowColor} />
    </svg>
);

export const RawBeefIcon = () => (
    <svg viewBox="0 0 16 16" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
        <rect x="3" y="2" width="10" height="12" fill="#9e2a2b" />
        <rect x="2" y="3" width="12" height="10" fill="#9e2a2b" />
        <rect x="4" y="3" width="8" height="10" fill="#c14445" />
        <rect x="5" y="4" width="6" height="8" fill="#e06c6d" />
        {/* Fat */}
        <rect x="4" y="4" width="2" height="2" fill="#f2e8c9" />
        <rect x="10" y="9" width="2" height="3" fill="#f2e8c9" />
    </svg>
);