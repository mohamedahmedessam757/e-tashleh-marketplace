import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Truck, Clock, User, Phone, Mail, ChevronRight, Box, Loader2, ShieldAlert } from 'lucide-react';
import { ordersApi } from '../../../services/api/orders';
import { CartShipmentBadge } from '../shared/CartShipmentBadge';

export const AdminShippingCarts: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [carts, setCarts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCarts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await ordersApi.getAdminShippingCarts();
                const cartArray = Object.values(data || {});
                setCarts(cartArray);
            } catch (err: any) {
                console.error("Failed to fetch shipping carts", err);
                setError(err.message || "Failed to load data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCarts();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">
                    {isAr ? 'جاري فحص سلال التجميع...' : 'Scanning Assembly Carts...'}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert size={40} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{isAr ? 'خطأ في التحميل' : 'Loading Error'}</h3>
                <p className="text-white/40 max-w-sm mb-6">{isAr ? 'تعذر جلب بيانات سلال التجميع حالياً. يرجى التأكد من اتصال قاعدة البيانات.' : 'Could not fetch assembly cart data. Please check database connection.'}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all"
                >
                    {isAr ? 'إعادة المحاولة' : 'Try Again'}
                </button>
            </div>
        );
    }

    if (carts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
                <div className="relative mb-8">
                    <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 relative z-10">
                        <Box size={48} className="text-white/10 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="absolute inset-0 bg-gold-500/5 blur-3xl rounded-full" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">
                    {isAr ? 'لا توجد سلال تجميع نشطة' : 'No Active Assembly Carts'}
                </h3>
                <p className="text-white/30 max-w-sm mx-auto text-sm leading-relaxed font-medium">
                    {isAr 
                        ? 'سيظهر هنا العملاء الذين لديهم طلبات جاهزة للشحن ولكنها تنتظر تجميعها قبل إصدار البوليصة النهائية.' 
                        : 'Customers with orders ready for shipping but awaiting consolidation will appear here for batch processing.'}
                </p>
                <div className="mt-10 flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                        {isAr ? 'نظام المراقبة اللحظي نشط' : 'Real-time Monitoring Active'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Box className="text-gold-500" />
                        {isAr ? 'سلال التجميع والشحن' : 'Assembly & Shipping Carts'}
                    </h2>
                    <p className="text-white/40 text-sm mt-1">
                        {isAr ? 'إدارة ومراقبة الطلبات التي تنتظر تجميعها قبل الشحن النهائي.' : 'Manage and monitor orders awaiting consolidation before final shipping.'}
                    </p>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-gold-500/10 border border-gold-500/20 rounded-xl">
                    <span className="text-gold-500 font-bold">{carts.length}</span>
                    <span className="text-[10px] text-gold-500/60 uppercase font-bold tracking-wider">{isAr ? 'سلة نشطة' : 'Active Carts'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {carts.map((cart: any, idx: number) => (
                    <motion.div
                        key={cart.customerId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <GlassCard className="overflow-hidden border-white/5 bg-[#1A1814] hover:border-gold-500/20 transition-all duration-500">
                            <div className="p-6">
                                <div className="flex flex-wrap items-center justify-between gap-6">
                                    {/* Left: Customer Info */}
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/20 to-transparent border border-gold-500/20 flex items-center justify-center shrink-0">
                                            <User size={28} className="text-gold-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-gold-400 transition-colors">{cart.customerName}</h3>
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

                                    {/* Center: Cart Stats */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-white">{cart.totalItems}</div>
                                            <div className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">{isAr ? 'في السلة' : 'Total Items'}</div>
                                        </div>
                                        <div className="w-px h-10 bg-white/5" />
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-400">
                                                {cart.offers.filter((o: any) => o.shippedFromCart).length}
                                            </div>
                                            <div className="text-[10px] text-blue-400/30 uppercase font-bold tracking-tighter">{isAr ? 'تم شحنه' : 'Shipped'}</div>
                                        </div>
                                        <div className="w-px h-10 bg-white/5" />
                                        <div className="text-center">
                                            <div className="flex items-center gap-1.5 text-gold-500 mb-1">
                                                <Clock size={14} />
                                                <span className="text-lg font-bold">
                                                    {Math.floor((Date.now() - new Date(cart.earliestPayment).getTime()) / (1000 * 60 * 60 * 24))}d
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gold-500/30 uppercase font-bold tracking-tighter">{isAr ? 'عمر السلة' : 'Cart Age'}</div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-3">
                                         {Math.floor((Date.now() - new Date(cart.earliestPayment).getTime()) / (1000 * 60 * 60 * 24)) >= 5 && (
                                             <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase animate-pulse flex items-center gap-2">
                                                 <Clock size={12} />
                                                 {isAr ? 'تجاوز المهلة' : 'Aging Alert'}
                                             </div>
                                         )}
                                         <button 
                                            onClick={async () => {
                                                 if (confirm(isAr ? 'هل أنت متأكد من شحن جميع القطع المتبقية؟' : 'Are you sure you want to force ship all remaining items?')) {
                                                     await ordersApi.requestShipping(undefined, cart.offers.filter((o: any) => !o.shippedFromCart).map((o: any) => o.id), cart.customerId);
                                                     window.location.reload();
                                                 }
                                            }}
                                            className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20 transition-all"
                                         >
                                            {isAr ? 'شحن الكل فوراً' : 'Force Ship All'}
                                         </button>
                                         <button 
                                            onClick={() => window.dispatchEvent(new CustomEvent('admin-nav', { detail: { path: 'customer-profile', id: cart.customerId } }))}
                                            className="px-6 py-2.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 text-sm font-bold border border-gold-500/20 transition-all whitespace-nowrap"
                                         >
                                            {isAr ? 'عرض الملف' : 'View Profile'}
                                         </button>
                                         <button 
                                            className="p-3 rounded-xl bg-white/5 hover:bg-gold-500/20 text-white/40 hover:text-gold-400 transition-all group/btn"
                                         >
                                            <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform rtl:rotate-180" />
                                         </button>
                                    </div>
                                </div>
                            </div>

                            {/* Items Preview */}
                            <div className="px-6 pb-6 pt-4 border-t border-white/5 bg-black/20">
                                <h4 className="text-[10px] text-white/20 font-bold uppercase tracking-widest mb-3">{isAr ? 'محتويات السلة' : 'Cart Contents'}</h4>
                                <div className="flex flex-wrap gap-2">
                                    {cart.offers.map((offer: any) => (
                                        <div key={offer.id} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-white/40 font-mono">#{offer.orderNumber}</span>
                                                <span className="text-xs text-white/80 max-w-[150px] truncate">{offer.partName}</span>
                                            </div>
                                            <CartShipmentBadge
                                                offer={offer}
                                                order={{ requestType: 'multiple', shippingType: 'combined' }}
                                                inAssemblyCart={!offer.shippedFromCart}
                                                isAr={isAr}
                                                className="mt-1"
                                            />
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-white/20 font-bold uppercase">{offer.storeName || 'Merchant'}</span>
                                                <span className="text-[9px] text-gold-500/50">{offer.totalValue || offer.price} AED</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};


