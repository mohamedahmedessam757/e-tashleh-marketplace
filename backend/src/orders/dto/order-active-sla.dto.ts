export type OrderActiveSlaUrgency = 'normal' | 'warning' | 'critical' | 'expired';
export type OrderActiveSlaSource = 'config' | 'stored' | 'deadline';

export interface OrderActiveSla {
  phase: string;
  endsAt: string;
  labelKey: string;
  urgency: OrderActiveSlaUrgency;
  progressPercent: number;
  source: OrderActiveSlaSource;
  startedAt?: string;
  totalMs?: number;
}
