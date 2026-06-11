import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAuditStore, ActionType } from '../../../stores/useAuditStore';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Search, Filter, Database, Clock, User, FileText, ChevronRight, ChevronDown, Download, Radio, Shield, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminAuditLogs: React.FC = () => {
    const { t, language } = useLanguage();
    const { logs, fetchLogs, fetchMoreLogs, hasMore, subscribeToLogs, unsubscribeFromLogs, isLoading } = useAuditStore();
    const [filterAction, setFilterAction] = useState<string>('ALL');
    const [filterEntity, setFilterEntity] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const observerTarget = useRef(null);

    useEffect(() => {
        fetchLogs();
        subscribeToLogs();
        return () => unsubscribeFromLogs();
    }, []);

    // Phase 4: Infinite Scroll Observer logic
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && filterAction === 'ALL' && !search) {
                    fetchMoreLogs();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, fetchMoreLogs, filterAction, search]);

    const isAr = language === 'ar';

    const getActionColor = (action: ActionType) => {
        switch (action) {
            case 'CREATE': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'DELETE': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'UPDATE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'STATUS_CHANGE': 
            case 'STORE_STATUS_CHANGE': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'FINANCIAL': return 'text-gold-400 bg-gold-500/10 border-gold-500/20';
            case 'AUTO_UNBAN': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 font-black';
            case 'DOC_APPROVED': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'DOC_REJECTED': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'LOGIN': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
            default: return 'text-white/50 bg-white/5 border-white/10';
        }
    };

    const filteredLogs = logs.filter(l => {
        const matchesAction = filterAction === 'ALL' || l.action === filterAction;
        
        // Entity Filter: Handle grouped entities (e.g., STORE matches both STORE and STORE_DOCUMENT)
        const matchesEntity = filterEntity === 'ALL' || 
                             (filterEntity === 'STORE' && l.entity.startsWith('STORE')) ||
                             (filterEntity === 'ORDER' && l.entity === 'ORDER') ||
                             (filterEntity === 'SHIPMENT' && l.entity === 'SHIPMENT') ||
                             (filterEntity === 'USER' && l.entity === 'USER') ||
                             (filterEntity === 'VIOLATION' && l.entity.startsWith('VIOLATION')) ||
                             (filterEntity === 'RECOVERY' && l.entity === 'AccountRecoveryRequest') ||
                             (filterEntity === 'CHAT' && l.entity === 'OrderChat') ||
                             (filterEntity === 'SYSTEM' && (l.entity === 'SYSTEM' || l.actorType === 'SYSTEM'));

        const searchLower = search.toLowerCase();
        const matchesSearch = 
            (l.id?.toLowerCase() || "").includes(searchLower) ||
            (l.actorName?.toLowerCase() || "").includes(searchLower) ||
            (l.entity?.toLowerCase() || "").includes(searchLower) ||
            (l.reason?.toLowerCase() || "").includes(searchLower) ||
            // Search in metadata (store name, etc)
            Object.values(l.metadata || {}).some(val => String(val).toLowerCase().includes(searchLower)) ||
            (l.orderId?.toString() || "").includes(search);
            
        return matchesAction && matchesEntity && matchesSearch;
    });

    const getActionLabel = (action: string) => {
        return (t.admin.auditPage.actions as any)[action] || action;
    };

    const getReasonLabel = (reason: string) => {
        if (!reason) return t.admin.auditPage.defaultReason;
        // If it's a known key, translate it
        if ((t.admin.auditPage.reasons as any)[reason]) {
            return (t.admin.auditPage.reasons as any)[reason];
        }
        return reason;
    };

    const renderStateDiff = (log: any) => {
        // Safe helper to parse JSON or return original
        const safeParse = (val: any) => {
            if (typeof val !== 'string') return val;
            try { return JSON.parse(val); } catch { return val; }
        };

        const prev = safeParse(log.previousState);
        const next = safeParse(log.newState);

        // Helper to check for actual objects (not null, not arrays)
        const isPlainObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);

        // Premium Difference Card Component
        const DiffCard = ({ label, oldVal, newVal, isCreation = false }: { label: string, oldVal: any, newVal: any, isCreation?: boolean, key?: React.Key }) => (
            <div className="relative overflow-hidden p-0.5 rounded-[1.5rem] bg-gradient-to-br from-white/10 to-transparent group/diff shadow-2xl">
                <div className="bg-[#12110F] rounded-[1.4rem] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</span>
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isCreation ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-gold-500/10 border-gold-500/20 text-gold-500'}`}>
                            {isCreation ? 'NEW RECORD' : 'MODIFIED'}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        {/* OLD STATE */}
                        {!isCreation && (
                            <div className="relative group/old">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-red-500/20 to-transparent rounded-2xl blur opacity-0 group-hover/old:opacity-100 transition-opacity"></div>
                                <div className="relative bg-red-500/[0.03] border border-red-500/10 p-4 rounded-2xl">
                                    <span className="absolute -top-2 left-4 px-2 py-0.5 bg-red-500 text-[8px] text-black font-black rounded italic">WAS</span>
                                    <div className="text-xs text-red-400 font-mono break-all line-through opacity-60">
                                        {String(oldVal ?? 'EMPTY')}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ARROW INDICATOR */}
                        {!isCreation && (
                            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-gold-500 items-center justify-center shadow-lg shadow-gold-500/20 border-2 border-[#12110F] animate-pulse">
                                <ChevronRight size={16} className={`text-black ${isAr ? 'rotate-180' : ''}`} />
                            </div>
                        )}

                        {/* NEW STATE */}
                        <div className={`relative group/new ${isCreation ? 'sm:col-span-2' : ''}`}>
                            <div className="absolute -inset-1 bg-gradient-to-tr from-green-500/20 to-transparent rounded-2xl blur opacity-0 group-hover/new:opacity-100 transition-opacity"></div>
                            <div className="relative bg-green-500/[0.03] border border-green-500/10 p-4 rounded-2xl">
                                <span className="absolute -top-2 left-4 px-2 py-0.5 bg-green-500 text-[8px] text-black font-black rounded italic">{isCreation ? 'INITIAL VALUE' : 'NOW'}</span>
                                <div className="text-xs text-green-400 font-black break-all drop-shadow-sm">
                                    {isPlainObject(newVal) ? JSON.stringify(newVal, null, 2) : String(newVal ?? 'EMPTY')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        // Handle string values (Don't let strings be treated as objects to avoid character splitting)
        if (typeof next === 'string' && (typeof prev === 'string' || prev === null)) {
            return (
                <div className="space-y-4">
                    <DiffCard 
                        label={isAr ? 'تحليل القيمة المعالجة' : 'Processed Value Analysis'} 
                        oldVal={prev} 
                        newVal={next} 
                        isCreation={!prev} 
                    />
                </div>
            );
        }

        // Case: Complex Object Change
        if (isPlainObject(next) || isPlainObject(prev)) {
            const safePrev = isPlainObject(prev) ? prev : {};
            const safeNext = isPlainObject(next) ? next : {};
            
            const allKeys = Array.from(new Set([...Object.keys(safePrev), ...Object.keys(safeNext)]));
            const changes = allKeys.filter(key => JSON.stringify(safePrev[key]) !== JSON.stringify(safeNext[key]));
            
            if (changes.length === 0 && !prev) {
                 // Creation with object
                 return <DiffCard label={log.entity} oldVal={null} newVal={next} isCreation={true} />;
            }

            if (changes.length === 0) return <div className="p-10 text-center text-white/20 italic font-medium">No detectable data changes in this snapshot</div>;

            return (
                <div className="grid grid-cols-1 gap-6">
                    {changes.map(key => (
                        <DiffCard key={key} label={key} oldVal={safePrev[key]} newVal={safeNext[key]} isCreation={!prev} />
                    ))}
                </div>
            );
        }

        // Default fallback
        return (
            <div className="text-white/20 font-mono text-xs p-6 bg-white/5 rounded-2xl border border-white/10 uppercase tracking-widest text-center shadow-inner">
                {isAr ? 'بيانات أولية غير قابلة للمقارنة' : 'Non-comparable Raw Data Stream'}
            </div>
        );
    };

    const handleDownloadCSV = () => {
        if (filteredLogs.length === 0) return;

        const headers = [
            isAr ? 'التاريخ' : 'Timestamp',
            isAr ? 'المنفذ' : 'Actor',
            isAr ? 'نوع المنفذ' : 'Actor Type',
            isAr ? 'العملية' : 'Action',
            isAr ? 'الكيان' : 'Entity',
            isAr ? 'المعرف' : 'ID',
            isAr ? 'السبب' : 'Reason'
        ];

        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US'),
            log.actorName || (log.actorType === 'SYSTEM' ? t.admin.auditPage.systemActor : 'N/A'),
            log.actorType,
            getActionLabel(log.action),
            log.entity,
            log.id,
            getReasonLabel(log.reason).replace(/,/g, ' ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-10">
            {/* Header section with Premium design */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-gold-500 rounded-lg shadow-lg shadow-gold-500/20">
                            <Database className="text-black" size={24} />
                        </div>
                        {t.admin.auditPage.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                            {t.admin.auditPage.liveMonitoring} • {t.admin.auditPage.realtimeMode}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none min-w-[280px]">
                        <Search size={16} className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-white/30`} />
                        <input
                            type="text"
                            placeholder={t.admin.auditPage.searchPlaceholder}
                            className={`w-full bg-white/5 border border-white/10 rounded-2xl ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-sm text-white focus:border-gold-500 focus:bg-white/10 transition-all outline-none backdrop-blur-md`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                        <select
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                            className={`bg-transparent text-[10px] text-white/60 px-4 py-2 outline-none cursor-pointer font-black uppercase tracking-widest border-r border-white/10`}
                        >
                            <option value="ALL" className="bg-[#151310]">{t.admin.auditPage.entities.ALL}</option>
                            <option value="STORE" className="bg-[#151310]">{t.admin.auditPage.entities.STORE}</option>
                            <option value="ORDER" className="bg-[#151310]">{t.admin.auditPage.entities.ORDER}</option>
                            <option value="SHIPMENT" className="bg-[#151310]">{t.admin.auditPage.entities.SHIPMENT}</option>
                            <option value="USER" className="bg-[#151310]">{t.admin.auditPage.entities.USER}</option>
                            <option value="VIOLATION" className="bg-[#151310]">{t.admin.auditPage.entities.VIOLATION}</option>
                            <option value="RECOVERY" className="bg-[#151310]">{t.admin.auditPage.entities.AccountRecoveryRequest}</option>
                            <option value="CHAT" className="bg-[#151310]">{t.admin.auditPage.entities.OrderChat}</option>
                            <option value="SYSTEM" className="bg-[#151310]">{t.admin.auditPage.entities.SYSTEM}</option>
                        </select>

                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="bg-transparent text-[10px] text-gold-500/80 px-4 py-2 outline-none cursor-pointer font-black uppercase tracking-widest"
                        >
                            <option value="ALL" className="bg-[#151310]">{isAr ? 'كل العمليات' : 'All Actions'}</option>
                            <option value="CREATE" className="bg-[#151310]">Create</option>
                            <option value="UPDATE" className="bg-[#151310]">Update</option>
                            <option value="DELETE" className="bg-[#151310]">Delete</option>
                            <option value="STATUS_CHANGE" className="bg-[#151310]">Status</option>
                            <option value="LOGIN" className="bg-[#151310]">Login</option>
                            <option value="FINANCIAL" className="bg-[#151310]">Financial</option>
                            <option value="AUTO_UNBAN" className="bg-[#151310]">Auto Unban</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 text-black font-black rounded-2xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-gold-500/20 active:scale-95"
                    >
                        <Download size={14} />
                        CSV
                    </button>
                </div>
            </div>

            {/* Audit List - Glassmorphism Container */}
            <GlassCard className="p-0 border-white/10 bg-[#0A0907]/60 backdrop-blur-2xl overflow-hidden rounded-[2rem]">
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className={`p-6 text-xs font-black uppercase tracking-[0.2em] text-white/30 ${isAr ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gold-500" />
                                        {t.admin.auditPage.timestamp}
                                    </div>
                                </th>
                                <th className={`p-6 text-xs font-black uppercase tracking-[0.2em] text-white/30 ${isAr ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-gold-500" />
                                        {t.admin.auditPage.filterActor}
                                    </div>
                                </th>
                                <th className={`p-6 text-xs font-black uppercase tracking-[0.2em] text-white/30 ${isAr ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2">
                                        <Radio size={14} className="text-gold-500" />
                                        {t.admin.auditPage.filterAction}
                                    </div>
                                </th>
                                <th className={`p-6 text-xs font-black uppercase tracking-[0.2em] text-white/30 ${isAr ? 'text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-gold-500" />
                                        {t.admin.auditPage.filterEntity}
                                    </div>
                                </th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className={`group cursor-pointer transition-all hover:bg-white/[0.04] ${expandedLogId === log.id ? 'bg-white/[0.06]' : ''}`}
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                    >
                                        <td className="p-6">
                                            <div className="text-white font-medium text-sm">
                                                {new Date(log.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                                                    calendar: 'gregory', numberingSystem: 'latn'
                                                })}
                                            </div>
                                            <div className="text-white/20 text-[10px] font-mono mt-1">
                                                {new Date(log.timestamp).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                                    calendar: 'gregory', numberingSystem: 'latn',
                                                    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:border-gold-500/50 transition-colors shadow-inner">
                                                        <User size={18} />
                                                    </div>
                                                    {log.actorType === 'SYSTEM' && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center shadow-lg transform scale-90 border-2 border-[#151310]">
                                                            <Shield size={8} className="text-black" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-black text-white text-sm">
                                                        {log.actorType === 'SYSTEM' ? t.admin.auditPage.systemActor : log.actorName}
                                                    </div>
                                                    <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{log.actorType}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] border font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all hover:scale-105 ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-white/80 font-medium text-xs flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gold-500/40"></div>
                                                {log.metadata?.storeName ? (
                                                    <span className="flex flex-col">
                                                        <span className="text-white font-bold">{log.metadata.storeName}</span>
                                                        <span className="text-[10px] text-white/30 tracking-tighter uppercase">{log.entity}</span>
                                                    </span>
                                                ) : (
                                                    <span>{log.entity} {log.orderId ? `(#${log.orderId.split('-').pop()})` : ''}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-left">
                                            <div className={`p-2 rounded-full bg-white/5 text-white/20 group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-all ${expandedLogId === log.id ? 'rotate-180 text-gold-500 bg-gold-500/10' : ''}`}>
                                                <ChevronDown size={18} />
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Detailed View Panel */}
                                    <AnimatePresence>
                                        {expandedLogId === log.id && (
                                            <tr>
                                                <td colSpan={5} className="p-0 border-b border-white/10 shadow-inner overflow-hidden">
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="bg-[#0A0907] p-8"
                                                    >
                                                        <div className="grid lg:grid-cols-12 gap-10">
                                                              {/* Change Visualizer */}
                                                              <div className="lg:col-span-7 space-y-6">
                                                                <h4 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                                                                    <Database size={12} className="text-gold-500" />
                                                                    {t.admin.auditPage.changes} (Visual Diff)
                                                                </h4>
                                                                
                                                                <div className="bg-white/[0.03] rounded-[2rem] border border-white/10 p-6 backdrop-blur-md">
                                                                    {renderStateDiff(log)}
                                                                </div>

                                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                                    <div className={`mt-4 p-5 rounded-3xl border ${log.action === 'LOGIN' ? 'bg-cyan-500/5 border-cyan-500/10' : 'bg-white/[0.01] border-white/5'}`}>
                                                                        <h5 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                                            <Shield size={12} className={log.action === 'LOGIN' ? 'text-cyan-400' : 'text-gold-500'} />
                                                                            {t.admin.auditPage.metadata}
                                                                        </h5>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                            {Object.entries(log.metadata).map(([k, v]: [string, any]) => (
                                                                                <div key={k} className="flex flex-col p-3 rounded-2xl bg-black/20 border border-white/[0.03]">
                                                                                    <span className="text-[9px] text-white/20 font-black uppercase tracking-wider mb-1">
                                                                                        {(t.admin.auditPage.metadataLabels as any)[k] || k}
                                                                                    </span>
                                                                                    <span className="text-xs text-white/70 font-mono truncate select-all flex items-center justify-between group/meta" title={String(v)}>
                                                                                        {String(v)}
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                navigator.clipboard.writeText(String(v));
                                                                                            }}
                                                                                            className="opacity-0 group-hover/meta:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                                                                                        >
                                                                                            <Download size={10} className="text-gold-500 rotate-90" />
                                                                                        </button>
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Meta Details Side Panel */}
                                                            <div className="lg:col-span-5 flex flex-col gap-8">
                                                                <div className="space-y-6">
                                                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                                                            <HelpCircle size={12} className="text-gold-500" />
                                                                            {t.admin.auditPage.reason}
                                                                        </h4>
                                                                        <p className="text-white text-sm leading-relaxed font-bold bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-inner">
                                                                            {getReasonLabel(log.reason)}
                                                                        </p>
                                                                    </div>

                                                                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                                                            <Shield size={12} className="text-gold-500" />
                                                                            {t.admin.auditPage.actorId}
                                                                        </h4>
                                                                        <p className="text-white/60 text-xs font-mono break-all bg-black/40 p-3 rounded-xl border border-white/5">
                                                                            {log.actorId}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mt-auto bg-gold-500/5 p-4 rounded-2xl border border-gold-500/10 flex items-center gap-4">
                                                                    <div className="p-2 bg-gold-500/10 rounded-lg">
                                                                        <Clock size={16} className="text-gold-500" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[9px] text-gold-500/60 font-black uppercase tracking-widest">Global Timestamp</div>
                                                                        <div className="text-white/80 text-xs font-mono">{log.timestamp}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Tablet View - Card Based */}
                <div className="lg:hidden p-4 space-y-4">
                    {filteredLogs.map((log) => (
                        <div 
                            key={log.id} 
                            className="bg-white/5 rounded-3xl border border-white/10 p-5 space-y-4 active:scale-[0.98] transition-transform"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shadow-inner">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <div className="font-black text-white text-sm">{log.actorName}</div>
                                        <div className="text-[10px] text-white/30 uppercase tracking-widest">{log.actorType}</div>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-xl text-[10px] border font-black uppercase tracking-tighter shadow-lg ${getActionColor(log.action)}`}>
                                    {getActionLabel(log.action)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                <div className="text-white/40 text-[10px] flex items-center gap-2">
                                    <Clock size={12} />
                                    {new Date(log.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                                        hour: '2-digit', minute: '2-digit', hour12: true,
                                        calendar: 'gregory', numberingSystem: 'latn'
                                    })}
                                </div>
                                <div className="text-gold-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                                    View Details
                                    <ChevronDown size={14} className={expandedLogId === log.id ? 'rotate-180' : ''} />
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedLogId === log.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="space-y-4 pt-4 overflow-hidden"
                                    >
                                        <div className="p-5 bg-white/[0.02] rounded-3xl border border-white/5 shadow-2xl">
                                            <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-gold-500"></div>
                                                {t.admin.auditPage.reason}
                                            </div>
                                            <div className="text-white text-xs font-black leading-relaxed">{getReasonLabel(log.reason)}</div>
                                        </div>
                                        
                                        <div className="p-5 bg-white/[0.02] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                                            <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-1 h-1 rounded-full bg-gold-500"></div>
                                                {t.admin.auditPage.changes}
                                            </div>
                                            <div className="scale-[0.9] origin-top-left -mx-4">
                                                {renderStateDiff(log)}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Phase 4: Pagination Sentinel and Loading Status */}
                <div 
                    ref={observerTarget} 
                    className="p-10 text-center flex flex-col items-center justify-center gap-4 border-t border-white/5"
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            >
                                <Loader2 className="text-gold-500" size={32} />
                            </motion.div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                                {t.admin.auditPage.loadingMore}
                            </p>
                        </div>
                    ) : !hasMore && logs.length > 0 ? (
                        <div className="flex flex-col items-center gap-2">
                             <div className="h-0.5 w-12 bg-white/10 rounded-full mb-2"></div>
                             <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">
                                {t.admin.auditPage.endOfLogs}
                             </p>
                        </div>
                    ) : null}
                </div>

                {filteredLogs.length === 0 && !isLoading && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5 mb-2">
                            <Database size={24} className="text-white/10" />
                        </div>
                        <p className="text-white/30 text-sm font-medium">{t.admin.auditPage.noLogs}</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
