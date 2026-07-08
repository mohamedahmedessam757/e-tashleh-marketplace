export type OrderActiveSlaUrgency = 'normal' | 'warning' | 'critical' | 'expired';
export type OrderActiveSlaSource = 'config' | 'stored';

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

export interface OrderDurationSettings {
  assemblyCartDays: number;
  returnWindowHours: number;
  disputeWindowHours: number;
  paymentTimeoutHours: number;
  reminderDaysBeforeAssemblyExpiry: number[];
  offerCollectionHours: number;
  offerSelectionHours: number;
  preparationHours: number;
  delayedPreparationGraceHours: number;
  shippingSlaHours: number;
  correctionPeriodHours: number;
  nonMatchingGraceMinutes: number;
}

export const DEFAULT_ORDER_DURATIONS: OrderDurationSettings = {
  assemblyCartDays: 7,
  returnWindowHours: 24,
  disputeWindowHours: 24,
  paymentTimeoutHours: 24,
  reminderDaysBeforeAssemblyExpiry: [5, 6],
  offerCollectionHours: 24,
  offerSelectionHours: 24,
  preparationHours: 48,
  delayedPreparationGraceHours: 24,
  shippingSlaHours: 72,
  correctionPeriodHours: 48,
  nonMatchingGraceMinutes: 2,
};
