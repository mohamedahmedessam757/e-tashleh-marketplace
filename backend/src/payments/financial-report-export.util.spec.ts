import {
  buildExportMeta,
  buildStyledCsvPayload,
  buildSummaryRows,
  formatExportCell,
  getDetailColumnOrder,
  getSummaryKeysForReport,
  normalizeExportLang,
  resolveColumnLabel,
  resolveReportTitle,
  sanitizeExportFilename,
  GOLD_FILL,
  GOLD_HEADER_FONT,
} from './financial-report-export.util';

describe('financial-report-export.util', () => {
  it('returns platform revenue summary keys in order', () => {
    expect(getSummaryKeysForReport('platform-revenue-summary')).toEqual([
      'platformCommissions',
      'loyaltyReferralExpenses',
      'commissionRefunds',
      'netPlatformRevenue',
      'periodStart',
      'periodEnd',
    ]);
  });

  it('returns refunds summary keys', () => {
    expect(getSummaryKeysForReport('refunds-summary')).toEqual([
      'totalRefunds',
      'fullRefunds',
      'partialRefunds',
    ]);
  });

  it('builds localized summary rows for platform revenue', () => {
    const rows = buildSummaryRows(
      'platform-revenue-summary',
      {
        platformCommissions: 100,
        loyaltyReferralExpenses: 2,
        commissionRefunds: 0,
        netPlatformRevenue: 98,
      },
      'ar',
    );
    expect(rows.map((r) => r.label)).toEqual([
      'عمولات المنصة',
      'مصروف الولاء والإحالة',
      'عمولات مستردة',
      'صافي إيرادات المنصة',
    ]);
    expect(rows[0].value).toContain('100');
  });

  it('CSV export includes Arabic summary section', () => {
    const csv = buildStyledCsvPayload(
      'platform-revenue-summary',
      {
        generatedAt: '2026-07-22T12:00:00.000Z',
        summary: {
          platformCommissions: 100,
          loyaltyReferralExpenses: 2,
          commissionRefunds: 0,
          netPlatformRevenue: 98,
        },
        rows: [{ metric: 'platformCommissions', label: 'platformCommissions', amount: 100 }],
      },
      { startDate: '2026-06-21', endDate: '2026-07-22' },
      'ar',
    );
    expect(csv).toContain('عمولات المنصة');
    expect(csv).toContain('ملخص المؤشرات');
    expect(csv).toContain('تفاصيل التقرير');
  });

  it('sanitizes export filename', () => {
    expect(sanitizeExportFilename('platform-revenue-summary', 'csv')).toMatch(
      /^platform-revenue-summary_\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });

  it('normalizes lang to ar or en only', () => {
    expect(normalizeExportLang('en')).toBe('en');
    expect(normalizeExportLang('fr')).toBe('ar');
  });

  it('resolves report title in English', () => {
    expect(resolveReportTitle('refunds-summary', 'en')).toBe('Refunds Summary');
  });

  it('formats money cells with AED', () => {
    expect(formatExportCell('platformCommissions', 100, 'en')).toContain('AED');
  });

  it('resolves column labels', () => {
    expect(resolveColumnLabel('netPlatformRevenue', 'ar')).toBe('صافي إيرادات المنصة');
  });
});
