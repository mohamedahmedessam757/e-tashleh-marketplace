
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);

  useEffect(() => {
    // Faster loading simulation for better UX
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const increment = Math.random() * 15 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Trigger the split animation
      setTimeout(() => {
        setIsSplitting(true);
      }, 500);

      // Trigger the completion callback after the split
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 1500); // Wait for split animation
      return () => clearTimeout(finishTimer);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">

      {/* Left Curtain */}
      <motion.div
        initial={{ x: 0 }}
        animate={isSplitting ? { x: '-100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 w-1/2 h-full bg-[#1A1814] z-20 border-r border-gold-500/20"
      >
        <div className="absolute inset-0 bg-luxury-gradient opacity-50" />
      </motion.div>

      {/* Right Curtain */}
      <motion.div
        initial={{ x: 0 }}
        animate={isSplitting ? { x: '100%' } : { x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 right-0 w-1/2 h-full bg-[#1A1814] z-20 border-l border-gold-500/20"
      >
        <div className="absolute inset-0 bg-luxury-gradient opacity-50" />
      </motion.div>

      {/* Center Content (Fades out before split) */}
      <motion.div
        className="relative z-30 flex flex-col items-center"
        animate={isSplitting ? { opacity: 0, scale: 1.5 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo Container with Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gold-500 blur-3xl opacity-20 rounded-full" />
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl p-6 relative z-10">
            <img
              src="/logo.png"
              alt="E-Tashleh Logo"
              className="w-full h-full object-contain drop-shadow-lg brightness-0 invert"
            />
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">إي تشليح</h1>
        <p className="text-gold-300 text-sm md:text-base tracking-widest uppercase mb-8 opacity-80">Secure Marketplace</p>

        {/* Loader Line */}
        <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            className="absolute left-0 top-0 bottom-0 bg-gold-500 shadow-[0_0_15px_#A88B3E]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 text-[10px] font-mono text-white/40">
          {Math.round(progress)}%
        </div>
      </motion.div>

    </div>
  );
};
