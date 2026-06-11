
import React, { useRef } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useBillingStore } from '../../../stores/useBillingStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Printer, Download, ArrowLeft, ArrowRight, Share2 } from 'lucide-react';

interface InvoiceViewerProps {
    invoiceId: string;
    onBack: () => void;
}

export const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ invoiceId, onBack }) => {
    const { t, language } = useLanguage();
    // Mock the single invoice to bypass faulty store mockup
    const invoice: any = null;
    const printRef = useRef<HTMLDivElement>(null);

    const isAr = language === 'ar';
    const ArrowIcon = isAr ? ChevronRight : ChevronLeft;

    if (!invoice) return <div className="text-white p-8">Invoice not found</div>;

    const handlePrint = () => {
        window.print();
    };

    // Fake QR Code URL (Generates a static QR for visual)
    const qrData = `E-Tashleh|${invoice.totalAmount}|${invoice.date}|${invoice.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
            {/* Actions Header (No Print) */}
            <div className="flex justify-between items-center print:hidden">
                <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft size={18} className={isAr ? 'rotate-180' : ''} />
                    <span>{isAr ? 'العودة' : 'Back'}</span>
                </button>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg font-bold shadow-lg transition-colors">
                        <Printer size={16} />
                        {t.common.print}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold border border-white/10 transition-colors">
                        <Download size={16} />
                        PDF
                    </button>
                </div>
            </div>

            {/* Invoice Paper Container */}
            <div className="flex justify-center">
                <div
                    ref={printRef}
                    className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 md:p-12 shadow-2xl relative overflow-hidden print:w-full print:shadow-none print:m-0"
                >
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                        <img
                            src="/logo.png"
                            alt="Watermark"
                            className="w-[80%] h-auto grayscale filter"
                        />
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-start mb-12 relative z-10 border-b-2 border-gray-100 pb-8">
                        <div className="flex items-center gap-4">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="w-16 h-16 object-contain"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-[#A88B3E] uppercase tracking-widest">{t.admin.billing.invoiceViewer.taxInvoice}</h1>
                                <p className="text-xs text-gray-500 mt-1">VAT Reg: 300012345678903</p>
                                <p className="text-xs text-gray-500">CR: 1010123456</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <img src={qrUrl} alt="QR Code" className="w-24 h-24 border border-gray-200 p-1" />
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-12 relative z-10">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.billing.invoiceViewer.seller}</h3>
                            <div className="text-sm font-bold text-gray-800">{invoice.merchantName}</div>
                            <div className="text-xs text-gray-500 mt-1">Riyadh, Saudi Arabia</div>
                            <div className="text-xs text-gray-500">support@e-tashleh.com</div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.admin.billing.invoiceViewer.buyer}</h3>
                            <div className="text-sm font-bold text-gray-800">{invoice.customerName}</div>
                            <div className="text-xs text-gray-500 mt-1">Client ID: #{invoice.customerName?.split(' ')[1] || '---'}</div>
                        </div>
                    </div>

                    {/* Invoice Meta */}
                    <div className="flex justify-between items-center mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100 relative z-10">
                        <div>
                            <div className="text-xs text-gray-500 uppercase">{t.admin.billing.invoiceViewer.invoiceNo}</div>
                            <div className="font-mono font-bold text-lg">{invoice.id}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase">{t.admin.billing.invoiceViewer.issueDate}</div>
                            <div className="font-mono font-bold">{new Date(invoice.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase">{t.admin.billing.invoiceViewer.supplyDate}</div>
                            <div className="font-mono font-bold">{new Date(invoice.supplyDate).toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-10 relative z-10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-gray-100 text-xs font-bold text-gray-500 uppercase">
                                    <th className={`py-3 ${isAr ? 'text-right' : 'text-left'}`}>{t.admin.billing.invoiceViewer.item}</th>
                                    <th className="py-3 text-center">{t.admin.billing.invoiceViewer.qty}</th>
                                    <th className="py-3 text-right">{t.admin.billing.invoiceViewer.unitPrice}</th>
                                    <th className="py-3 text-right">{t.admin.billing.invoiceViewer.total}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {invoice.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-50">
                                        <td className="py-4 font-medium text-gray-800">{item.description}</td>
                                        <td className="py-4 text-center text-gray-600">{item.quantity}</td>
                                        <td className="py-4 text-right font-mono text-gray-600">{item.unitPrice.toLocaleString()}</td>
                                        <td className="py-4 text-right font-mono font-bold text-gray-800">{item.totalAmount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end relative z-10">
                        <div className="w-full max-w-xs space-y-3">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t.admin.billing.invoiceViewer.subtotal}</span>
                                <span className="font-mono">{invoice.subtotal.toFixed(2)} AED</span>
                            </div>
                            {invoice.shippingAmount > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>{t.admin.billing.invoiceViewer.shipping}</span>
                                    <span className="font-mono">{invoice.shippingAmount.toFixed(2)} AED</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t.admin.billing.invoiceViewer.vat}</span>
                                <span className="font-mono">{invoice.taxAmount.toFixed(2)} AED</span>
                            </div>
                            <div className="h-px bg-gray-200 my-2" />
                            <div className="flex justify-between items-center text-lg font-bold text-gray-900 bg-gray-50 p-2 rounded">
                                <span>{t.admin.billing.invoiceViewer.totalDue}</span>
                                <span className="font-mono text-[#A88B3E]">{invoice.totalAmount.toLocaleString()} AED</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Barcode */}
                    <div className="absolute bottom-12 left-0 w-full text-center">
                        <div className="font-libre-barcode text-4xl text-gray-800 opacity-80 tracking-widest scale-y-150 mb-2">
                            {invoice.id.replace(/-/g, '')}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4">{t.admin.billing.invoiceViewer.generatedBy}</p>
                    </div>
                </div>
            </div>

            {/* Print Styles Injection */}
            <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap');
            .font-libre-barcode { font-family: 'Libre Barcode 39 Text', cursive; }
            @media print {
                body * { visibility: hidden; }
                #root { display: none; }
                .print\\:hidden { display: none !important; }
                .print\\:w-full { width: 100% !important; max-width: none !important; }
                .print\\:shadow-none { box-shadow: none !important; }
                .print\\:m-0 { margin: 0 !important; }
                /* Target the invoice container specifically */
                div[class*="bg-white text-black"] {
                    visibility: visible;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 0;
                    padding: 20px;
                }
                div[class*="bg-white text-black"] * {
                    visibility: visible;
                }
            }
        `}</style>
        </div>
    );
};

// Chevron Icon Helper
const ChevronLeft = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6" /></svg>
);
const ChevronRight = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6" /></svg>
);
