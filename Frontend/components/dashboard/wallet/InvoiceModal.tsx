import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Printer, FileText, ChevronDown, ChevronUp,
    Package, Store, Truck, ShieldCheck,
    Calendar, Hash, MapPin, Phone, Mail, User, Car, Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { getCurrentUser, mapBackendRoleToFrontend } from '../../../utils/auth';
import { excelApi } from '../../../services/api/excel';
import { Download } from 'lucide-react';

/* ─────────────── types ─────────────── */
interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
}

/* ─────────────── PRINT CSS ─────────────── */
const PrintStyles = () => (
    <style>{`
        /* The nuclear option: When printing, hide the ENTIRE normal React app 
           and ONLY show our special print container which we portal/inject 
           at the very top level. */
        @media print {
            html, body {
                background-color: white !important;
                height: 100% !important;
            }

            @page {
                size: A4 portrait;
                margin: 0 !important; /* Hides browser header/footer URL */
            }

            /* Hide everything by default */
            body * {
                visibility: hidden !important;
            }

            /* Unhide ONLY our dedicated print container and its children */
            #special-invoice-print-container,
            #special-invoice-print-container * {
                visibility: visible !important;
            }

            /* Position the exact print container at the top left of the page */
            #special-invoice-print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 15mm !important; /* Internal spacing instead of @page margin */
                margin: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            /* ── Common Print Styles ── */
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
                background: #fdfbf7 !important;
                border: 2px solid #b8860b !important;
                break-inside: avoid !important;
                padding: 16px !important;
                margin-bottom: 12px !important;
                border-radius: 8px !important;
            }
            .inv-total-amount { color: #b8860b !important; }
            .inv-policy-body { display: block !important; }
            .inv-policy-chevron { display: none !important; }
            .inv-screen-img { display: none !important; }
            .inv-print-qr { display: flex !important; flex-direction: column !important; align-items: center !important; }
            .inv-footer { break-inside: avoid !important; border-top: 1px solid #eee !important; padding-top: 20px !important; margin-top: 20px !important; text-align: center !important; }
        }
    `}</style>
);

/* ─────────────── component ─────────────── */
export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, order }) => {
    const { t, language } = useLanguage();
    const addNotification = useNotificationStore(s => s.addNotification);
    const isRTL = language === 'ar';
    const printRef = useRef<HTMLDivElement>(null);
    const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

    // Track if we are currently printing so we can mount the portal
    const [isPrinting, setIsPrinting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const user = getCurrentUser();
    const userRole = mapBackendRoleToFrontend(user?.role);
    const isMerchant = userRole === 'merchant';

    if (!isOpen || !order) return null;

    /* ── data extraction ── */
    const acceptedOffer = order.offers?.find((o: any) => o.status === 'accepted');
    const shippingAddr = order.shippingAddresses?.[0] || null;
    const customer = order.customer || null;
    const offerStore = acceptedOffer?.store || order.store || null;

    const invoiceNumber = order.invoice_number || `INV-${order.orderNumber || order.order_number}`;
    const orderNumber = order.orderNumber || order.order_number || '--';
    const offerNumber = acceptedOffer?.offerNumber || acceptedOffer?.offer_number || '--';

    const rawDate = order.invoiceIssuedAt || order.createdAt || order.created_at;
    const invoiceDate = rawDate
        ? `${new Date(rawDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} | ${new Date(rawDate).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : '--';

    const payment = order.payments?.find((p: any) => p.status === 'SUCCESS') || order.payments?.[0];
    const escrow = payment?.escrow;

    // For merchants, the "Total" is their earnings
    const merchantEarnings = Number(escrow?.merchantAmount || payment?.unitPrice || acceptedOffer?.unitPrice || acceptedOffer?.unit_price || 0);
    const finalTotal = isMerchant 
        ? merchantEarnings 
        : (order.invoiceTotal || Number(payment?.totalAmount || acceptedOffer?.unitPrice || acceptedOffer?.unit_price || 0));
    const currency = order.invoiceCurrency || payment?.currency || 'AED';

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
        return language === 'ar' ? (map[val] || val) : val;
    };

    // Merchant/Offer data
    const storeName = offerStore?.name || (language === 'ar' ? 'غير محدد' : 'Unknown');
    const storeCode = offerStore?.storeCode || offerStore?.store_code || '';
    const storeLogo = offerStore?.logo || null;
    const offerImage = acceptedOffer?.offerImage || acceptedOffer?.offer_image || null;
    const offerCondition = getMappedValue(acceptedOffer?.condition, conditionMap) || (language === 'ar' ? 'غير محدد' : 'N/A');
    const offerPartType = getMappedValue(acceptedOffer?.partType || acceptedOffer?.part_type, partTypeMap);
    const offerWarranty = acceptedOffer?.hasWarranty || acceptedOffer?.has_warranty;
    const offerWarrantyDuration = getMappedValue(acceptedOffer?.warrantyDuration || acceptedOffer?.warranty_duration, warrantyDurationMap);
    const offerDeliveryDays = getMappedValue(acceptedOffer?.deliveryDays || acceptedOffer?.delivery_days, deliveryDaysMap);
    const offerNotes = acceptedOffer?.notes || '';
    const offerWeight = acceptedOffer?.weightKg || acceptedOffer?.weight_kg || '--';

    // Customer/Order data
    const customerName = customer?.name || shippingAddr?.fullName || shippingAddr?.full_name || (language === 'ar' ? 'عميل' : 'Customer');
    const partName = order.partName || order.part_name || (language === 'ar' ? 'قطعة غيار' : 'Spare Part');
    const partDesc = order.partDescription || order.part_description || '';
    const partImages: string[] = (() => {
        const imgs = order.partImages || order.part_images;
        if (Array.isArray(imgs)) return imgs;
        if (typeof imgs === 'string') { try { return JSON.parse(imgs); } catch { return []; } }
        return [];
    })();
    const vehicleMake = order.vehicleMake || order.vehicle_make || '';
    const vehicleModel = order.vehicleModel || order.vehicle_model || '';
    const vehicleYear = order.vehicleYear || order.vehicle_year || '';
    const vin = order.vin || '';
    const conditionPref = order.conditionPref || order.condition_pref || '';
    const requestType = order.requestType || order.request_type || '';

    const qrValue = `https://e-tashleh.net/invoice/${order.invoiceId || 'view'}`;

    /* ── print handler ── */
    const handlePrint = () => {
        // We set isPrinting to true, which renders a completely separate DOM tree
        // directly appended to body (using a trick) that won't be constrained by hidden parents
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
            addNotification({
                titleAr: 'تمت طباعة الفاتورة',
                titleEn: 'Invoice Printed',
                messageAr: `تم طباعة أو تنزيل الفاتورة ${invoiceNumber} بنجاح.`,
                messageEn: `Invoice ${invoiceNumber} was successfully printed or downloaded.`,
                type: 'SYSTEM',
                recipientRole: 'CUSTOMER',
                link: '/dashboard/wallet'
            });
        }, 300); // give React time to render the print tree
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            await excelApi.downloadInvoice(order.id, orderNumber);
            addNotification({
                titleAr: 'تم تصدير ملف Excel',
                titleEn: 'Excel Exported',
                messageAr: `تم تصدير بيانات الفاتورة ${invoiceNumber} إلى ملف Excel بنجاح.`,
                messageEn: `Invoice ${invoiceNumber} data was successfully exported to Excel.`,
                type: 'SYSTEM'
            });
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    /* ── helper: image card ── */
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

    /* ── helper: info row ── */
    const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
        <div className="flex items-start gap-2 text-xs sm:text-sm">
            <Icon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0 inv-icon" />
            <span className="text-gray-400 shrink-0 inv-label">{label}:</span>
            <span className="text-white font-semibold break-all inv-value">{value || '--'}</span>
        </div>
    );

    /* ── helper: section header ── */
    const SectionHeader = ({ icon: Icon, titleAr, titleEn }: { icon: any; titleAr: string; titleEn: string }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10 inv-section-header">
            <Icon className="w-5 h-5 text-gold-500" />
            <h3 className="text-sm font-bold text-gold-500 uppercase tracking-wider">
                {language === 'ar' ? titleAr : titleEn}
            </h3>
        </div>
    );

    /* ── terms & policies ── */
    const termsData = t.legal?.termsContent || [];
    const policySections = [
        termsData.find((s: any) => s.title?.includes('أحكام عامة') || s.title?.includes('General')),
        termsData.find((s: any) => s.title?.includes('الاستبدال') || s.title?.includes('Return') || s.title?.includes('الإرجاع')),
        termsData.find((s: any) => s.title?.includes('إجراءات الشحن') || s.title?.includes('Return Shipping') || s.title?.includes('شحن')),
        termsData.find((s: any) => s.title?.includes('الضمان') || s.title?.includes('Warranty') || s.title?.includes('الكفالة'))
    ].filter(Boolean);

    // The shared invoice content used for BOTH screen and print
    const InvoiceContent = () => (
        <div dir={isRTL ? 'rtl' : 'ltr'}>

            {/* ═══ NEW: PRINT LOGO HEADER ═══ */}
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
                            ? (language === 'ar' ? 'بيان مستحقات التاجر' : 'MERCHANT ENTITLEMENT STATEMENT')
                            : (language === 'ar' ? 'فاتورة ضريبية' : 'TAX INVOICE')}
                    </p>
                    {!isMerchant && <p className="text-gray-500 font-mono text-sm inv-label">TRN: 10045678900003</p>}
                </div>
            </div>

            {/* ═══ SECTION 1: HEADER ═══ */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 pb-6 border-b border-white/10 inv-section">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white inv-value mb-1">E-Tashleh.net</h1>
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider inv-label">{language === 'ar' ? 'سوق قطع غيار السيارات' : 'Automotive Marketplace'}</p>
                    <div className="mt-4 space-y-2 text-xs sm:text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                            <span className="inv-label">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}:</span>
                            <span className="font-mono font-bold text-white inv-value">{invoiceNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                            <span className="inv-label">{language === 'ar' ? 'رقم الطلب' : 'Order #'}:</span>
                            <span className="font-mono font-bold text-white inv-value">{orderNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gold-500 inv-icon" />
                            <span className="inv-label">{language === 'ar' ? 'رقم العرض' : 'Offer #'}:</span>
                            <span className="font-mono font-bold text-white inv-value">{offerNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gold-500 inv-icon" />
                            <span className="inv-label">{language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}:</span>
                            <span className="font-medium text-white inv-value">{invoiceDate}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                        <QRCodeSVG value={qrValue} size={100} level="M" includeMargin={false} />
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mt-2 text-center max-w-[120px] inv-label">
                        {language === 'ar' ? 'امسح للتحقق من الفاتورة الرقمية' : 'Scan to view digital invoice'}
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
                            {isMerchant ? (language === 'ar' ? 'عميل منصة إي-تشليح' : 'E-Tashleh Customer') : customerName}
                        </p>
                        {!isMerchant && (
                            <>
                                {customer?.email && <InfoRow icon={Mail} label={language === 'ar' ? 'البريد' : 'Email'} value={customer.email} />}
                                {customer?.phone && <InfoRow icon={Phone} label={language === 'ar' ? 'الهاتف' : 'Phone'} value={`${customer.countryCode || ''} ${customer.phone}`} />}
                            </>
                        )}
                        {(vehicleMake || vehicleModel) && (
                            <InfoRow icon={Car} label={language === 'ar' ? 'السيارة' : 'Vehicle'} value={`${vehicleMake} ${vehicleModel} ${vehicleYear}`} />
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
                            <InfoRow icon={User} label={language === 'ar' ? 'المستلم' : 'Receiver'} value={shippingAddr.fullName || shippingAddr.full_name || '--'} />
                            <InfoRow icon={Phone} label={language === 'ar' ? 'رقم التواصل' : 'Contact Number'} value={shippingAddr.phone || '--'} />
                            {shippingAddr.email && <InfoRow icon={Mail} label={language === 'ar' ? 'البريد البديل' : 'Alt Email'} value={shippingAddr.email} />}
                            <InfoRow icon={MapPin} label={language === 'ar' ? 'المدينة' : 'City'} value={shippingAddr.city || '--'} />
                            <InfoRow icon={MapPin} label={language === 'ar' ? 'الدولة' : 'Country'} value={shippingAddr.country || '--'} />
                            <InfoRow icon={MapPin} label={language === 'ar' ? 'العنوان التفصيلي' : 'Detailed Address'} value={shippingAddr.details || '--'} />
                        </div>
                    ) : (
                        <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                            <p className="text-sm font-medium text-gray-400 italic text-center inv-label">{language === 'ar' ? 'لا يوجد عنوان شحن مسجل لهذا الطلب' : 'No shipping address registered for this order'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ SECTION 4: CUSTOMER ORDER ═══ */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/5 mt-6 inv-section">
                <SectionHeader icon={Package} titleAr="مواصفات الطلب الأساسية" titleEn="Primary Order Specifications" />
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoRow icon={Package} label={language === 'ar' ? 'اسم القطعة المطلوبة' : 'Requested Part Name'} value={partName} />
                        {partDesc && <InfoRow icon={Info} label={language === 'ar' ? 'وصف دقيق للمشكلة/القطعة' : 'Detailed Description'} value={partDesc} />}
                        {conditionPref && <InfoRow icon={ShieldCheck} label={language === 'ar' ? 'شريطة الحالة' : 'Condition Preference'} value={conditionPref} />}
                        {requestType && <InfoRow icon={Info} label={language === 'ar' ? 'نوع التسعير المطلوب' : 'Request Format'} value={requestType === 'multiple' ? (language === 'ar' ? 'طلب تجميعة قطع' : 'Multiple Parts Assembly') : (language === 'ar' ? 'قطعة مفردة' : 'Single Part')} />}
                    </div>
                    {partImages.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold inv-label">
                                {language === 'ar' ? 'المرفقات البصرية (من العميل)' : 'Visual Attachments (Customer)'}
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {partImages.slice(0, 4).map((img: string, i: number) => (
                                    <ImageCard key={`cust-${i}`} src={img} label={`${language === 'ar' ? 'مرفق' : 'Attachment'} 0${i + 1}`} printQr />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ SECTION 5: MERCHANT OFFER ═══ */}
            {acceptedOffer && (
                <div className="bg-gold-500/5 rounded-xl p-5 border border-gold-500/20 mt-6 inv-section">
                    <SectionHeader icon={Store} titleAr="تفاصيل العرض المعتمد" titleEn="Approved Offer Details" />
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={Hash} label={language === 'ar' ? 'الرقم المرجعي للعرض' : 'Offer Ref #'} value={offerNumber} />
                            <InfoRow icon={Store} label={language === 'ar' ? 'التاجر المعتمد' : 'Approved Merchant'} value={`${storeName}${storeCode ? ` #${storeCode}` : ''}`} />
                            <InfoRow icon={ShieldCheck} label={language === 'ar' ? 'حالة القطعة المقدمة' : 'Provided Condition'} value={offerCondition} />
                            <InfoRow icon={Package} label={language === 'ar' ? 'تصنيف الجودة' : 'Quality Class'} value={offerPartType} />
                            <InfoRow icon={ShieldCheck} label={language === 'ar' ? 'تغطية الضمان' : 'Warranty Coverage'} value={offerWarranty ? `${language === 'ar' ? 'مشمول' : 'Included'} — ${offerWarrantyDuration}` : (language === 'ar' ? 'غير مشمول' : 'Not Included')} />
                            <InfoRow icon={Truck} label={language === 'ar' ? 'المدة التقديرية للتوصيل' : 'Est. Delivery Frame'} value={offerDeliveryDays} />
                            <InfoRow icon={Package} label={language === 'ar' ? 'الوزن المسجل (كجم)' : 'Registered Weight (kg)'} value={String(offerWeight)} />
                        </div>

                        {offerNotes && (
                            <div className="bg-gold-500/10 rounded-lg p-4 border border-gold-500/20">
                                <p className="text-xs font-bold text-gold-500 mb-2 uppercase tracking-wider inv-label">{language === 'ar' ? 'ملاحظات واعتمادات التاجر' : 'Merchant Notes & Approvals'}</p>
                                <p className="text-sm font-medium text-white leading-relaxed inv-value">{offerNotes}</p>
                            </div>
                        )}

                        {offerImage && (
                            <div className="pt-2 border-t border-gold-500/20">
                                <p className="text-xs text-gold-500 mb-3 uppercase tracking-wider font-bold inv-label">
                                    {language === 'ar' ? 'صورة القطعة المعتمدة للمطابقة' : 'Approved Part Image for Verification'}
                                </p>
                                <div className="w-full max-w-[240px]">
                                    <ImageCard src={offerImage} label={language === 'ar' ? 'مستند مرئي للعرض' : 'Visual Offer Document'} printQr />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ SECTION 6: TOTAL ═══ */}
            <div className="bg-gradient-to-r from-gold-500/20 to-black/40 rounded-xl p-6 sm:p-8 border-2 border-gold-500 mt-8 shadow-[0_0_30px_rgba(184,134,11,0.15)] inv-total-box">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="text-sm sm:text-base font-bold text-gray-300 inv-label uppercase tracking-widest">
                            {isMerchant 
                                ? (language === 'ar' ? 'مستحقات التاجر النهائية' : 'Final Merchant Entitlement')
                                : (language === 'ar' ? 'المبلغ النهائي والمستحق' : 'Final Amount Due')}
                        </p>
                        <p className="text-xs font-medium text-gold-500 mt-2 inv-label bg-gold-500/10 inline-block px-3 py-1 rounded-full border border-gold-500/20">
                            {language === 'ar' ? '✅ مدفوع بالكامل ' : '✅ Fully Paid '}
                        </p>
                    </div>
                    <div className="text-center sm:text-right bg-black/40 px-6 py-4 rounded-xl border border-gold-500/30">
                        <p className="text-4xl sm:text-5xl md:text-6xl font-black text-gold-500 font-mono tracking-tight shadow-gold-500 drop-shadow-md inv-total-amount">
                            {finalTotal > 0 ? finalTotal.toFixed(2) : '0.00'}
                            <span className="text-xl sm:text-2xl font-bold ms-2 text-gold-400">{currency}</span>
                        </p>
                    </div>
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
                    {language === 'ar' ? '>> تفضل بمسح الكود للتحقق الأصلي من السجلات <<' : '>> SCAN CODE FOR NATIVE RECORD VERIFICATION <<'}
                </p>
                <p className="hidden print:block text-[10px] text-gray-500 mb-4 font-medium inv-label">
                    {language === 'ar' 
                        ? '(لمراجعة وثيقة الشروط والأحكام وسياسات الإرجاع والشحن كاملة، يرجى مسح الـ QR Code أعلاه)' 
                        : '(To review the full Terms, Conditions, Return & Shipping policies, please scan the QR Code above)'}
                </p>
                <div className="space-y-1.5 text-xs text-gray-500">
                    <p className="inv-label font-bold text-gray-400">{language === 'ar' ? 'شكراً لثقتكم واختياركم منصة E-Tashleh.net' : 'Thank you for trusting and choosing E-Tashleh.net'}</p>
                    <p className="inv-label">{language === 'ar' ? 'هذه وثيقة إلكترونية موثقة وصادرة من النظام الآلي لا تحتاج لختم تقليدي' : 'This is a verified electronic document generated by the automated system, no physical stamp required'}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 inline-block">
                        <p className="text-gray-600 font-mono text-[10px] inv-label tracking-widest">
                            ELLIPP FZ LLC | {language === 'ar' ? 'رخصة تجارية:' : 'L/N:'} 45000927 | {language === 'ar' ? 'سجل تجاري:' : 'CR:'} 0000004036902
                        </p>
                        <p className="text-gray-700 font-mono text-[9px] mt-1 inv-label">Generated: {new Date().toUTCString()} | System Reference: {order.id.slice(0, 8)}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {/* The regular modal for screen viewing */}
            {isOpen && !isPrinting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
                    <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col bg-[#111] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden">
                        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/10 bg-[#1a1a1a] shrink-0">
                            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
                                <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/20">
                                    <FileText className="w-5 h-5 text-gold-500" />
                                </div>
                                {language === 'ar' ? 'الوثيقة الضريبية الرسمية' : 'Official Tax Invoice'}
                            </h2>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleExportExcel} 
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg transition-colors border border-white/10 disabled:opacity-50"
                                >
                                    {isExporting ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : <Download className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{language === 'ar' ? 'تصدير Excel' : 'Export Excel'}</span>
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(184,134,11,0.4)]">
                                    <Printer className="w-4 h-4" />
                                    <span className="hidden sm:inline">{language === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</span>
                                </button>
                                <button onClick={onClose} className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-gray-400 transition-colors border border-transparent hover:border-red-500/20">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                            <InvoiceContent />
                        </div>
                    </div>
                </div>
            )}

            {/* The dedicated print structure that overrides EVERYTHING when printing */}
            {isPrinting && (
                <>
                    <PrintStyles />
                    <div id="special-invoice-print-container" dir={isRTL ? 'rtl' : 'ltr'}>
                        <InvoiceContent />
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
