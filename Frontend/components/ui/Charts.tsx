import React, { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// --- LINE CHART ---
interface LineChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = memo(({
  data,
  labels,
  color = '#A88B3E',
  height = 250
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-white/20">No Data</div>;

  const max = Math.max(...data) * 1.1; // Add 10% headroom
  const min = 0;
  const range = max - min || 1;
  const isUpdate = hasAnimatedRef.current;

  // Generate Path
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full relative select-none contain-paint" style={{ height }}>
      {/* Y-Axis Grid Lines (Background) */}
      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-white/20 font-mono pointer-events-none pb-6">
        {[100, 75, 50, 25, 0].map((p) => (
          <div key={p} className="w-full border-b border-white/5 relative">
            <span className="absolute -top-3 right-0 bg-[#151310]/80 px-1">
              {Math.round(max * (p / 100)).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible relative z-10">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill Area */}
        <motion.path
          d={`M0,100 ${points} L100,100 Z`}
          fill="url(#lineGradient)"
          initial={isUpdate ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: isUpdate ? 0.25 : 1.5 }}
        />

        {/* Stroke Line — no SVG feGaussianBlur (scroll/compositor killer) */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={isUpdate ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: isUpdate ? 0.35 : 2, ease: "easeInOut" }}
        />

        {/* Hover Points */}
        {data.map((val, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((val - min) / range) * 100;
          return (
            <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              <circle
                cx={x} cy={y} r="3"
                fill="#1A1814"
                stroke={color}
                strokeWidth="1.5"
                className="cursor-pointer hover:scale-150 transition-transform duration-200"
                style={{ opacity: hoveredIndex === i ? 1 : 0 }}
              />
              {hoveredIndex === i && (
                <foreignObject x={x > 80 ? x - 25 : x - 5} y={y - 25} width="50" height="30">
                  <div className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg text-center">
                    {val}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {labels && (
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] text-white/30 pt-2 font-mono">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
});

LineChart.displayName = 'LineChart';

// --- DONUT CHART ---
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = memo(({ data, size = 180 }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let cumulativePercent = 0;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  const isUpdate = hasAnimatedRef.current;

  return (
    <div className="relative flex items-center justify-center group contain-paint" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-white/5 opacity-50" />

      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full overflow-visible">
        {data.map((slice, i) => {
          if (slice.value === 0) return null;
          const startPercent = cumulativePercent;
          const slicePercent = slice.value / total;
          cumulativePercent += slicePercent;

          return (
            <motion.circle
              key={`${slice.label}-${i}`}
              cx="0" cy="0" r="0.8"
              fill="none"
              stroke={slice.color}
              strokeWidth="0.25"
              strokeDasharray={`${slicePercent * 5.02} 5.02`}
              strokeDashoffset={-startPercent * 5.02}
              initial={isUpdate ? false : { opacity: 0, strokeDasharray: `0 5.02` }}
              animate={{ opacity: 1, strokeDasharray: `${slicePercent * 5.02} 5.02` }}
              transition={{
                duration: isUpdate ? 0.3 : 0.7,
                delay: isUpdate ? 0 : Math.min(i * 0.08, 0.5),
                ease: "easeOut",
              }}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
        <div className="text-center bg-[#151310] p-4 rounded-full border border-white/5 shadow-xl w-[70%] h-[70%] flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">{total}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>
    </div>
  );
});

DonutChart.displayName = 'DonutChart';

// --- BAR CHART ---
interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export const BarChart: React.FC<BarChartProps> = memo(({ data, height = 180, color = '#A88B3E' }) => {
  const values = data.map(d => d.value);
  const max = Math.max(...values) || 1;
  const isDense = data.length > 15;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  const isUpdate = hasAnimatedRef.current;

  return (
    <div className="w-full contain-paint" style={{ height }}>
      <div className={`flex items-end justify-between ${isDense ? 'gap-[1px]' : 'gap-3'} h-full w-full`}>
        {data.map((item, idx) => {
          const hPercent = (item.value / max) * 100;
          return (
            <div key={`${item.label}-${idx}`} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end min-w-0">
              <div className="relative w-full h-full flex items-end justify-center">
                <div className={`absolute inset-0 bg-white/5 rounded-t-[2px] w-full ${isDense ? 'max-w-full' : 'max-w-[32px]'} mx-auto`} />

                <motion.div
                  initial={isUpdate ? false : { height: 0 }}
                  animate={{ height: `${Math.max(hPercent, item.value > 0 ? 2 : 0)}%` }}
                  transition={
                    isUpdate
                      ? { duration: 0.28, ease: 'easeOut' }
                      : isDense
                        ? { duration: 0.45, delay: Math.min(idx * 0.012, 0.35), ease: 'easeOut' }
                        : { duration: 0.7, delay: idx * 0.04, ease: 'easeOut' }
                  }
                  className={`w-full ${isDense ? 'max-w-full' : 'max-w-[32px]'} rounded-t-[2px] relative group-hover:brightness-125 transition-[filter] duration-200`}
                  style={{
                    background: `linear-gradient(to top, ${color}30, ${color})`,
                    minHeight: item.value > 0 ? '2px' : '0px',
                  }}
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1A1814] border border-white/10 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-2xl pointer-events-none">
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-white/50">{item.label}</span>
                        <span className="text-gold-400">{item.value.toLocaleString()} AED</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <span className={`text-[8px] md:text-[9px] text-white/40 font-mono uppercase tracking-wider truncate w-full text-center group-hover:text-white transition-colors ${isDense && (idx % 7 !== 0) ? 'hidden' : ''}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

BarChart.displayName = 'BarChart';
