
import React, { useRef, useEffect, useState } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  visualStyle?: 'pixel' | 'smooth';
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, visualStyle = 'pixel' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const touchId = useRef<number | null>(null);
  
  // Configuration
  const maxRadius = 40; 
  const isPixel = visualStyle === 'pixel';

  const handleStart = (clientX: number, clientY: number, id: number) => {
    if (touchId.current !== null) return;
    touchId.current = id;
    setActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current || !stickRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Clamp magnitude
    const clampedDistance = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);
    
    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;

    // Use translate3d for better performance
    stickRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    const normX = x / maxRadius;
    const normY = y / maxRadius;
    
    onMove(normX, normY);
  };

  const handleEnd = () => {
    touchId.current = null;
    setActive(false);
    if (stickRef.current) {
      stickRef.current.style.transform = `translate3d(0px, 0px, 0)`;
    }
    onMove(0, 0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent hitting touch zones
        const touch = e.changedTouches[0];
        handleStart(touch.clientX, touch.clientY, touch.identifier);
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (touchId.current === null) return;
        for (let i=0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                break;
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if (touchId.current === null) return;
        for (let i=0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleEnd();
                break;
            }
        }
    };

    // Mouse fallback
    const onMouseDown = (e: MouseEvent) => {
        e.stopPropagation();
        handleStart(e.clientX, e.clientY, 999);
    };
    const onMouseMove = (e: MouseEvent) => { if (touchId.current === 999) handleMove(e.clientX, e.clientY); };
    const onMouseUp = () => { if (touchId.current === 999) handleEnd(); };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visualContainerStyle = isPixel 
    ? `border-4 border-white/50 bg-black/40 ${active ? 'bg-black/60' : 'bg-black/40'}` 
    : `rounded-full border-2 border-white/30 bg-black/20 backdrop-blur-sm ${active ? 'bg-black/40' : 'bg-black/20'}`;
  
  const stickStyle = isPixel
    ? `w-10 h-10 -ml-5 -mt-5 bg-white border-4 border-gray-400 shadow-lg ${active ? 'bg-gray-200' : 'bg-white'}`
    : `w-12 h-12 -ml-6 -mt-6 bg-white/80 rounded-full shadow-lg backdrop-blur-md border border-white/50 ${active ? 'scale-90' : 'scale-100'}`;

  return (
    // Large hit-area container (invisible)
    <div 
        ref={containerRef}
        className="relative w-48 h-48 flex items-center justify-center -ml-10 -mb-10"
        style={{ touchAction: 'none' }}
    >
        {/* Visual Joystick */}
        <div 
            className={`relative w-28 h-28 pointer-events-none transition-colors duration-200 ${visualContainerStyle}`}
            style={{ imageRendering: isPixel ? 'pixelated' : 'auto' }}
        >
            <div 
                ref={stickRef}
                className={`absolute top-1/2 left-1/2 transition-transform duration-75 ${stickStyle}`}
            />
        </div>
    </div>
  );
};
