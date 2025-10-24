'use client';

import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface ConfettiEffectProps {
  show: boolean;
}

export default function ConfettiEffect({ show }: ConfettiEffectProps) {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0
  });

  useEffect(() => {
    // Set window size on mount
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Update on resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!show) return null;

  return (
    <Confetti
      width={windowSize.width}
      height={windowSize.height}
      recycle={false}
      numberOfPieces={500}
      gravity={0.3}
    />
  );
}
