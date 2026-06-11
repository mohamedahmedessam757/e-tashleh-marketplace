
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export const CountdownTimer: React.FC<{ targetDate: Date | string }> = ({ targetDate }) => {
    const { t, language } = useLanguage();
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number }>({ d: 0, h: 0, m: 0, s: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const target = new Date(targetDate);
            const distance = target.getTime() - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
                return;
            }

            setTimeLeft({
                d: Math.floor(distance / (1000 * 60 * 60 * 24)),
                h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((distance % (1000 * 60)) / 1000)
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    const daysText = language === 'ar' ? 'أيام' : 'Days';
    const dayText = language === 'ar' ? 'يوم' : 'Day';

    return (
        <div className="flex items-center gap-2 text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full text-xs font-mono border border-gold-500/20 whitespace-nowrap">
            <Clock size={12} />
            <span>
                {timeLeft.d > 0 && (
                    <span className="mr-1">{timeLeft.d} {timeLeft.d > 2 ? daysText : dayText} و </span>
                )}
                <span dir="ltr">
                    {String(timeLeft.h).padStart(2, '0')}:
                    {String(timeLeft.m).padStart(2, '0')}:
                    {String(timeLeft.s).padStart(2, '0')}
                </span>
            </span>
        </div>
    );
};
