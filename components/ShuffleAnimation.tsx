'use client';

import { useEffect, useState } from 'react';

interface ShuffleAnimationProps {
  onComplete: () => void;
  roundNumber: number;
}

export default function ShuffleAnimation({ onComplete, roundNumber }: ShuffleAnimationProps) {
  const [phase, setPhase] = useState<'shuffle' | 'throw' | 'fade'>('shuffle');

  useEffect(() => {
    // Shuffle phase: 2 seconds
    const shuffleTimer = setTimeout(() => {
      setPhase('throw');
    }, 2000);

    // Throw phase: 1 second
    const throwTimer = setTimeout(() => {
      setPhase('fade');
    }, 3000);

    // Fade and complete: 0.5 seconds
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(shuffleTimer);
      clearTimeout(throwTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900 to-orange-900 z-50 flex items-center justify-center overflow-hidden">
      {/* Animated Hand */}
      <div 
        className={`absolute transition-all duration-1000 ${
          phase === 'shuffle' ? 'bottom-10 opacity-100' : 
          phase === 'throw' ? 'bottom-20 opacity-100' : 
          'bottom-32 opacity-0'
        }`}
      >
        <div className="text-9xl animate-wave">🤚</div>
      </div>

      {/* Round Number */}
      <div className="absolute top-20 text-center">
        <h1 className="text-5xl font-bold text-amber-100 mb-2">
          Round {roundNumber}
        </h1>
        <p className="text-xl text-amber-300">Shuffling cards...</p>
      </div>

      {/* Paper Slips */}
      <div className="relative w-full h-full flex items-center justify-center">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`absolute w-32 h-48 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg shadow-2xl border-2 border-amber-300 transition-all duration-500 ${
              phase === 'shuffle'
                ? `shuffle-card-${index}`
                : phase === 'throw'
                ? `throw-card-${index}`
                : 'opacity-0 scale-0'
            }`}
            style={{
              transform: phase === 'shuffle' 
                ? `rotate(${index * 5 - 10}deg) translateY(${Math.sin(Date.now() / 200 + index) * 20}px)`
                : phase === 'throw'
                ? `rotate(${index * 90}deg) translateY(-200px) translateX(${(index - 1.5) * 150}px)`
                : 'scale(0)'
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-6xl">
              📜
            </div>
          </div>
        ))}
      </div>

      {/* Sparkle Effects */}
      {phase === 'throw' && (
        <>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            >
              ✨
            </div>
          ))}
        </>
      )}
    </div>
  );
}
