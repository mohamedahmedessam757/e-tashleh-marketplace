import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useBillingStore } from '../../../stores/useBillingStore';
import { useLanguage } from '../../../contexts/LanguageContext';

export const SavedCards: React.FC = () => {
    const { t, language } = useLanguage();
    const { cards, fetchCards, addCard, deleteCard, setDefaultCard, cardsLoading: loading } = useBillingStore();
    const [showAddCard, setShowAddCard] = useState(false);
    const [newCard, setNewCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCards();
    }, []);

    // Luhn Algorithm for Card Validation
    const isValidLuhn = (val: string) => {
        let sum = 0;
        let shouldDouble = false;
        // loop backwards
        for (let i = val.length - 1; i >= 0; i--) {
            let digit = parseInt(val.charAt(i));

            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }

            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return (sum % 10) === 0;
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        const cleanNumber = newCard.number.replace(/\s/g, '');

        if (!cleanNumber || cleanNumber.length < 13 || !isValidLuhn(cleanNumber)) {
            newErrors.number = language === 'ar' ? 'رقم البطاقة غير صحيح' : 'Invalid card number';
        }

        if (!newCard.name) {
            newErrors.name = language === 'ar' ? 'اسم حامل البطاقة مطلوب' : 'Card holder name is required';
        }

        const [month, year] = newCard.expiry.split('/').map(n => parseInt(n));
        const now = new Date();
        const currentYear = parseInt(now.getFullYear().toString().slice(-2));
        const currentMonth = now.getMonth() + 1;

        if (!month || !year || month < 1 || month > 12 || year < currentYear || (year === currentYear && month < currentMonth)) {
            newErrors.expiry = language === 'ar' ? 'تاريخ الانتهاء غير صالح' : 'Invalid expiry date';
        }

        if (!newCard.cvc || newCard.cvc.length < 3) {
            newErrors.cvc = language === 'ar' ? 'رمز الأمان غير صالح' : 'Invalid CVC';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await addCard({
                last4: newCard.number.replace(/\s/g, '').slice(-4),
                brand: newCard.number.startsWith('4') ? 'Visa' : 'Mastercard',
                expiryMonth: parseInt(newCard.expiry.split('/')[0]),
                expiryYear: 2000 + parseInt(newCard.expiry.split('/')[1]),
                cardHolderName: newCard.name
            });
            setShowAddCard(false);
            setNewCard({ number: '', name: '', expiry: '', cvc: '' });
            setErrors({});
        } catch (err) {
            console.error('Failed to add card', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length) {
            return parts.join(' ');
        } else {
            return value;
        }
    };

    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const itemVariant = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CreditCard className="text-gold-500" size={20} />
                    {t.dashboard.billing?.wallet || (language === 'ar' ? 'طرق الدفع' : 'Payment Methods')}
                </h3>
                <button
                    onClick={() => setShowAddCard(!showAddCard)}
                    className="flex items-center gap-2 text-gold-400 text-sm hover:text-white transition-colors"
                >
                    <Plus size={16} />
                    {t.dashboard.billing?.addCard || (language === 'ar' ? 'إضافة بطاقة جديدة' : 'Add New Card')}
                </button>
            </div>

            <AnimatePresence>
                {showAddCard && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleAddCard}
                        className="bg-[#151310] border border-white/10 rounded-xl p-6 overflow-hidden mb-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase">{t.dashboard.billing?.cardForm?.holder || (language === 'ar' ? 'اسم حامل البطاقة' : 'Card Holder Name')}</label>
                                <input
                                    type="text"
                                    value={newCard.name}
                                    onChange={e => setNewCard({ ...newCard, name: e.target.value })}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white outline-none focus:border-gold-500 transition-colors ${errors.name ? 'border-red-500/50' : 'border-white/10'}`}
                                    placeholder="John Doe"
                                />
                                {errors.name && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase">{t.dashboard.billing?.cardForm?.number || (language === 'ar' ? 'رقم البطاقة' : 'Card Number')}</label>
                                <input
                                    type="text"
                                    value={newCard.number}
                                    onChange={e => {
                                        const formatted = formatCardNumber(e.target.value);
                                        if (formatted.length <= 19) {
                                            setNewCard({ ...newCard, number: formatted });
                                        }
                                    }}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white outline-none focus:border-gold-500 transition-colors ${errors.number ? 'border-red-500/50' : 'border-white/10'}`}
                                    placeholder="0000 0000 0000 0000"
                                />
                                {errors.number && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.number}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase">{t.dashboard.billing?.cardForm?.expiry || (language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry (MM/YY)')}</label>
                                <input
                                    type="text"
                                    value={newCard.expiry}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val.length <= 4) {
                                            setNewCard({ ...newCard, expiry: formatExpiry(val) });
                                        }
                                    }}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white outline-none focus:border-gold-500 transition-colors ${errors.expiry ? 'border-red-500/50' : 'border-white/10'}`}
                                    placeholder="MM/YY"
                                />
                                {errors.expiry && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.expiry}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase">{t.dashboard.billing?.cardForm?.cvc || 'CVC'}</label>
                                <input
                                    type="text"
                                    value={newCard.cvc}
                                    onChange={e => setNewCard({ ...newCard, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white outline-none focus:border-gold-500 transition-colors ${errors.cvc ? 'border-red-500/50' : 'border-white/10'}`}
                                    placeholder="123"
                                />
                                {errors.cvc && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.cvc}</p>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddCard(false)}
                                className="px-4 py-2 text-white/50 hover:text-white"
                                disabled={isSubmitting}
                            >
                                {t.dashboard.billing?.cardForm?.cancel || (language === 'ar' ? 'إلغاء' : 'Cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-gold-500 text-black font-bold rounded-lg hover:bg-gold-600 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                {t.dashboard.billing?.cardForm?.save || (language === 'ar' ? 'حفظ البطاقة' : 'Save Card')}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-8 text-white/40">Loading cards...</div>
                ) : cards.length > 0 ? (
                    cards.map((card) => (
                        <motion.div
                            key={card.id}
                            variants={itemVariant}
                            initial="hidden"
                            animate="show"
                            className={`p-6 rounded-xl border flex items-center justify-between ${card.isDefault ? 'bg-gold-500/5 border-gold-500/50' : 'bg-white/5 border-white/10'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 bg-white/10 rounded-md flex items-center justify-center">
                                    <CreditCard className="text-white/70" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white flex items-center gap-3">
                                        •••• •••• •••• {card.last4}
                                        {card.isDefault && <span className="text-[10px] bg-gold-500 text-black px-2 py-0.5 rounded-full">{t.dashboard.billing?.cardForm?.default || (language === 'ar' ? 'الافتراضي' : 'Default')}</span>}
                                    </h4>
                                    <p className="text-sm text-white/50 uppercase">{card.brand} - {t.dashboard.billing?.cardForm?.expires || (language === 'ar' ? 'ينتهي' : 'Expires')} {card.expiryMonth}/{card.expiryYear}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!card.isDefault && (
                                    <button
                                        onClick={() => setDefaultCard(card.id)}
                                        className="px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
                                    >
                                        {t.dashboard.billing?.cardForm?.makeDefault || (language === 'ar' ? 'تعيين كافتراضي' : 'Make Default')}
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteCard(card.id)}
                                    className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    !showAddCard && (
                        <div className="text-center py-12 text-white/30 bg-white/5 rounded-xl border border-dashed border-white/10">
                            <CreditCard className="mx-auto mb-3 opacity-50" size={32} />
                            <p>{t.dashboard.billing?.cardForm?.noCards || (language === 'ar' ? 'لا توجد بطاقات محفوظة' : 'No saved cards')}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
