import React from 'react';
import { useAdminPermissionsStore } from '../../../stores/useAdminPermissionsStore';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

interface PermissionGuardProps {
  page: string;
  action?: 'view' | 'edit' | string;
  field?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  page,
  action = 'view',
  field,
  fallback,
  children
}) => {
  const { canView, canEdit, canPerform, canViewField } = useAdminPermissionsStore();
  const { language } = useLanguage();

  let hasAccess = false;

  if (field) {
    hasAccess = canViewField(page, field);
  } else if (action === 'view') {
    hasAccess = canView(page);
  } else if (action === 'edit') {
    hasAccess = canEdit(page);
  } else {
    // Custom granular action
    hasAccess = canPerform(page, action);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // If a specific fallback is provided (e.g. for small widgets), use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default Full-Page Fallback
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
      <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative group">
        <ShieldAlert className="w-10 h-10 text-red-500 group-hover:scale-110 transition-transform" />
        <div className="absolute inset-0 bg-red-500/5 blur-2xl rounded-full" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.2em]">
        {language === 'ar' ? 'وصول مقيد' : 'Access Restricted'}
      </h2>
      
      <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed font-light">
        {language === 'ar' 
          ? `عذراً، حسابك لا يملك صلاحية (${field || action}) لهذا القسم. يرجى التواصل مع المسؤول الرئيسي.`
          : `Sorry, your account does not have (${field || action}) permissions for this section. Please contact the Super Admin.`
        }
      </p>

      <div className="mt-8 flex gap-4">
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white/40 uppercase tracking-widest">
          Resource ID: {page.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
