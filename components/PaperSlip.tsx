'use client';

import { useState } from 'react';
import { Role, RoleName } from '@/lib/types';
import { ROLES } from '@/lib/types';

interface PaperSlipProps {
  role?: RoleName;
  isRevealed: boolean;
  onReveal?: () => void;
  playerName: string;
  canReveal: boolean;
}

export default function PaperSlip({ role, isRevealed, onReveal, playerName, canReveal }: PaperSlipProps) {
  const [isFlipping, setIsFlipping] = useState(false);

  const handleClick = () => {
    if (canReveal && !isRevealed && onReveal) {
      setIsFlipping(true);
      setTimeout(() => {
        onReveal();
        setIsFlipping(false);
      }, 600);
    }
  };

  const roleData = ROLES.find(r => r.name === role);

  return (
    <div 
      className={`relative w-40 h-56 cursor-pointer ${canReveal ? 'hover:scale-105' : ''} transition-transform`}
      onClick={handleClick}
    >
      <div 
        className={`relative w-full h-full transition-all duration-600 transform-style-3d ${
          isRevealed || isFlipping ? 'rotate-y-180' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front - Folded */}
        <div 
          className="absolute w-full h-full backface-hidden bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg shadow-lg border-2 border-amber-300 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <div className="text-sm font-semibold text-amber-800 mb-2">{playerName}</div>
            <div className="text-4xl">📜</div>
            <div className="text-xs text-amber-600 mt-2">Tap to reveal</div>
          </div>
        </div>

        {/* Back - Revealed */}
        <div 
          className="absolute w-full h-full backface-hidden rounded-lg shadow-lg border-2 flex flex-col items-center justify-center"
          style={{ 
            backfaceVisibility: 'hidden', 
            transform: 'rotateY(180deg)',
            backgroundColor: roleData?.color + '20',
            borderColor: roleData?.color
          }}
        >
          {roleData && (
            <>
            <div className="text-sm font-semibold text-amber-800 mb-2">{playerName}</div>
              <div className="text-2xl font-bold mb-2" style={{ color: roleData.color }}>
                {roleData.name}
              </div>
              <div className="text-3xl font-bold" style={{ color: roleData.color }}>
                {roleData.points}
              </div>
              <div className="text-sm text-gray-600 mt-1">points</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
