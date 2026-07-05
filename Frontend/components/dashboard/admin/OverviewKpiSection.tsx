import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

export interface OverviewStatItem {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  color: string;
}

interface OverviewKpiSectionProps {
  title: string;
  items: OverviewStatItem[];
  defaultOpen?: boolean;
  renderValue?: (item: OverviewStatItem) => React.ReactNode;
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  renderValue,
}: OverviewStatItem & { renderValue?: (item: OverviewStatItem) => React.ReactNode }) {
  const item = { label, value, subValue, icon: Icon, color };
  return (
    <GlassCard className="p-6 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300 bg-gradient-to-br from-white/[0.04] to-transparent border-white/5">
      <div
        className="absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 rounded-full -mr-12 -mt-12 group-hover:opacity-20 transition-opacity duration-700"
        style={{ backgroundColor: color }}
      />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start gap-3">
          <p className="text-[10px] font-black text-white/30 uppercase leading-relaxed">{label}</p>
          <div
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors shrink-0"
            style={{ color }}
          >
            <Icon size={18} />
          </div>
        </div>
        <div className="mt-4">
          {renderValue ? renderValue(item) : (
            <h3 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{value}</h3>
          )}
          {subValue && (
            <p className="text-[10px] font-bold text-white/40 mt-1 uppercase leading-relaxed">{subValue}</p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export function OverviewKpiSection({
  title,
  items,
  defaultOpen = false,
  renderValue,
}: OverviewKpiSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[2rem] border border-white/5 bg-[#151310]/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-xs font-black text-gold-500 uppercase tracking-widest">{title}</span>
        <ChevronDown size={16} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <StatCard key={item.label} {...item} renderValue={renderValue} />
          ))}
        </div>
      )}
    </div>
  );
}

export { StatCard as OverviewStatCard };
