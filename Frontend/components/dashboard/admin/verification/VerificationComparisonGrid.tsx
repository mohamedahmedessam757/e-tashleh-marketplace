import React from 'react';
import { GlassCard } from '../../../ui/GlassCard';
import { User, Store, Camera } from 'lucide-react';
import { VerificationImageGrid } from './VerificationImageGrid';

interface VerificationComparisonGridProps {
  isAr: boolean;
  customerImages: string[];
  storeImages: string[];
  officerImages: string[];
  customerLabel?: string;
  storeLabel?: string;
}

export const VerificationComparisonGrid: React.FC<VerificationComparisonGridProps> = ({
  isAr,
  customerImages,
  storeImages,
  officerImages,
}) => {
  const cols = [
    {
      icon: User,
      title: isAr ? 'صور العميل' : 'Customer photos',
      images: customerImages,
      accent: 'text-blue-400',
    },
    {
      icon: Store,
      title: isAr ? 'صور المتجر (التوثيق)' : 'Store verification photos',
      images: storeImages,
      accent: 'text-amber-400',
    },
    {
      icon: Camera,
      title: isAr ? 'صور المطابقة الميدانية' : 'Field inspection photos',
      images: officerImages,
      accent: 'text-green-400',
    },
  ];

  return (
    <GlassCard className="p-6 bg-[#1A1814]/80">
      <h3 className="text-lg font-bold text-white mb-2">
        {isAr ? 'مقارنة المصادر' : 'Source comparison'}
      </h3>
      <p className="text-xs text-white/50 mb-4">
        {isAr
          ? 'قارن الشكل والوصف ورقم القطعة والفاتورة بين العميل والمتجر والقطعة الفعلية.'
          : 'Compare appearance, description, part ID, and invoice across customer, store, and field.'}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cols.map(({ icon: Icon, title, images, accent }) => (
          <div key={title} className="space-y-2">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${accent}`}>
              <Icon size={16} />
              {title}
              <span className="text-white/30 font-normal">({images.length})</span>
            </h4>
            <VerificationImageGrid
              images={images}
              emptyLabel={isAr ? 'لا توجد صور' : 'No images'}
              columns={2}
            />
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
