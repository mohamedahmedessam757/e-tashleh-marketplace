import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Clock, User, Phone, Mail, Box, Loader2, ShieldAlert } from 'lucide-react';
import { ordersApi } from '../../../services/api/orders';
import { AdminSearchInput } from './AdminSearchInput';
import { CountdownTimer } from '../shipping-cart/CountdownTimer';
import { AssemblyCartAutoShipNote } from '../shipping-cart/AssemblyCartAutoShipNote';
import { AssemblyCartPartCard } from '../shipping-cart/AssemblyCartPartCard';

export const AdminShippingCarts: React.FC = () => {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const [carts, setCarts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchCarts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await ordersApi.getAdminShippingCarts(
                search.trim() ? { search: search.trim() } : undefined,
            );
            const cartArray = Object.values(data || {});
            setCarts(cartArray);
        } catch (err: any) {
            console.error('Failed to fetch shipping carts', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [search]);

    useEffect(() => {
        void fetchCarts();
    }, [fetchCarts]);

    const header = (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Box className="text-gold-500" />
                    {isAr ? 'سلال التجميع والشحن' : 'Assembly & Shipping Carts'}
                </h2>
                <p className="text-white/40 text-sm mt-1">
                    {isAr
                        ? 'نفس مؤقت العميل لكل قطعة — مراقبة الطلبات التي تنتظر التجميع قبل الشحن.'
                        : 'Same per-part timer as the customer — monitor carts awaiting consolidation before shipping.'}
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <AdminSearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder={
                        isAr
                            ? 'بحث بالعميل، الهاتف، البريد، أو رقم الطلب...'
                            : 'Search customer, phone, email, or order...'
                    }
                    className="w-full sm:w-72"
                />
                {!isLoading && !error && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-gold-500/10 border border-gold-500/20 rounded-xl shrink-0">
                        <span className="text-gold-500 font-bold">{carts.length}</span>
                        <span className="text-[10px] text-gold-500/60 uppercase font-bold tracking-wider">
                            {isAr ? 'سلة نشطة' : 'Active Carts'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                {header}
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">
                        {isAr ? 'جاري فحص سلال التجميع...' : 'Scanning Assembly Carts...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                {header}
                <div className="flex flex-col items-center justify-center py-40 text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                        <ShieldAlert size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{isAr ? 'خطأ في التحميل' : 'Loading Error'}</h3>
                    <p className="text-white/40 max-w-sm mb-6">
                        {isAr
                            ? 'تعذر جلب بيانات سلال التجميع حالياً. يرجى التأكد من اتصال قاعدة البيانات.'
                            : 'Could not fetch assembly cart data. Please check database connection.'}
                    </p>
                    <button
                        onClick={() => void fetchCarts()}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all"
                    >
                        {isAr ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                </div>
            </div>
        );
    }

    if (carts.length === 0) {
        return (
            <div className="space-y-6">
                {header}
                <AssemblyCartAutoShipNote />
                <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
                    <div className="relative mb-8">
                        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 relative z-10">
                            <Box size={48} className="text-white/10" />
                        </div>
                        <div className="absolute inset-0 bg-gold-500/5 blur-3xl rounded-full" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">
                        {search.trim()
                            ? isAr
                                ? 'لا توجد نتائج مطابقة'
                                : 'No matching carts'
                            : isAr
                              ? 'لا توجد سلال تجميع نشطة'
                              : 'No Active Assembly Carts'}
                    </h3>
                    <p className="text-white/30 max-w-sm mx-auto text-sm leading-relaxed font-medium">
                        {search.trim()
                            ? isAr
                                ? 'جرّب كلمات بحث مختلفة أو امسح البحث لعرض كل السلال.'
                                : 'Try different search terms or clear the search to see all carts.'
                            : isAr
                              ? 'سيظهر هنا العملاء الذين لديهم طلبات جاهزة للشحن ولكنها تنتظر تجميعها قبل إصدار البوليصة النهائية.'
                              : 'Customers with orders ready for shipping but awaiting consolidation will appear here for batch processing.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {header}
            <AssemblyCartAutoShipNote />

            <div className="grid grid-cols-1 gap-6">
                {carts.map((cart: any, idx: number) => {
                    const nearestExpiry = cart.nearestExpiry
                        ? new Date(cart.nearestExpiry)
                        : null;
                    const readyCount = (cart.offers || []).filter(
                        (o: any) => o.canSelectForShipping,
                    ).length;
                    return (
                    <motion.div
                        key={cart.customerId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <GlassCard className="overflow-hidden border-white/5 bg-[#1A1814] hover:border-gold-500/20 transition-all duration-500">
                            <div className="p-6">
                                <div className="flex flex-wrap items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/20 to-transparent border border-gold-500/20 flex items-center justify-center shrink-0">
                                            <User size={28} className="text-gold-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{cart.customerName}</h3>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="flex items-center gap-2 text-xs text-white/40">
                                                    <Phone size={12} />
                                                    <span>{cart.customerPhone || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white/40">
                                                    <Mail size={12} />
                                                    <span>{cart.customerEmail || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 flex-wrap">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-white">{cart.totalItems}</div>
                                            <div className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">{isAr ? 'في السلة' : 'Total Items'}</div>
                                        </div>
                                        <div className="w-px h-10 bg-white/5 hidden sm:block" />
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-400">{readyCount}</div>
                                            <div className="text-[10px] text-green-400/40 uppercase font-bold tracking-tighter">{isAr ? 'جاهز للشحن' : 'Ready'}</div>
                                        </div>
                                        <div className="w-px h-10 bg-white/5 hidden sm:block" />
                                        <div className="text-center min-w-[140px]">
                                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">
                                                {t.dashboard.shippingCart.daysRemaining}
                                            </p>
                                            {nearestExpiry ? (
                                                <CountdownTimer targetDate={nearestExpiry} />
                                            ) : (
                                                <span className="text-white/30 text-xs">—</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-wrap">
                                         {nearestExpiry && nearestExpiry.getTime() - Date.now() <= 2 * 24 * 60 * 60 * 1000 && (
                                             <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase animate-pulse flex items-center gap-2">
                                                 <Clock size={12} />
                                                 {isAr ? 'اقتراب انتهاء المهلة' : 'Expiring soon'}
                                             </div>
                                         )}
                                         <button 
                                            onClick={async () => {
                                                 const readyIds = (cart.offers || [])
                                                     .filter((o: any) => o.canSelectForShipping && !o.shippedFromCart)
                                                     .map((o: any) => o.offerId || o.id);
                                                 if (readyIds.length === 0) {
                                                     alert(isAr
                                                         ? 'لا توجد قطع جاهزة للشحن (READY_FOR_SHIPPING) في هذه السلة.'
                                                         : 'No READY_FOR_SHIPPING parts in this cart.');
                                                     return;
                                                 }
                                                 if (confirm(isAr
                                                     ? `شحن ${readyIds.length} قطعة جاهزة الآن؟`
                                                     : `Ship ${readyIds.length} ready part(s) now?`)) {
                                                     await ordersApi.requestShipping(undefined, readyIds, cart.customerId);
                                                     void fetchCarts();
                                                 }
                                            }}
                                            className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20 transition-all"
                                         >
                                            {isAr ? 'شحن الجاهز' : 'Ship ready'}
                                         </button>
                                         <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path: 'customer-profile', id: cart.customerId } }))}
                                            className="px-6 py-2.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 text-sm font-bold border border-gold-500/20 transition-all whitespace-nowrap"
                                         >
                                            {isAr ? 'عرض الملف' : 'View Profile'}
                                         </button>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 pb-6 pt-4 border-t border-white/5 bg-black/20">
                                <h4 className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-3">
                                    {isAr ? 'محتويات السلة (نفس بيانات العميل + الأطراف)' : 'Cart contents (same as customer + parties)'}
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {(cart.offers || []).map((offer: any) => (
                                        <AssemblyCartPartCard
                                            key={offer.id || offer.offerId}
                                            showAdminParties
                                            item={{
                                                id: offer.orderId || offer.id,
                                                offerId: offer.offerId || offer.id,
                                                orderNumber: offer.orderNumber,
                                                name: offer.name || offer.partName,
                                                price: Number(offer.price || 0),
                                                shippingCost: Number(offer.shippingCost || 0),
                                                hasWarranty: !!offer.hasWarranty,
                                                warrantyDuration: offer.warrantyDuration,
                                                condition: offer.condition,
                                                partType: offer.partType,
                                                partImage: offer.partImage || null,
                                                expiryDate: offer.expiryDate,
                                                paidAt: offer.paidAt,
                                                storeName: offer.storeName || 'Merchant',
                                                vehicleMake: offer.vehicleMake,
                                                vehicleModel: offer.vehicleModel,
                                                vehicleYear: offer.vehicleYear,
                                                vin: offer.vin || null,
                                                partsCount: 1,
                                                requestType: offer.requestType || 'multiple',
                                                shippingType: offer.shippingType || 'combined',
                                                totalPaid: Number(offer.totalPaid || offer.price || 0),
                                                shippingAddress: offer.shippingAddress || null,
                                                fulfillmentStatus: offer.fulfillmentStatus,
                                                canSelectForShipping: offer.canSelectForShipping,
                                                handoverPending: offer.handoverPending,
                                                lockReasonAr: offer.lockReasonAr,
                                                lockReasonEn: offer.lockReasonEn,
                                                customerName: offer.customerName || cart.customerName,
                                                customerPhone: offer.customerPhone || cart.customerPhone,
                                                customerEmail: offer.customerEmail || cart.customerEmail,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
