
import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ShieldCheck } from 'lucide-react';
import { AccountRecoveries } from './AccountRecoveries';

export const SecurityAudit: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <ShieldCheck className="text-gold-500" size={32} />
                    {t.admin.security.title}
                </h1>
            </div>

            {/* Default to Account Recoveries only as per user request */}
            <AccountRecoveries />
        </div>
    );
};
