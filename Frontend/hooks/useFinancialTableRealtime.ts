import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const DEFAULT_CHANNELS = [
  'users',
  'stores',
  'wallet_transactions',
  'withdrawal_requests',
  'return_requests',
  'invoices',
  'payment_transactions',
] as const;

export function useFinancialTableRealtime(
  onRefetch: () => void,
  channels: readonly string[] = DEFAULT_CHANNELS,
  debounceMs = 1200,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  useEffect(() => {
    const scheduleRefetch = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onRefetchRef.current(), debounceMs);
    };

    const subs = channels.map((table) =>
      supabase
        .channel(`fin-table-${table}-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefetch)
        .subscribe(),
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      subs.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [channels, debounceMs]);
}
