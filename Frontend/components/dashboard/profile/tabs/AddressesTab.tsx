
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Briefcase, Home, Trash2, MapPin } from 'lucide-react';
import { useProfileStore } from '../../../../stores/useProfileStore';
import { useLanguage } from '../../../../contexts/LanguageContext';

const InputGroup = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
    <div className="space-y-2">
        <label className="text-xs text-white/40 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-[#151310] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold-500 outline-none transition-colors placeholder-white/20"
        />
    </div>
);

export const AddressesTab: React.FC = () => {
    const { addresses, addAddress, removeAddress, setDefaultAddress } = useProfileStore();
    const { t } = useLanguage();
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({ title: '', city: '', details: '' });

    const handleAddAddress = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAddress.title && newAddress.city && newAddress.details) {
            addAddress({ ...newAddress, isDefault: false });
            setNewAddress({ title: '', city: '', details: '' });
            setShowAddAddress(false);
        }
    };

    return (
        <motion.div key="addresses" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">{t.dashboard.profile.addresses.title}</h3>
                <button
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="flex items-center gap-2 text-gold-400 text-sm hover:text-white transition-colors"
                >
                    <Plus size={16} />
                    {t.dashboard.profile.addresses.add}
                </button>
            </div>
            <AnimatePresence>
                {showAddAddress && (
                    <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleAddAddress}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 overflow-hidden"
                    >
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <InputGroup
                                label="Label (Home, Work)"
                                value={newAddress.title}
                                onChange={(e: any) => setNewAddress({ ...newAddress, title: e.target.value })}
                                placeholder="e.g. Home"
                            />
                            <InputGroup
                                label="City"
                                value={newAddress.city}
                                onChange={(e: any) => setNewAddress({ ...newAddress, city: e.target.value })}
                                placeholder="e.g. Riyadh"
                            />
                            <div className="md:col-span-2">
                                <InputGroup
                                    label="Full Address Details"
                                    value={newAddress.details}
                                    onChange={(e: any) => setNewAddress({ ...newAddress, details: e.target.value })}
                                    placeholder="Street, Building No..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowAddAddress(false)} className="px-4 py-2 text-white/60 hover:text-white">{(t.common as any).cancel}</button>
                            <button type="submit" className="px-4 py-2 bg-gold-500 text-white rounded-lg font-bold hover:bg-gold-600">{t.dashboard.profile.addresses.save}</button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
            <div className="space-y-4">
                {addresses.map((addr) => (
                    <div
                        key={addr.id}
                        className={`p-4 rounded-xl border transition-all ${addr.isDefault ? 'bg-gold-500/10 border-gold-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg ${addr.isDefault ? 'bg-gold-500 text-white' : 'bg-white/10 text-white/50'}`}>
                                    {addr.title.toLowerCase().includes('office') ? <Briefcase size={20} /> : <Home size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-white">{addr.title}</h4>
                                        {addr.isDefault && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500 text-white font-medium">
                                                {t.dashboard.profile.addresses.default}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/60">{addr.city}, {addr.details}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!addr.isDefault && (
                                    <button
                                        onClick={() => setDefaultAddress(addr.id)}
                                        className="text-xs text-white/40 hover:text-gold-400 px-2 py-1"
                                    >
                                        {(t.dashboard.profile.addresses as any).setDefault}
                                    </button>
                                )}
                                <button
                                    onClick={() => removeAddress(addr.id)}
                                    className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-500 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
