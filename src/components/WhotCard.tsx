import React from 'react';
import { Card, Shape } from '@gbedu/shared';

interface WhotCardProps {
  card?: Card;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const WhotCard: React.FC<WhotCardProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  size = 'md',
  className = '',
}) => {
  // Dimensions: Cards at least 56px wide on mobile
  const sizeClasses = {
    sm: 'w-14 h-20 text-[10px]',
    md: 'w-16 sm:w-20 h-24 sm:h-28 text-xs',
    lg: 'w-24 sm:w-28 h-36 sm:h-40 text-sm',
  };

  if (isBack || !card) {
    // Card Back: Deep green with gold geometric Ankara pattern and Gbedu Star logo
    return (
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#0a3d2e] via-[#082e23] to-[#041a13] border-2 border-amber-400/80 shadow-lg flex flex-col items-center justify-center relative overflow-hidden select-none shrink-0 ${className}`}
      >
        {/* Subtle Ankara geometric diamond pattern overlay */}
        <div className="absolute inset-1 border border-amber-400/40 rounded-lg flex items-center justify-center bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:6px_6px] opacity-35" />

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-[1.5px] shadow-md z-10">
          <div className="w-full h-full bg-[#0a3d2e] rounded-full flex items-center justify-center">
            <span className="text-amber-400 text-xs font-black">★</span>
          </div>
        </div>

        <span className="text-[8px] font-black tracking-widest text-amber-300 uppercase mt-1 z-10 font-display">
          GBEDU
        </span>
      </div>
    );
  }

  // Card Front Face: Cream background with sharp borders and distinct geometric shapes
  const getShapeSVG = (shape: Shape) => {
    switch (shape) {
      case 'circle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-red-600 drop-shadow-sm">
            <circle cx="50" cy="50" r="42" />
          </svg>
        );
      case 'triangle':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-blue-600 drop-shadow-sm">
            <polygon points="50,10 90,85 10,85" />
          </svg>
        );
      case 'cross':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-emerald-600 drop-shadow-sm">
            <path d="M35,10 H65 V35 H90 V65 H65 V90 H35 V65 H10 V35 H35 Z" />
          </svg>
        );
      case 'square':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-amber-600 drop-shadow-sm">
            <rect x="15" y="15" width="70" height="70" rx="6" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-500 stroke-amber-700 stroke-2 drop-shadow-sm">
            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" />
          </svg>
        );
      case 'whot':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-rose-500 to-amber-500 flex items-center justify-center text-white text-base shadow-md">
              👑
            </div>
            <span className="text-[10px] font-black text-purple-700 tracking-tighter mt-0.5">
              WHOT
            </span>
          </div>
        );
    }
  };

  const getSpecialLabel = (num: number) => {
    switch (num) {
      case 1:
        return 'HOLD ON';
      case 2:
        return 'PICK 2';
      case 5:
        return 'PICK 3';
      case 8:
        return 'SUSPEND';
      case 14:
        return 'MARKET';
      case 20:
        return 'WILD';
      default:
        return null;
    }
  };

  const specialLabel = getSpecialLabel(card.number);

  const screenReaderLabel = `${specialLabel ? specialLabel + ' - ' : ''}${card.number} of ${card.shape}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={screenReaderLabel}
      className={`${sizeClasses[size]} rounded-xl bg-[#FFFDF5] border-2 text-stone-900 flex flex-col justify-between p-1.5 sm:p-2 select-none shrink-0 relative transition-all duration-200 cursor-pointer ${
        isPlayable
          ? 'border-emerald-500 ring-2 ring-emerald-400/80 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:-translate-y-2'
          : 'border-stone-400 opacity-90'
      } ${isSelected ? '-translate-y-4 ring-4 ring-amber-400 border-amber-500 shadow-2xl z-20' : ''} ${className}`}
    >
      {/* Top Left: Number & Micro Shape */}
      <div className="flex items-center justify-between w-full leading-none">
        <span className="font-black font-display text-xs sm:text-sm text-stone-900">
          {card.number}
        </span>
        {specialLabel && (
          <span className="text-[7px] sm:text-[8px] font-black tracking-tight px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 border border-amber-500/40 uppercase">
            {specialLabel}
          </span>
        )}
      </div>

      {/* Centre: Large Shape */}
      <div className="w-7 h-7 sm:w-10 sm:h-10 mx-auto flex items-center justify-center my-auto">
        {getShapeSVG(card.shape)}
      </div>

      {/* Bottom Right: Rotated Number */}
      <div className="flex items-center justify-end w-full leading-none">
        <span className="font-black font-display text-xs sm:text-sm text-stone-900 rotate-180">
          {card.number}
        </span>
      </div>
    </button>
  );
};
