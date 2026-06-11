import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useLoyaltyStore } from '../../../stores/useLoyaltyStore';
import { useLanguage } from '../../../contexts/LanguageContext';
// TierProgressCard removed — displayed exclusively in Wallet page
import { ReferralHubCard } from './ReferralHubCard';
import { ReferralHistoryCard } from './ReferralHistoryCard';
import { supabase } from '../../../services/supabase';
import { getCurrentUserId } from '../../../utils/auth';

/**
 * Loyalty & Referrals Hub for the customer dashboard.
 *
 * Composition:
 *  - TierProgressCard: visual replica of the wallet's loyalty progression bar.
 *  - ReferralHubCard: copy + 6 social share buttons + native share + workflow steps.
 *  - ReferralHistoryCard: per-referee log with countdowns and earnings.
 *
 * Real-time strategy:
 *  - We piggyback two Supabase channels scoped to the current user:
 *      1. `wallet_transactions` INSERT filtered by `user_id` — refetch when a
 *         REFERRAL_PROFIT credit lands (instant earnings update).
 *      2. `users` INSERT filtered by `referred_by_id` — refetch when a new
 *         friend signs up via this user's link (instant new-row appearance).
 *  - The loyalty Socket.IO channel (initialized in fetchLoyaltyData) keeps the
 *    `tier`/`totalSpent`/`balance` numbers fresh without page reload.
 *  - Channels are removed on unmount to avoid memory leaks.
 */
export const RewardsPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const tier = useLoyaltyStore(s => s.tier);
    const totalSpent = useLoyaltyStore(s => s.totalSpent);
    const referralCode = useLoyaltyStore(s => s.referralCode);
    const referralCount = useLoyaltyStore(s => s.referralCount);
    const referralHistory = useLoyaltyStore(s => s.referralHistory);
    const referralTotals = useLoyaltyStore(s => s.referralTotals);
    const referralHistoryLoading = useLoyaltyStore(s => s.referralHistoryLoading);
    const fetchLoyaltyData = useLoyaltyStore(s => s.fetchLoyaltyData);
    const fetchReferralHistory = useLoyaltyStore(s => s.fetchReferralHistory);

    useEffect(() => {
        fetchLoyaltyData();
        fetchReferralHistory();

        const userId = getCurrentUserId();
        if (!userId) return;

        const channel = supabase
            .channel(`rewards-page-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'wallet_transactions',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const tx = payload.new as { transaction_type?: string };
                    if (tx?.transaction_type === 'REFERRAL_PROFIT') {
                        fetchReferralHistory();
                        fetchLoyaltyData();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'users',
                    filter: `referred_by_id=eq.${userId}`,
                },
                () => {
                    fetchReferralHistory();
                    fetchLoyaltyData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-gold-500/10 rounded-2xl border border-gold-500/20 shadow-lg shadow-gold-500/5">
                            <Trophy className="text-gold-500" size={28} />
                        </div>
                        {isAr ? 'مركز الإحالات' : 'Referral Center'}
                    </h1>
                    <p className="text-white/50 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                        {isAr
                            ? 'شارك رابطك الخاص مع أصدقائك واحصل على عمولة 1% من ثمن كل منتج يشتريه صديقك خلال 6 شهور من تاريخ تسجيله.'
                            : 'Share your personal link with friends and earn 1% commission on every item they buy for 6 months from their signup.'}
                    </p>
                </div>
            </div>

            {/* TierProgressCard removed — displayed in Wallet page only */}

            <ReferralHubCard
                referralCode={referralCode}
                referralCount={referralCount}
                activeReferrals={referralTotals.activeCount}
            />

            <ReferralHistoryCard
                history={referralHistory}
                totals={referralTotals}
                loading={referralHistoryLoading}
            />
        </div>
    );
};
