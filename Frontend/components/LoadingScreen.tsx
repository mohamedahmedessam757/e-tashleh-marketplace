
import React, { useEffect, useState, useMemo } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

function getMobileTiming() {
  if (typeof window === 'undefined') {
    return { intervalMs: 60, splitDelay: 80, finishDelay: 280, incrementMin: 12, incrementMax: 34 };
  }
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) {
    return { intervalMs: 40, splitDelay: 30, finishDelay: 120, incrementMin: 28, incrementMax: 45 };
  }
  return { intervalMs: 60, splitDelay: 80, finishDelay: 280, incrementMin: 12, incrementMax: 34 };
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);
  const timing = useMemo(() => getMobileTiming(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const increment = Math.random() * (timing.incrementMax - timing.incrementMin) + timing.incrementMin;
        return Math.min(prev + increment, 100);
      });
    }, timing.intervalMs);

    return () => clearInterval(timer);
  }, [timing]);

  useEffect(() => {
    if (progress === 100) {
      const splitTimer = setTimeout(() => {
        setIsSplitting(true);
      }, timing.splitDelay);

      const finishTimer = setTimeout(() => {
        onComplete();
      }, timing.splitDelay + timing.finishDelay);

      return () => {
        clearTimeout(splitTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [progress, onComplete, timing]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">

      <div
        className={`loader-curtain-left absolute top-0 left-0 w-1/2 h-full bg-[#1A1814] z-20 border-r border-gold-500/20 ${isSplitting ? 'is-splitting' : ''}`}
      >
        <div className="absolute inset-0 bg-luxury-gradient opacity-50" />
      </div>

      <div
        className={`loader-curtain-right absolute top-0 right-0 w-1/2 h-full bg-[#1A1814] z-20 border-l border-gold-500/20 ${isSplitting ? 'is-splitting' : ''}`}
      >
        <div className="absolute inset-0 bg-luxury-gradient opacity-50" />
      </div>

      <div className={`loader-content relative z-30 flex flex-col items-center ${isSplitting ? 'is-splitting' : ''}`}>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gold-500 blur-3xl opacity-20 rounded-full" />
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl p-6 relative z-10">
            <picture>
              <source srcSet="/logo.webp" type="image/webp" />
              <img
                src="/logo.png"
                alt="E-TASHLEH"
                width={160}
                height={160}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-contain drop-shadow-lg brightness-0 invert"
              />
            </picture>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight font-sans">إي تشليح</h1>
        <p className="text-gold-300 text-sm md:text-base tracking-widest uppercase mb-8 opacity-80">Secure Marketplace</p>

        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div
            className="absolute left-0 top-0 bottom-0 bg-gold-500 shadow-[0_0_15px_#A88B3E] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-[10px] font-mono text-white/40">
          {Math.round(progress)}%
        </div>
      </div>

    </div>
  );
};
