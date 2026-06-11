import React from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';

interface BlurredSectionProps {
  page?: string;
  field?: string;
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  className?: string;
  children: React.ReactNode;
  isBlurred?: boolean; // Manual override if needed
}

export const BlurredSection: React.FC<BlurredSectionProps> = ({
  page,
  field,
  titleAr = 'بيانات محمية',
  titleEn = 'Protected Data',
  descriptionAr = 'تتطلب عرض هذه البيانات صلاحيات إضافية للمسؤول',
  descriptionEn = 'Viewing this data requires additional administrative permissions',
  className = '',
  children,
  isBlurred: manualIsBlurred
}) => {
  const { language } = useLanguage();
  const { canViewField } = useAdminPermissionsStore();

  // Determine blur state: manual prop OR automatic store check
  let isActuallyBlurred = manualIsBlurred ?? false;
  
  if (page && field) {
    isActuallyBlurred = !canViewField(page, field);
  }

  if (!isActuallyBlurred) return <>{children}</>;

  return (
    <div className={`relative group ${className}`}>
      {/* Blurred Content Container */}
      <div className="filter blur-md select-none pointer-events-none opacity-40">
        {children}
      </div>

      {/* Overlay Shield */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl border border-white/5 transition-all duration-500">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-3 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] group-hover:scale-110 transition-transform">
          <Lock className="w-6 h-6 text-red-500" />
        </div>
        
        <div className="text-center px-4">
          <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">
            {language === 'ar' ? titleAr : titleEn}
          </h4>
          <p className="text-white/40 text-[10px] leading-relaxed max-w-[200px] mx-auto">
            {language === 'ar' ? descriptionAr : descriptionEn}
          </p>
        </div>

        {/* Decorative corner lines for 2026 premium feel */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-red-500/30 rounded-tl-sm" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-red-500/30 rounded-br-sm" />
      </div>
    </div>
  );
};
