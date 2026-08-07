import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, type LucideIcon } from 'lucide-react';

export type BillingNavGroup = 'platform' | 'customer' | 'merchant';

export type BillingNavTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  group: BillingNavGroup;
  isLocked?: boolean;
};

type GroupMeta = {
  key: BillingNavGroup;
  label: string;
};

type AdminBillingTabNavProps = {
  tabs: BillingNavTab[];
  groups: GroupMeta[];
  activeTab: string;
  onChange: (tabId: any) => void;
};

export const AdminBillingTabNav: React.FC<AdminBillingTabNavProps> = ({
  tabs,
  groups,
  activeTab,
  onChange,
}) => {
  const activeGroupKey = useMemo(() => {
    return (tabs.find((t) => t.id === activeTab)?.group || groups[0]?.key || 'platform') as BillingNavGroup;
  }, [tabs, activeTab, groups]);

  const [segment, setSegment] = useState<BillingNavGroup>(activeGroupKey);

  useEffect(() => {
    setSegment(activeGroupKey);
  }, [activeGroupKey]);

  const visibleGroups = useMemo(
    () => groups.filter((g) => tabs.some((t) => t.group === g.key)),
    [groups, tabs],
  );

  const secondaryTabs = useMemo(
    () => tabs.filter((t) => t.group === segment),
    [tabs, segment],
  );

  const handleSegmentChange = (key: BillingNavGroup) => {
    setSegment(key);
    const firstInGroup = tabs.find((t) => t.group === key);
    if (firstInGroup && firstInGroup.id !== activeTab) {
      onChange(firstInGroup.id);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {/* Level 1 — segment control */}
      <div className="relative flex p-1.5 bg-[#1A1814] rounded-2xl border border-white/10 shadow-inner w-full lg:w-fit overflow-hidden">
        {visibleGroups.map((group) => {
          const isActive = segment === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => handleSegmentChange(group.key)}
              className={`relative flex-1 lg:flex-none px-5 sm:px-8 py-3 text-xs font-black uppercase tracking-wider transition-colors z-10 whitespace-nowrap ${
                isActive ? 'text-[#1A1814]' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="billingSegmentPill"
                  className="absolute inset-0 bg-gold-500 rounded-xl shadow-lg shadow-gold-500/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">{group.label}</span>
            </button>
          );
        })}
      </div>

      {/* Level 2 — sub-tabs for active segment */}
      <div className="flex gap-2 p-2 bg-[#151310]/80 border border-white/5 rounded-2xl overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth">
        {secondaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`snap-start flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-gold-500 text-black border-gold-500 shadow-md shadow-gold-500/20'
                  : 'bg-white/[0.03] text-white/45 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10'
              } ${tab.isLocked ? 'opacity-70' : ''}`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.isLocked && (
                <Lock size={11} className={isActive ? 'text-black/50' : 'text-gold-500/50'} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
