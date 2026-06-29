import type { DashboardStats } from '../stores/useAdminStore';

export type DashboardStatsErrorCode =
  | 'NO_TOKEN'
  | 'UNAUTHORIZED'
  | 'NETWORK'
  | 'HTTP_ERROR'
  | null;

export function normalizeDashboardStats(data: unknown): DashboardStats {
  const raw = (data && typeof data === 'object' ? data : {}) as Partial<DashboardStats>;

  return {
    totalSales: Number(raw.totalSales ?? 0),
    totalCommission: Number(raw.totalCommission ?? 0),
    salesTrendPercent: Number(raw.salesTrendPercent ?? 0),
    totalOrders: Number(raw.totalOrders ?? 0),
    activeCustomers: Number(raw.activeCustomers ?? 0),
    activeStores: Number(raw.activeStores ?? 0),
    openDisputes: Number(raw.openDisputes ?? 0),
    salesTrend: Array.isArray(raw.salesTrend) ? raw.salesTrend : [],
    topStores: Array.isArray(raw.topStores) ? raw.topStores : [],
    statusDistribution: Array.isArray(raw.statusDistribution) ? raw.statusDistribution : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    recentOrders: Array.isArray(raw.recentOrders) ? raw.recentOrders : [],
  };
}

export function classifyDashboardFetchError(err: unknown): DashboardStatsErrorCode {
  if (!err || typeof err !== 'object') return 'HTTP_ERROR';

  const axiosErr = err as { response?: { status?: number }; code?: string; message?: string };
  if (!axiosErr.response) {
    if (axiosErr.code === 'ERR_NETWORK' || axiosErr.message?.includes('Network')) {
      return 'NETWORK';
    }
    return 'NETWORK';
  }

  if (axiosErr.response.status === 401) return 'UNAUTHORIZED';
  return 'HTTP_ERROR';
}
