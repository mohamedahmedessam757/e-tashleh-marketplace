import React from 'react';
import { IconUser, IconStore, IconShoppingCart, IconTrendingUp, IconArrowLeft, IconArrowRight } from '../ui/RoleIcons';
import { useLanguage } from '../../contexts/LanguageContext';

interface HomeRoleButtonsProps {
    onCustomerClick: () => void;
    onMerchantClick: () => void;
    onWholesaleClick: () => void;
    onEarnIncomeClick: () => void;
}

interface RoleButton {
    key: string;
    title: string;
    desc: string;
    Icon: React.FC<{ size?: number; className?: string }>;
    onClick: () => void;
    background: string;
    border: string;
    boxShadow: string;
    orderClass: string;
    delay: number;
}

export const HomeRoleButtons: React.FC<HomeRoleButtonsProps> = ({
    onCustomerClick,
    onMerchantClick,
    onWholesaleClick,
    onEarnIncomeClick,
}) => {
    const { t, language } = useLanguage();
    const ArrowIcon = language === 'ar' ? IconArrowLeft : IconArrowRight;
    const rs = t.common.roleSelection;
    const roles = t.common.home.roles;

    // DOM order = mobile layout; md:order-* reproduces the desktop layout of the reference.
    const buttons: RoleButton[] = [
        {
            key: 'store',
            title: rs.storeLogin,
            desc: roles.storeDesc,
            Icon: IconStore,
            onClick: onMerchantClick,
            background: 'linear-gradient(135deg, rgba(232, 122, 45, 0.9), rgba(200, 100, 35, 0.8))',
            border: '1px solid rgba(232, 122, 45, 0.5)',
            boxShadow: '0 4px 20px rgba(232, 122, 45, 0.2)',
            orderClass: 'md:order-1',
            delay: 0.35,
        },
        {
            key: 'customer',
            title: rs.customerOrders,
            desc: roles.customerDesc,
            Icon: IconUser,
            onClick: onCustomerClick,
            background: 'linear-gradient(135deg, rgba(156, 138, 90, 0.9), rgba(138, 120, 75, 0.8))',
            border: '1px solid rgba(156, 138, 90, 0.5)',
            boxShadow: '0 4px 20px rgba(156, 138, 90, 0.2)',
            orderClass: 'md:order-4',
            delay: 0.4,
        },
        {
            key: 'earn',
            title: rs.features.earnIncome,
            desc: roles.earnDesc,
            Icon: IconTrendingUp,
            onClick: onEarnIncomeClick,
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
            orderClass: 'md:order-3',
            delay: 0.45,
        },
        {
            key: 'wholesale',
            title: rs.wholesaleOrders,
            desc: roles.wholesaleDesc,
            Icon: IconShoppingCart,
            onClick: onWholesaleClick,
            background: 'linear-gradient(135deg, rgba(46, 150, 94, 0.9), rgba(35, 120, 75, 0.8))',
            border: '1px solid rgba(46, 150, 94, 0.5)',
            boxShadow: '0 4px 20px rgba(46, 150, 94, 0.2)',
            orderClass: 'md:order-2',
            delay: 0.5,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            {buttons.map(({ key, title, desc, Icon, onClick, background, border, boxShadow, orderClass, delay }) => (
                <button
                    key={key}
                    type="button"
                    onClick={onClick}
                    className={`stagger-item ${orderClass} w-full min-h-[64px] md:min-h-[76px] lg:min-h-[92px] group relative overflow-hidden rounded-xl p-3 md:p-4 lg:px-6 flex items-center justify-between gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
                    style={{ animationDelay: `${delay}s`, background, border, boxShadow }}
                >
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-2 md:gap-4 min-w-0">
                        <span className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-black/20 flex items-center justify-center text-white shrink-0">
                            <Icon size={20} />
                        </span>
                        <span className="flex flex-col items-start text-start min-w-0">
                            <span className="text-sm md:text-lg lg:text-xl font-bold text-white leading-tight">{title}</span>
                            <span className="text-[11px] md:text-xs lg:text-sm text-white/80 leading-snug mt-0.5">{desc}</span>
                        </span>
                    </span>
                    <ArrowIcon size={18} className="relative text-white/80 group-hover:text-white transition-colors shrink-0" />
                </button>
            ))}
        </div>
    );
};
