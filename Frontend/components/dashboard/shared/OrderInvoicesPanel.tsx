import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { invoicesApi } from './../../../services/api/invoices';
import { useLanguage } from './../../../contexts/LanguageContext';
import { useNotificationStore } from './../../../stores/useNotificationStore';
import {
    Receipt, Printer, Download, ShieldAlert,
    X, FileText, ChevronDown, ChevronUp,
    Package, Store, Truck, ShieldCheck,
    Calendar, Hash, MapPin, Phone, Mail, User, Car, Info,
    DollarSign, Percent, TrendingUp, CreditCard
} from 'lucide-react';
import { excelApi } from './../../../services/api/excel';
import { GlassCard } from './../../ui/GlassCard';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './../../../services/supabase';


interface OrderInvoicesPanelProps {
    orderId: string;
    role: 'ADMIN' | 'SUPER_ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'VERIFICATION_OFFICER';
    initialData?: any[];
    highlightOfferId?: string;
}

/* ─────────────── PRINT CSS ─────────────── */
const PrintStyles = () => (
    <style>{`
        @media print {
            html, body {
                background-color: white !important;
                height: 100% !important;
            }
            @page {
                size: A4 portrait;
                margin: 0 !important;
            }
            html { height: auto !important; }
            body { height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
            body * {
                visibility: hidden !important;
            }
            #special-invoice-print-container,
            #special-invoice-print-container * {
                visibility: visible !important;
            }
            #special-invoice-print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 15mm !important;
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            .inv-section {
                background: white !important;
                border: 1px solid #ccc !important;
                border-radius: 6px !important;
                padding: 16px !important;
                margin-bottom: 12px !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
            .inv-section-header { border-bottom: 1px solid #eee !important; margin-bottom: 12px !important; padding-bottom: 8px !important; }
            .inv-section-header h3 { color: #b8860b !important; font-size: 14px !important; font-weight: bold !important; margin: 0 !important; }
            .inv-section-header svg { color: #b8860b !important; }
            
            .inv-value { color: #000 !important; font-weight: 600 !important; font-size: 13px !important; }
            .inv-label { color: #666 !important; font-size: 12px !important; }
            .inv-icon { color: #b8860b !important; }

            .inv-total-box {
                background: white !important;
                border: 2px solid #b8860b !important;
                break-inside: avoid !important;
                padding: 16px !important;
                margin-top: 12px !important;
                margin-bottom: 12px !important;
                border-radius: 8px !important;
                box-shadow: none !important;
            }
            .inv-total-box span, .inv-total-box p { color: black !important; opacity: 1 !important; }
            .inv-total-amount { color: #b8860b !important; font-weight: 900 !important; }
            .inv-policy-body { display: block !important; }
            .inv-policy-chevron { display: none !important; }
            .inv-screen-img { display: none !important; }
            .inv-print-qr { display: flex !important; flex-direction: column !important; align-items: center !important; }
            .inv-footer { break-inside: avoid !important; border-top: 1px solid #eee !important; padding-top: 20px !important; margin-top: 20px !important; text-align: center !important; }
            .no-print { display: none !important; }
        }
    `}</style>
);

export const OrderInvoicesPanel: React.FC<OrderInvoicesPanelProps> = ({
    orderId,
    role,
    initialData,
    highlightOfferId,
}) => {
    const { t, language } = useLanguage();
    const isAr = language === 'ar';
    const isRTL = isAr;
    const addNotification = useNotificationStore(s => s.addNotification);
    const [invoices, setInvoices] = useState<any[]>(initialData && initialData.length > 0 ? initialData : []);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
    const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [highlightedInvoiceId, setHighlightedInvoiceId] = useState<string | null>(null);
    const invoiceRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const isMerchant = role === 'MERCHANT';
    const isCustomer = role === 'CUSTOMER';

    const isSystemAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const fetchInvoices = async () => {
        try {
            const res = await invoicesApi.getOrderInvoices(orderId);
            setInvoices(res || []);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch order invoices:', err);
            setError(err.response?.data?.message || 'Failed to load invoices');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Always fetch fresh data from backend to ensure accuracy.
        // initialData is only used as an optimistic pre-fill.
        fetchInvoices();

        // Subscribe to real-time invoice updates
        const channel = supabase
            .channel(`invoices:order:${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT/UPDATE/DELETE
                    schema: 'public',
                    table: 'invoices',
                    filter: `order_id=eq.${orderId}`
                },
                () => {
                    fetchInvoices();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orderId]);

    useEffect(() => {
        if (!highlightOfferId || isLoading || invoices.length === 0) return;

        const match = invoices.find(
            (inv) =>
                inv.payment?.offerId === highlightOfferId ||
                inv.offerId === highlightOfferId,
        );
        if (!match) return;

        setHighlightedInvoiceId(match.id);
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            next.delete(match.id);
            return next;
        });

        const timer = window.setTimeout(() => {
            const el = invoiceRefs.current[match.id];
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);

        const clearTimer = window.setTimeout(() => setHighlightedInvoiceId(null), 6000);
        return () => {
            window.clearTimeout(timer);
            window.clearTimeout(clearTimer);
        };
    }, [highlightOfferId, invoices, isLoading]);

    const handlePrint = (inv: any) => {
        setActiveInvoice(inv);
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            setActiveInvoice(null);
            addNotification({
                titleAr: 'تمت طباعة الفاتورة',
                titleEn: 'Invoice Printed',
                messageAr: `تم طباعة أو تنزيل الفاتورة ${inv.invoiceNumber} بنجاح.`,
                messageEn: `Invoice ${inv.invoiceNumber} was successfully printed or downloaded.`,
                type: 'SYSTEM',
                recipientRole: role,
                link: '#'
            });
        }, 500);
    };

    const handleExportExcel = async (inv: any) => {
        try {
            setIsExporting(inv.id);
            await excelApi.downloadInvoice(inv.orderId || orderId, inv.invoiceNumber);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setIsExporting(null);
        }
    };

    if (isLoading) {
        return <div className="text-white/50 text-center py-8">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    if (invoices.length === 0) {
        return (
            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                <Receipt size={48} className="mx-auto mb-4 text-white/20" />
                <h3 className="text-xl font-bold text-white mb-2">
                    {isAr ? 'لم يتم العثور على فواتير' : 'No Invoices Found'}
                </h3>
                <p className="text-white/50 max-w-md mx-auto">
                    {isAr ? 'لا توجد فواتير مدفوعة مرتبطة بهذا الطلب بعد.' : 'There are no paid invoices associated with this order yet.'}
                </p>
            </div>
        );
    }

    /* ── helper components ── */
    const ImageCard: React.FC<{ src: string; label: string; printQr?: boolean }> = ({ src, label, printQr }) => (
        <div className="relative group">
            <div className="inv-screen-img">
                <img
                    src={src} alt={label} loading="lazy"
                    className="w-full h-32 sm:h-40 object-cover rounded-lg border border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <p className="text-[10px] text-gray-500 mt-1 text-center truncate">{label}</p>
            </div>
            {printQr && (
                <div className="inv-print-qr" style={{ display: 'none', padding: '8px' }}>
                    <QRCodeSVG value={src} size={80} level="M" />
                    <p style={{ fontSize: '10px', color: '#666', marginTop: '6px', textAlign: 'center' }}>{label}</p>
                </div>
            )}
        </div>
    );

    const InfoRow: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-2 text-xs sm:text-sm">
            <Icon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0 inv-icon" />
            <span className="text-gray-400 shrink-0 inv-label">{label}:</span>
            <span className="text-white font-semibold break-all inv-value">{value || '--'}</span>
        </div>
    );

    const SectionHeader: React.FC<{ icon: any; titleAr: string; titleEn: string }> = ({ icon: Icon, titleAr, titleEn }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10 inv-section-header">
            <Icon className="w-5 h-5 text-gold-500" />
            <h3 className="text-sm font-bold text-gold-500 uppercase tracking-wider">
                {isAr ? titleAr : titleEn}
            </h3>
        </div>
    );
    const termsData = t.legal?.termsContent || [];
    const policySections = [
        termsData.find((s: any) => s.title?.includes('أحكام عامة') || s.title?.includes('General')),
        termsData.find((s: any) => s.title?.includes('الاستبدال') || s.title?.includes('Return') || s.title?.includes('الإرجاع')),
        termsData.find((s: any) => s.title?.includes('إجراءات الشحن') || s.title?.includes('Return Shipping') || s.title?.includes('شحن')),
        termsData.find((s: any) => s.title?.includes('الضمان') || s.title?.includes('Warranty') || s.title?.includes('الكفالة'))
    ].filter(Boolean);

    const InvoiceContentBlock = ({ inv }: { inv: any }) => {
        const order = inv?.order || {};
        const acceptedOffer = order?.offers?.find((o: any) => o.status === 'accepted' || o.status === 'ACCEPTED');
        const shippingAddr = order?.shippingAddresses?.[0] || null;
        const customer = order?.customer || null;
        const offerStore = acceptedOffer?.store || order?.store || null;

        const invoiceNumber = inv.invoiceNumber || `INV-${order.orderNumber}`;
        const orderNumber = order.orderNumber || '--';
        const offerNumber = acceptedOffer?.offerNumber || '--';

        const rawDate = inv.issuedAt || order.createdAt;
        const invoiceDate = rawDate
            ? `${new Date(rawDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} | ${new Date(rawDate).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
            : '--';

        const rawTotal = Number(inv.total || 0);
        const finalTotal = rawTotal > 0 ? rawTotal : Number(acceptedOffer?.unitPrice || 0);
        const currency = inv.currency || 'AED';

        const subtotal = Number(inv.subtotal || acceptedOffer?.unitPrice || 0);
        const shipping = Number(inv.shipping || 0);
        const commission = Number(inv.commission || 0);
        const merchantPayout = subtotal; // 2026 Standard: Merchant gets the full part price as profit
        const platformRevenue = commission; // Net profit is the commission added on top

        /* ── translation maps ── */
        const conditionMap: Record<string, string> = {
            'used_clean': 'مستعمل (أصلي)', 'used': 'مستعمل', 'new': 'جديد', 'refurbished': 'مجدد'
        };
        const partTypeMap: Record<string, string> = {
            'normal': 'قطعة عادية', 'commercial': 'تجاري', 'original': 'أصلي', 'aftermarket': 'تجاري (ما بعد البيع)'
        };
        const deliveryDaysMap: Record<string, string> = {
            'd3_5': 'من ٣ إلى ٥ أيام', 'd1_3': 'من ١ إلى ٣ أيام', 'd5_7': 'من ٥ إلى ٧ أيام', 'same_day': 'نفس اليوم'
        };
        const warrantyDurationMap: Record<string, string> = {
            'month1': 'شهر واحد', 'month3': '٣ أشهر', 'month6': '٦ أشهر',
            'year1': 'سنة واحدة', 'week1': 'أسبوع واحد', 'week2': 'أسبوعان'
        };
        const getMappedValue = (val: string, map: Record<string, string>) => {
            if (!val) return '--';
            return isAr ? (map[val] || val) : val;
        };

        const storeName = offerStore?.name || (isAr ? 'غير محدد' : 'Unknown');
        const storeCode = offerStore?.storeCode || offerStore?.id?.slice(0, 8) || '';
        const storeLogo = offerStore?.logo || null;
        const offerImage = acceptedOffer?.offerImage || null;
        const offerCondition = getMappedValue(acceptedOffer?.condition, conditionMap) || (isAr ? 'غير محدد' : 'N/A');
        const offerPartType = getMappedValue(acceptedOffer?.partType, partTypeMap);
        const offerWarranty = acceptedOffer?.hasWarranty;
        const offerWarrantyDuration = getMappedValue(acceptedOffer?.warrantyDuration, warrantyDurationMap);
        const offerDeliveryDays = getMappedValue(acceptedOffer?.deliveryDays, deliveryDaysMap);
        const offerNotes = acceptedOffer?.notes || '';
        const offerWeight = acceptedOffer?.weightKg || '--';

        const customerName = customer?.name || shippingAddr?.fullName || (isAr ? 'عميل' : 'Customer');
        const partName = order.partName || (isAr ? 'قطعة غيار' : 'Spare Part');
        const partDesc = order.partDescription || '';
        const partImages: string[] = (() => {
            const imgs = order.partImages;
            if (Array.isArray(imgs)) return imgs;
            if (typeof imgs === 'string') { try { return JSON.parse(imgs); } catch { return []; } }
            return [];
        })();
        const vehicleMake = order.vehicleMake || order.vehicle?.make || '';
        const vehicleModel = order.vehicleModel || order.vehicle?.model || '';
        const vehicleYear = order.vehicleYear || order.vehicle?.year || '';
        const vin = order.vin || order.vehicle?.vin || '';
        const conditionPref = order.conditionPref || order.preferences?.condition || '';
        const requestType = order.requestType || (order.parts?.length > 1 ? 'multiple' : 'single') || '';

        const qrValue = `https://e-tashleh.net/invoice/${inv.invoiceId || inv.id}`;

        return (
            <div dir={isRTL ? 'rtl' : 'ltr'}>
                {/* ═══ PRINT LOGO HEADER ═══ */}
                <div className="hidden print:flex justify-between items-center border-b-2 border-[#b8860b] pb-6 mb-8 inv-section" style={{ border: 'none !important', background: 'transparent !important' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-xl border-2 border-gold-500 flex items-center justify-center p-2 isolate">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-[#b8860b] uppercase tracking-wider mb-1">E-Tashleh</h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[20px] font-black text-gray-800 uppercase tracking-widest inv-value mb-1">
                            {isMerchant
                                ? (isAr ? 'بيان مستحقات التاجر' : 'MERCHANT ENTITLEMENT STATEMENT')
                                : (isAr ? 'فاتورة ضريبية' : 'TAX INVOICE')}
                        </p>
                        {!isMerchant && <p className="text-gray-500 font-mono text-sm inv-label">TRN: 10045678900003</p>}
                    </div>
                </div>

                {/* ═══ SECTION 1: HEADER ═══ */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 pb-6 border-b border-white/10 inv-section">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white inv-value mb-1">E-Tashleh.net</h1>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider inv-label">{isAr ? 'سوق قطع غيار السيارات' : 'Automotive Marketplace'}</p>
                        <div className="mt-4 space-y-2 text-xs sm:text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                                <span className="inv-label">{isAr ? 'رقم الفاتورة' : 'Invoice #'}:</span>
                                <span className="font-mono font-bold text-white inv-value">{invoiceNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                                <span className="inv-label">{isAr ? 'رقم الطلب' : 'Order #'}:</span>
                                <span className="font-mono font-bold text-white inv-value">{orderNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                                <span className="inv-label">{isAr ? 'رقم العرض' : 'Offer #'}:</span>
                                <span className="font-mono font-bold text-white inv-value">{offerNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gold-500 inv-icon" />
                                <span className="inv-label">{isAr ? 'تاريخ الإصدار' : 'Issue Date'}:</span>
                                <span className="font-medium text-white inv-value">{invoiceDate}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10 shrink-0">
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <QRCodeSVG value={qrValue} size={100} level="M" includeMargin={false} />
                        </div>
                        <p className="text-[11px] font-medium text-gray-400 mt-2 text-center max-w-[120px] inv-label">
                            {isAr ? 'امسح للتحقق من الفاتورة الرقمية' : 'Scan to view digital invoice'}
                        </p>
                    </div>
                </div>

                {/* ═══ SECTION 2: SENDER / RECEIVER ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
                    <div className="bg-white/5 rounded-xl p-5 border border-white/5 inv-section">
                        <SectionHeader icon={Store} titleAr="بيانات المصدر (التاجر)" titleEn="Issuer (Merchant)" />
                        <div className="flex items-start gap-4 mt-4">
                            {storeLogo ? (
                                <img src={storeLogo} alt={storeName} className="w-12 h-12 rounded-xl object-cover border-2 border-gold-500/30" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-gold-500/10 border-2 border-gold-500/30 flex items-center justify-center shrink-0">
                                    <Store className="w-6 h-6 text-gold-500 inv-icon" />
                                </div>
                            )}
                            <div className="space-y-1.5 text-xs sm:text-sm text-gray-300 min-w-0">
                                <p className="font-bold text-white text-base truncate inv-value">{storeName}</p>
                                {storeCode && <p className="text-gray-400 font-mono text-xs inv-label">ID: #{storeCode}</p>}
                                <p className="text-gray-500 text-[11px] inv-label">E-Tashleh Verified Merchant</p>
                                <p className="text-gray-500 text-[11px] inv-label mt-1">support@e-tashleh.net</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-5 border border-white/5 inv-section">
                        <SectionHeader icon={User} titleAr="بيانات العميل (المستلم)" titleEn="Customer (Receiver)" />
                        <div className="space-y-2 text-xs sm:text-sm text-gray-300 mt-4">
                            <p className="font-bold text-white text-base inv-value mb-2">
                                {isMerchant ? (isAr ? 'عميل منصة إي-تشليح' : 'E-Tashleh Customer') : customerName}
                            </p>
                            {!isMerchant && (
                                <>
                                    {customer?.email && <InfoRow icon={Mail} label={isAr ? 'البريد' : 'Email'} value={customer.email} />}
                                    {customer?.phone && <InfoRow icon={Phone} label={isAr ? 'الهاتف' : 'Phone'} value={`${customer.countryCode || ''} ${customer.phone}`} />}
                                </>
                            )}
                            {(vehicleMake || vehicleModel) && (
                                <InfoRow icon={Car} label={isAr ? 'السيارة' : 'Vehicle'} value={`${vehicleMake} ${vehicleModel} ${vehicleYear}`} />
                            )}
                            {vin && <InfoRow icon={Hash} label="رقم الهيكل (VIN)" value={vin} />}
                        </div>
                    </div>
                </div>

                {/* ═══ SECTION 3: SHIPPING ═══ */}
                {!isMerchant && (
                    <div className="bg-white/5 rounded-xl p-5 border border-white/5 mt-6 inv-section">
                        <SectionHeader icon={Truck} titleAr="عنوان التوصيل السريع" titleEn="Express Shipping Address" />
                        {shippingAddr ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-black/20 p-4 rounded-lg border border-white/5">
                                <InfoRow icon={User} label={isAr ? 'المستلم' : 'Receiver'} value={shippingAddr.fullName || '--'} />
                                <InfoRow icon={Phone} label={isAr ? 'رقم التواصل' : 'Contact Number'} value={shippingAddr.phone || '--'} />
                                {shippingAddr.email && <InfoRow icon={Mail} label={isAr ? 'البريد البديل' : 'Alt Email'} value={shippingAddr.email} />}
                                <InfoRow icon={MapPin} label={isAr ? 'المدينة' : 'City'} value={shippingAddr.city || '--'} />
                                <InfoRow icon={MapPin} label={isAr ? 'الدولة' : 'Country'} value={shippingAddr.country || '--'} />
                                <InfoRow icon={MapPin} label={isAr ? 'العنوان التفصيلي' : 'Detailed Address'} value={shippingAddr.details || '--'} />
                            </div>
                        ) : (
                            <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                                <p className="text-sm font-medium text-gray-400 italic text-center inv-label">{isAr ? 'لا يوجد عنوان شحن مسجل لهذا الطلب' : 'No shipping address registered for this order'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ SECTION 4: CUSTOMER ORDER ═══ */}
                <div className="bg-white/5 rounded-xl p-5 border border-white/5 mt-6 inv-section">
                    <SectionHeader icon={Package} titleAr="مواصفات الطلب الأساسية" titleEn="Primary Order Specifications" />
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={Package} label={isAr ? 'اسم القطعة المطلوبة' : 'Requested Part Name'} value={partName} />
                            {partDesc && <InfoRow icon={Info} label={isAr ? 'وصف دقيق للمشكلة/القطعة' : 'Detailed Description'} value={partDesc} />}
                            {conditionPref && <InfoRow icon={ShieldCheck} label={isAr ? 'شريطة الحالة' : 'Condition Preference'} value={conditionPref} />}
                            {requestType && <InfoRow icon={Info} label={isAr ? 'نوع التسعير المطلوب' : 'Request Format'} value={requestType === 'multiple' ? (isAr ? 'طلب تجميعة قطع' : 'Multiple Parts Assembly') : (isAr ? 'قطعة مفردة' : 'Single Part')} />}
                        </div>
                        {partImages.length > 0 && (
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold inv-label">
                                    {isAr ? 'المرفقات البصرية (من العميل)' : 'Visual Attachments (Customer)'}
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {partImages.slice(0, 4).map((img: string, i: number) => (
                                        <ImageCard key={`cust-${i}`} src={img} label={`${isAr ? 'مرفق' : 'Attachment'} 0${i + 1}`} printQr />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ SECTION 5: MERCHANT OFFER & ADMIN OPERATIONS ═══ */}
                <div className="flex flex-col gap-6 mt-6">
                    {/* Merchant Offer Details */}
                    {acceptedOffer ? (
                        <div className="bg-gold-500/5 rounded-xl p-5 border border-gold-500/20 inv-section">
                            <SectionHeader icon={Store} titleAr="تفاصيل العرض المعتمد" titleEn="Approved Offer Details" />
                            <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InfoRow icon={Hash} label={isAr ? 'الرقم المرجعي' : 'Offer Ref #'} value={offerNumber} />
                                    <InfoRow icon={Store} label={isAr ? 'التاجر المعتمد' : 'Merchant'} value={`${storeName}`} />
                                    <InfoRow icon={ShieldCheck} label={isAr ? 'حالة القطعة المقدمة' : 'Condition'} value={offerCondition} />
                                    <InfoRow icon={Package} label={isAr ? 'تصنيف الجودة' : 'Quality Class'} value={offerPartType} />
                                    <InfoRow icon={ShieldCheck} label={isAr ? 'الضمان' : 'Warranty'} value={offerWarranty ? `${isAr ? 'مشمول' : 'Included'} — ${offerWarrantyDuration}` : (isAr ? 'غير مشمول' : 'Not Included')} />
                                    <InfoRow icon={Package} label={isAr ? 'الوزن (كجم)' : 'Weight (kg)'} value={String(offerWeight)} />
                                </div>

                                {offerNotes && (
                                    <div className="bg-gold-500/10 rounded-lg p-4 border border-gold-500/20">
                                        <p className="text-xs font-bold text-gold-500 mb-2 uppercase tracking-wider inv-label">{isAr ? 'ملاحظات التاجر' : 'Merchant Notes'}</p>
                                        <p className="text-sm font-medium text-white leading-relaxed inv-value">{offerNotes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-xl p-5 border border-white/5 flex items-center justify-center inv-section text-gray-500">
                            {isAr ? 'لا يوجد عرض مرتبط (مشتريات منصة)' : 'No Offer (Platform Purchases)'}
                        </div>
                    )}

                    {/* Admin Operations View */}
                    {isSystemAdmin && (
                        <div className="bg-gold-500/5 border border-gold-500/20 rounded-2xl p-5 space-y-4 inv-section">
                            <div className="flex items-center justify-between border-b border-gold-500/10 pb-2">
                                <h4 className="text-[11px] font-black text-gold-500 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={14} />
                                    {isAr ? 'نظرة الإدارة: تحليل العمليات الفني' : 'Admin View: Ops Breakdown'}
                                </h4>
                                <Percent size={14} className="text-gold-500/40" />
                            </div>

                            <div className="divide-y divide-white/5">
                                <div className="flex justify-between py-2 text-xs">
                                    <span className="text-gray-400 flex items-center gap-2 inv-label"><Package size={12} /> {isAr ? 'قيمة القطعة' : 'Part Price'}</span>
                                    <span className="text-white font-mono inv-value">{Math.round(subtotal).toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between py-2 text-xs">
                                    <span className="text-gray-400 flex items-center gap-2 inv-label"><TrendingUp size={12} /> {isAr ? 'عمولة المنصة المقتطعة' : 'Platform Commission Taken'}</span>
                                    <span className="text-green-400 font-mono inv-value">+{Math.round(commission).toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between py-2 text-xs">
                                    <span className="text-gray-400 flex items-center gap-2 inv-label"><Truck size={12} /> {isAr ? 'صافي إيراد الشحن' : 'Net Shipping Revenue'}</span>
                                    <span className="text-green-400 font-mono inv-value">+{Math.round(shipping).toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between py-3 text-sm font-bold border-t border-gold-500/20 mt-2">
                                    <span className="text-gold-500 flex items-center gap-2 inv-label"><CreditCard size={14} /> {isAr ? 'تحويل مستحقات التاجر' : 'Merchant Payout Amount'}</span>
                                    <span className="text-red-400 font-mono inv-value">-{Math.round(merchantPayout).toLocaleString()} AED</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center shadow-lg">
                                    <span className="text-[10px] font-bold text-green-400 uppercase inv-label">{isAr ? 'إجمالي ربح المنصة الصافي' : 'Total Platform Net Profit'}</span>
                                    <span className="text-base font-black text-green-400 font-mono inv-value inv-total-amount">{Math.round(platformRevenue).toLocaleString()} AED</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ SECTION 6: FINAL TOTAL ═══ */}
                <div
                    className={`bg-gradient-to-r from-gold-500/20 to-black/40 rounded-xl p-6 sm:p-8 border-2 border-gold-500 mt-8 shadow-[0_0_30px_rgba(184,134,11,0.15)] inv-total-box flex flex-col sm:flex-row items-center gap-6 ${
                        isCustomer ? 'justify-center' : 'justify-between'
                    }`}
                >
                    {!isCustomer && (
                    <div className="w-full sm:w-1/2 space-y-3">
                        {isMerchant ? (
                            <div className="flex justify-between text-base font-bold text-gold-500 uppercase tracking-widest pt-2">
                                <span>{isAr ? 'مستحقات التاجر النهائية' : 'Final Merchant Entitlement'}</span>
                                <span className="font-mono">{Math.round(merchantPayout).toLocaleString()} AED</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                                    <span>{isAr ? 'قيمة القطعة' : 'Part Price'}</span>
                                    <span className="font-mono text-white">{subtotal.toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                                    <span>{isAr ? 'الشحن والتوصيل' : 'Shipping'}</span>
                                    <span className="font-mono text-white">{shipping.toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                                    <span>{isAr ? 'رسوم الخدمة والقيمة المضافة' : 'Service Fees & VAT'}</span>
                                    <span className="font-mono text-white">{commission.toLocaleString()} AED</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-green-500 uppercase font-bold tracking-widest border-t border-white/5 pt-2">
                                    <span>{isAr ? 'مستحقات التاجر' : 'Merchant Dues'}</span>
                                    <span className="font-mono">{Math.round(merchantPayout).toLocaleString()} AED</span>
                                </div>
                            </>
                        )}
                    </div>
                    )}

                    <div
                        className={`w-full text-center bg-black/40 px-6 py-4 rounded-xl border border-gold-500/30 ${
                            isCustomer ? 'max-w-md' : 'sm:w-auto sm:text-right min-w-[200px]'
                        }`}
                    >
                        <p className="text-[10px] font-black text-gold-500 uppercase tracking-widest mb-1">
                            {isMerchant ? (isAr ? 'صافي أرباح التاجر' : 'Net Merchant Earnings') : (isAr ? 'الإجمالي النهائي للعملية' : 'Final Invoice Amount')}
                        </p>
                        <p className="text-4xl sm:text-5xl font-black text-gold-500 font-mono tracking-tight shadow-gold-500 drop-shadow-md inv-total-amount">
                            {Math.round(isMerchant ? merchantPayout : finalTotal).toLocaleString()}
                            <span className="text-xl sm:text-2xl font-bold ms-2 text-gold-400">{currency}</span>
                        </p>
                    </div>
                </div>

                {/* ═══ SECTION 7: POLICIES ═══ */}
                <div className="mt-8 print:hidden">
                    <SectionHeader icon={ShieldCheck} titleAr="وثيقة الشروط والسياسات المعتمدة" titleEn="Approved Terms & Policies Document" />
                    <div className="space-y-3 mt-4">
                        {policySections.map((section: any, idx: number) => {
                            const sKey = `policy-${idx}`;
                            const isExpanded = expandedPolicy === sKey;
                            const content = Array.isArray(section.content) ? section.content : [section.content];

                            return (
                                <div key={sKey} className="bg-white/5 rounded-xl overflow-hidden border border-white/10 inv-section">
                                    <button
                                        onClick={() => setExpandedPolicy(isExpanded ? null : sKey)}
                                        className={`w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                                    >
                                        <span className={`text-sm font-black uppercase tracking-wide ${isExpanded ? 'text-gold-500' : 'text-gray-300'} inv-value`}>
                                            {section.title}
                                        </span>
                                        <span className="inv-policy-chevron">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gold-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                        </span>
                                    </button>
                                    <div className={`${isExpanded ? 'block' : 'hidden'} inv-policy-body p-4 pt-0 border-t border-white/10 mt-2`}>
                                        <ul className={`space-y-3 ${isRTL ? 'pr-2' : 'pl-2'}`}>
                                            {content.map((line: string, i: number) => (
                                                <li key={i} className="flex items-start gap-3 text-xs text-gray-400 inv-label leading-relaxed">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(184,134,11,0.6)]" />
                                                    <span className="flex-1 font-medium">{line.replace(/^•\s*/, '')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ SECTION 8: FOOTER ═══ */}
                <div className="text-center pt-8 mt-12 border-t-2 border-white/10 inv-footer">
                    <div className="inline-block bg-white p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-4 border-gold-500 mb-4 transform hover:scale-105 transition-transform duration-300">
                        <QRCodeSVG value={qrValue} size={120} level="H" includeMargin={false} />
                    </div>
                    <p className="text-[11px] font-bold text-gold-500 mb-4 inv-label uppercase tracking-widest">
                        {isAr ? '>> تفضل بمسح الكود للتحقق الأصلي من السجلات <<' : '>> SCAN CODE FOR NATIVE RECORD VERIFICATION <<'}
                    </p>
                    <p className="hidden print:block text-[10px] text-gray-500 mb-4 font-medium inv-label">
                        {isAr
                            ? '(لمراجعة وثيقة الشروط والأحكام وسياسات الإرجاع والشحن كاملة، يرجى مسح الـ QR Code أعلاه)'
                            : '(To review the full Terms, Conditions, Return & Shipping policies, please scan the QR Code above)'}
                    </p>
                    <div className="space-y-1.5 text-xs text-gray-500">
                        <p className="inv-label font-bold text-gray-400">{isAr ? 'شكراً لثقتكم واختياركم منصة E-Tashleh.net' : 'Thank you for trusting and choosing E-Tashleh.net'}</p>
                        <p className="inv-label">{isAr ? 'هذه وثيقة إلكترونية موثقة وصادرة من النظام الآلي لا تحتاج لختم تقليدي' : 'This is a verified electronic document generated by the automated system, no physical stamp required'}</p>
                        <div className="mt-4 pt-4 border-t border-white/5 inline-block">
                            <p className="text-gray-600 font-mono text-[10px] inv-label tracking-widest">
                                ELLIPP FZ LLC | {isAr ? 'رخصة تجارية:' : 'L/N:'} 45000927 | {isAr ? 'سجل تجاري:' : 'CR:'} 0000004036902
                            </p>
                            <p className="text-gray-700 font-mono text-[9px] mt-1 inv-label">Generated: {new Date().toUTCString()} | System Reference: {order?.id?.slice(0, 8) || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Screen content: hidden entirely when printing to prevent blank pages */}
            {!isPrinting && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
                            <ShieldAlert size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid gap-8">
                        {invoices.map((inv) => (
                            <GlassCard
                                key={inv.id}
                                ref={(el) => { invoiceRefs.current[inv.id] = el; }}
                                className={`p-0 overflow-hidden relative border-white/10 group transition-all duration-500 ${
                                    highlightedInvoiceId === inv.id
                                        ? 'ring-2 ring-gold-500/80 shadow-[0_0_24px_rgba(212,175,55,0.25)]'
                                        : ''
                                }`}
                            >
                                {/* Action Header */}
                                <div className="p-4 border-b border-white/10 bg-[#111] flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                                            <Receipt className="text-amber-500 w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white tracking-tight">
                                                {isAr ? `فاتورة رقم ${inv.invoiceNumber}` : `Invoice #${inv.invoiceNumber}`}
                                            </h3>
                                            <p className="text-[10px] text-white/30 font-mono">ID: {inv.id.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleExportExcel(inv)}
                                            disabled={isExporting === inv.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-all border border-white/10 disabled:opacity-50 text-xs"
                                        >
                                            {isExporting === inv.id ? (
                                                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : <Download size={14} />}
                                            <span>{isAr ? 'تصدير Excel' : 'Excel'}</span>
                                        </button>
                                        <button
                                            onClick={() => handlePrint(inv)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg transition-all shadow-lg text-xs"
                                        >
                                            <Printer size={14} />
                                            <span>{isAr ? 'طباعة / PDF' : 'Print / PDF'}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleCollapse(inv.id)}
                                            className="p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-all border border-white/10"
                                        >
                                            {collapsedIds.has(inv.id) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Invoice Visual Content */}
                                {!collapsedIds.has(inv.id) && (
                                    <div className="p-6 md:p-10 bg-[#0d0d0d] relative overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                                        {/* Watermark Background */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none w-full flex justify-center">
                                            <img src="/logo.png" alt="" className="w-1/2 h-auto max-w-sm" />
                                        </div>

                                        <InvoiceContentBlock inv={inv} />
                                    </div>
                                )}
                            </GlassCard>
                        ))}
                    </div>
                </div>
            )}

            {/* Dedicated print structure: Portaled to body to escape Admin Dashboard overflow clipping */}
            {isPrinting && activeInvoice && typeof document !== 'undefined' && createPortal(
                <>
                    <PrintStyles />
                    <div id="special-invoice-print-container" dir={isRTL ? 'rtl' : 'ltr'}>
                        <InvoiceContentBlock inv={activeInvoice} />
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
