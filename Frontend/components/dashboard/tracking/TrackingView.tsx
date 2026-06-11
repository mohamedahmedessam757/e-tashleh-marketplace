

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../ui/GlassCard';
import { MapPin, Truck, CheckCircle2, Box, Package, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useOrderStore } from '../../../stores/useOrderStore';

interface TrackingViewProps {
  trackingNumber: string; 
}

export const TrackingView: React.FC<TrackingViewProps> = ({ trackingNumber }) => {
  const { t, language } = useLanguage();
  const { orders } = useOrderStore();
  
  const order = orders.find(o => o.waybillNumber === trackingNumber) || orders.find(o => o.status === 'SHIPPED');

  const steps = [
    { id: 1, label: t.dashboard.tracking.steps.received, date: order?.offerAcceptedAt ? new Date(order.offerAcceptedAt).toLocaleDateString() : t.dashboard.merchant.status.completed, status: 'completed' },
    { id: 2, label: t.dashboard.tracking.steps.transit, date: order?.shippedAt ? new Date(order.shippedAt).toLocaleDateString() : t.common.loading, status: order?.status === 'SHIPPED' ? 'current' : order?.status === 'DELIVERED' ? 'completed' : 'pending' },
    { id: 3, label: t.dashboard.tracking.steps.distribution, date: '--', status: 'pending' },
    { id: 4, label: t.dashboard.tracking.steps.out, date: '--', status: 'pending' },
    { id: 5, label: t.dashboard.tracking.steps.delivered, date: order?.deliveredAt || '--', status: order?.status === 'DELIVERED' ? 'completed' : 'pending' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-h-[300px] relative rounded-2xl overflow-hidden border border-white/10 group">
          <div className="absolute inset-0 bg-[#1A1814] opacity-50" 
               style={{ 
                   backgroundImage: `radial-gradient(#A88B3E 1px, transparent 1px)`, 
                   backgroundSize: '20px 20px' 
               }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0F0E0C]" />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
             <motion.path 
                d="M 50 250 Q 150 150 300 200 T 500 100"
                fill="none"
                stroke="#A88B3E"
                strokeWidth="2"
                strokeDasharray="10 5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             />
          </svg>

          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
              <div className="relative">
                  <div className="w-4 h-4 bg-gold-500 rounded-full animate-ping absolute opacity-75" />
                  <div className="w-4 h-4 bg-gold-500 rounded-full relative z-10 border-2 border-white" />
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs whitespace-nowrap text-white">
                      Riyadh Distribution Center
                  </div>
              </div>
          </motion.div>

          <div className="absolute bottom-4 right-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md transition-colors text-xs font-bold">
                  <MapPin size={14} />
                  {t.dashboard.tracking.viewMap}
              </button>
          </div>
        </div>

        <GlassCard className="w-full md:w-80 bg-[#151310] p-6 flex flex-col justify-between">
           <div>
               <h3 className="text-white font-bold mb-6 border-b border-white/10 pb-4">{t.dashboard.tracking.title}</h3>
               
               <div className="space-y-4">
                   <div>
                       <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{t.dashboard.tracking.trackingNo}</div>
                       <div className="text-lg font-mono text-gold-400 font-bold tracking-widest">{order?.waybillNumber || trackingNumber}</div>
                   </div>
                   
                   <div>
                       <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{t.dashboard.tracking.carrier}</div>
                       <div className="flex items-center gap-2 text-white">
                           <Truck size={16} />
                           <span className="font-bold">{order?.courier || 'DHL'}</span>
                       </div>
                   </div>

                   <div>
                       <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">{t.dashboard.tracking.estimated}</div>
                       <div className="text-lg font-bold text-white">{order?.expectedDeliveryDate || t.common.loading}</div>
                   </div>
               </div>
           </div>

           <a href="#" className="flex items-center justify-center gap-2 w-full py-3 mt-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white transition-all text-sm">
               <span>{t.dashboard.tracking.courierWeb}</span>
               <ExternalLink size={14} />
           </a>
        </GlassCard>
      </div>

      <div className="relative pl-4 md:pl-8 py-4">
          <div className="absolute top-0 bottom-0 left-[27px] md:left-[43px] w-0.5 bg-white/10" />
          
          <div className="space-y-8">
              {steps.map((step, idx) => {
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  
                  return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 md:gap-6 relative"
                      >
                          <div className={`
                              relative z-10 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-[#0F0E0C]
                              ${isCompleted ? 'border-gold-500 text-gold-500' : isCurrent ? 'border-gold-500 text-white animate-pulse' : 'border-white/20 text-white/20'}
                          `}>
                              {isCompleted ? <CheckCircle2 size={14} /> : isCurrent ? <Box size={14} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                          </div>
                          
                          <div className={`flex-1 p-4 rounded-xl border transition-colors ${isCurrent ? 'bg-white/5 border-gold-500/30' : 'bg-transparent border-transparent'}`}>
                              <h4 className={`font-bold text-sm md:text-base ${isCompleted || isCurrent ? 'text-white' : 'text-white/40'}`}>
                                  {step.label}
                              </h4>
                              <span className="text-xs text-white/40">{step.date}</span>
                          </div>
                      </motion.div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};
