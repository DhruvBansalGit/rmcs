'use client';

import { useEffect, useState, useRef } from 'react';

interface ShuffleAnimationProps {
  onComplete: () => void;
  roundNumber: number;
}

export default function ShuffleAnimation({ onComplete, roundNumber }: ShuffleAnimationProps) {
  const [phase, setPhase] = useState<'intro' | 'shuffle' | 'throw' | 'fade'>('intro');
  
  // Audio refs
  const shuffleAudioRef = useRef<HTMLAudioElement | null>(null);
  const pickupAudioRef = useRef<HTMLAudioElement | null>(null);
  const throwAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio elements
    shuffleAudioRef.current = new Audio('/sound/shufflecards.mp3');
    pickupAudioRef.current = new Audio('/sound/cardflip.mp3');
    throwAudioRef.current = new Audio('/sound/cardflip.mp3');

    // Set volumes (0.0 to 1.0)
    if (shuffleAudioRef.current) shuffleAudioRef.current.volume = 0.6;
    if (pickupAudioRef.current) pickupAudioRef.current.volume = 0.5;
    if (throwAudioRef.current) throwAudioRef.current.volume = 0.7;

    // Intro phase
    const introTimer = setTimeout(() => {
      setPhase('shuffle');
      // Play pickup sound when cards appear
      pickupAudioRef.current?.play().catch(err => console.log('Audio play failed:', err));
    }, 500);

    // Shuffle phase - play shuffle sound
    const shuffleTimer = setTimeout(() => {
      shuffleAudioRef.current?.play().catch(err => console.log('Audio play failed:', err));
    }, 800);

    // Throw phase
    const throwTimer = setTimeout(() => {
      setPhase('throw');
      // Play throw sound
      throwAudioRef.current?.play().catch(err => console.log('Audio play failed:', err));
    }, 2500);

    // Fade phase
    const fadeTimer = setTimeout(() => {
      setPhase('fade');
    }, 3500);

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(shuffleTimer);
      clearTimeout(throwTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      
      // Cleanup audio
      shuffleAudioRef.current?.pause();
      pickupAudioRef.current?.pause();
      throwAudioRef.current?.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 z-50 flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Round Number with Animation */}
      <div className={`absolute top-20 text-center transition-all duration-1000 ${
        phase === 'intro' ? 'opacity-0 scale-50' : 
        phase === 'fade' ? 'opacity-0 scale-150' : 
        'opacity-100 scale-100'
      }`}>
        <div className="bg-amber-500 text-white px-8 py-4 rounded-full shadow-2xl">
          <h1 className="text-6xl font-bold mb-2">
            Round {roundNumber}
          </h1>
          <p className="text-2xl">🎴 Shuffling Cards...</p>
        </div>
      </div>

      {/* Animated Hand with Better Movement */}
      <div 
        className={`absolute transition-all duration-700 ${
          phase === 'intro' ? 'bottom-[-100px] opacity-0' :
          phase === 'shuffle' ? 'bottom-32 opacity-100' : 
          phase === 'throw' ? 'bottom-48 opacity-100' : 
          'bottom-64 opacity-0'
        }`}
        style={{
          transform: phase === 'shuffle' ? 'rotate(-5deg)' : 'rotate(0deg)'
        }}
      >
        <div className={`text-9xl ${phase === 'shuffle' ? 'animate-wave' : ''}`}>
          🤚
        </div>
      </div>

      {/* Paper Slips with Complex Animation */}
      <div className="relative w-full h-full flex items-center justify-center perspective-1000">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`absolute w-40 h-56 transition-all duration-700 ${
              phase === 'intro' ? 'opacity-0' :
              phase === 'fade' ? 'opacity-0' : 
              'opacity-100'
            }`}
            style={{
              transform: 
                phase === 'intro' ? 'scale(0) rotate(0deg)' :
                phase === 'shuffle' 
                  ? `rotate(${index * 5 - 10}deg) translateY(${Math.sin(Date.now() / 200 + index) * 30}px) translateX(${(index - 1.5) * 20}px)`
                  : phase === 'throw'
                  ? `rotate(${index * 120 + 360}deg) translateY(-250px) translateX(${(index - 1.5) * 200}px) scale(0.8)`
                  : 'scale(0)',
              zIndex: 4 - index
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl shadow-2xl border-4 border-amber-400 flex items-center justify-center transform-gpu">
              <div className="text-7xl">📜</div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-transparent opacity-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Sparkles and Particles */}
      {(phase === 'throw' || phase === 'fade') && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.8}s`,
              }}
            >
              {['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </>
      )}

      {/* Loading Bar */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-64">
        <div className="bg-amber-800 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-amber-400 h-full transition-all duration-3500 ease-linear"
            style={{ 
              width: phase === 'intro' ? '0%' : 
                     phase === 'shuffle' ? '50%' : 
                     phase === 'throw' ? '80%' : '100%' 
            }}
          />
        </div>
      </div>

      {/* Sound indicator (optional visual feedback) */}
      {phase === 'shuffle' && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1 bg-amber-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
