
import React from 'react';
import { motion } from 'framer-motion';
import { Scale, RefreshCcw, Search, ChevronRight, ChevronLeft, AlertCircle, Clock } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useResolutionStore } from '../../../stores/useResolutionStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Badge } from '../../ui/Badge';

interface ResolutionCenterProps {
    onNavigate?: (path: string, id?: any) => void;
}

export const ResolutionCenter: React.FC<ResolutionCenterProps> = ({ onNavigate }) => {
  const { cases } = useResolutionStore();
  const { t, language } = useLanguage();
  const ArrowIcon = language === 'ar' ? ChevronLeft : ChevronRight;

  const handleCaseClick = (caseId: string) => {
      // Determine if we are in Merchant View (usually based on context, 
      // but here we can just trigger the navigation which the parent App.tsx handles)
      if (onNavigate) {
          onNavigate('dispute-details', caseId);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Scale className="text-gold-500" size={32} />
                  {t.dashboard.resolution.title}
              </h1>
              <p className="text-white/50 text-sm">{t.dashboard.resolution.subtitle}</p>
          </div>
      </div>

      {/* Stats / Overview */}
      <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#1A1814] p-6 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                  <div className="text-white/40 text-xs mb-1 font-bold">{t.dashboard.merchant.resolution.activeCases.toUpperCase()}</div>
                  <div className="text-3xl font-bold text-white">{cases.filter(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED').length}</div>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <Scale size={20} />
              </div>
          </div>
          <div className="bg-[#1A1814] p-6 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                  <div className="text-white/40 text-xs mb-1 font-bold">{t.dashboard.merchant.resolution.totalResolved.toUpperCase()}</div>
                  <div className="text-3xl font-bold text-white">{cases.filter(c => c.status === 'RESOLVED').length}</div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <RefreshCcw size={20} />
              </div>
          </div>
      </div>

      {/* Cases List */}
      <GlassCard className="p-0 overflow-hidden bg-[#151310] border-white/5 min-h-[400px]">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="font-bold text-white">{t.dashboard.merchant.resolution.yourCases}</h3>
              <div className="relative">
                  <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-white/30" />
                  <input 
                    type="text" 
                    placeholder={t.dashboard.merchant.resolution.search}
                    className="bg-[#1A1814] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-gold-500 outline-none w-48"
                  />
              </div>
          </div>

          <div className="divide-y divide-white/5">
              {cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30">
                      <Scale size={48} className="mb-4 opacity-20" />
                      <p>{t.dashboard.merchant.resolution.noCases}</p>
                  </div>
              ) : (
                  cases.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => handleCaseClick(item.id)}
                        className="p-4 md:p-6 hover:bg-white/5 transition-colors cursor-pointer group relative"
                      >
                          {/* Action Required Indicator */}
                          {(item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN') && (
                              <div className="absolute top-6 right-14 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}

                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                              <div className="flex items-start gap-4">
                                  <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center border ${item.type === 'dispute' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>
                                      {item.type === 'dispute' ? <Scale size={18} /> : <RefreshCcw size={18} />}
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <span className="font-mono text-xs font-bold text-gold-400">#{item.id}</span>
                                          <Badge status={item.status === 'RESOLVED' ? 'RESOLVED' : item.type === 'dispute' ? 'DISPUTED' : 'RETURN_REQUESTED'} />
                                      </div>
                                      <h4 className="text-white font-bold text-sm md:text-base mb-1">{item.partName}</h4>
                                      <div className="flex items-center gap-2 text-xs text-white/40">
                                          <span>Order #{item.orderId}</span>
                                          <span>•</span>
                                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pl-14 md:pl-0">
                                  {item.status === 'AWAITING_MERCHANT' || item.status === 'OPEN' ? (
                                      <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 font-bold">
                                          <Clock size={14} />
                                          <span>Action Required</span>
                                      </div>
                                  ) : (
                                      <div className="text-xs text-white/30">{item.status}</div>
                                  )}
                                  <ArrowIcon size={18} className="text-white/20 group-hover:text-gold-500 transition-colors" />
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </GlassCard>

    </div>
  );
};
