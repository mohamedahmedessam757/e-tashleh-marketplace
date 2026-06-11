
import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { POST_DELIVERY_RETURN_DISPUTE_HOURS } from '../../utils/orderSla';

interface OrderCountdownProps {
    updatedAt: string | Date;
    status: string;
    variant?: 'badge' | 'full';
}

export const OrderCountdown: React.FC<OrderCountdownProps> = ({ updatedAt, status, variant = 'badge' }) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (status !== 'DELIVERED' && status !== 'DELIVERED_TO_CUSTOMER') return;

        const calculateTime = () => {
            const deliveredDate = new Date(updatedAt).getTime();
            const expirationDate =
                deliveredDate + POST_DELIVERY_RETURN_DISPUTE_HOURS * 60 * 60 * 1000;
            const now = new Date().getTime();
            const difference = expirationDate - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft(null);
                return;
            }

            const hours = Math.floor((difference / (1000 * 60 * 60)));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
            setIsExpired(false);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);

        return () => clearInterval(timer);
    }, [updatedAt, status]);

    if (status !== 'DELIVERED' && status !== 'DELIVERED_TO_CUSTOMER') return null;

    if (isExpired) {
        return (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 ${variant === 'full' ? 'w-full justify-center' : ''}`}>
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                    {isAr ? 'انتهت مهلة الإرجاع' : 'Return Window Expired'}
                </span>
            </div>
        );
    }

    if (!timeLeft) return null;

    if (variant === 'full') {
        return (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex flex-col items-center gap-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-400">
                    <Clock size={18} className="animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">
                        {isAr ? 'المتبقي لطلب الإرجاع أو النزاع' : 'Time left to Return or Dispute'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white tracking-tighter">{timeLeft.hours}</span>
                        <span className="text-[8px] text-white/30 uppercase font-bold">{isAr ? 'ساعة' : 'HRS'}</span>
                    </div>
                    <span className="text-2xl font-black text-cyan-500/50">:</span>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white tracking-tighter">{timeLeft.minutes}</span>
                        <span className="text-[8px] text-white/30 uppercase font-bold">{isAr ? 'دقيقة' : 'MIN'}</span>
                    </div>
                    <span className="text-2xl font-black text-cyan-500/50">:</span>
                    <div className="flex flex-col items-center">
                        <span className="text-3xl font-black text-white tracking-tighter">{timeLeft.seconds}</span>
                        <span className="text-[8px] text-white/30 uppercase font-bold">{isAr ? 'ثانية' : 'SEC'}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock size={12} className="animate-pulse" />
            <span className="text-[10px] font-black font-mono">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
        </div>
    );
};
