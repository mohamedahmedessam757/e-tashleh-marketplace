import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface VerificationVideoPlayerProps {
  src: string;
  isAr: boolean;
}

export const VerificationVideoPlayer: React.FC<VerificationVideoPlayerProps> = ({ src, isAr }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-white/60">
          {isAr ? 'فيديو التوثيق' : 'Verification video'}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/70 hover:bg-white/10 transition-colors"
        >
          {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {expanded ? (isAr ? 'تصغير' : 'Shrink') : isAr ? 'تكبير' : 'Expand'}
        </button>
      </div>
      <div
        className={`w-full rounded-xl overflow-hidden border border-white/10 bg-black/60 transition-all ${
          expanded ? 'max-h-[min(70vh,640px)]' : 'max-h-52'
        }`}
      >
        <video
          key={src}
          src={src}
          controls
          playsInline
          className="w-full h-full max-h-[inherit] object-contain"
        />
      </div>
    </div>
  );
};
