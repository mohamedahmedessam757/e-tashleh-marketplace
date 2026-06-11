import React from 'react';
import { ImageIcon } from 'lucide-react';

export const VerificationImageGrid: React.FC<{
  images: string[];
  emptyLabel: string;
  columns?: 2 | 3 | 4;
}> = ({ images, emptyLabel, columns = 3 }) => {
  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
        <ImageIcon size={20} className="mb-2 opacity-50" />
        {emptyLabel}
      </div>
    );
  }

  const colClass = columns === 4 ? 'grid-cols-4' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={`grid ${colClass} gap-2`}>
      {images.map((src, i) => (
        <a
          key={`${src.slice(-24)}-${i}`}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40 hover:border-gold-500/40 transition-colors"
        >
          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        </a>
      ))}
    </div>
  );
};
