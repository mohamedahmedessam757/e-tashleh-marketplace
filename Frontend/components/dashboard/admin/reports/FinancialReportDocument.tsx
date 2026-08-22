import React from 'react';
import type { AdminFinancialReportId } from '../../stores/useAdminStore';
import { formatReportCell, getDetailColumns, getSummaryEntries } from '../../../utils/financialReportExport';

export interface FinancialReportDocumentProps {
  reportId: AdminFinancialReportId;
  reportData: any;
  isAr: boolean;
  labels: {
    platform?: string;
    generatedAt?: string;
    period?: string;
    allTime?: string;
    from?: string;
    to?: string;
    summarySection?: string;
    detailsSection?: string;
    rowCount?: string;
    truncatedNote?: string;
    types?: Record<string, string>;
    columns?: Record<string, string>;
  };
  startDate?: string;
  endDate?: string;
  period?: string;
}

export const FinancialReportDocument: React.FC<FinancialReportDocumentProps> = ({
  reportId,
  reportData,
  isAr,
  labels,
  startDate,
  endDate,
  period,
}) => {
  const columnLabels = labels.columns || {};
  const rows: Record<string, unknown>[] = Array.isArray(reportData?.rows)
    ? reportData.rows
    : Array.isArray(reportData)
      ? reportData
      : reportData?.data || [];
  const summary = (reportData?.summary || {}) as Record<string, unknown>;
  const summaryEntries = getSummaryEntries(reportId, summary);
  const columns = getDetailColumns(reportId, rows[0] || {});
  const title = labels.types?.[reportId] || reportId;
  const generatedAt = reportData?.generatedAt
    ? new Date(reportData.generatedAt).toLocaleString(isAr ? 'ar-AE' : 'en-AE')
    : new Date().toLocaleString(isAr ? 'ar-AE' : 'en-AE');

  const periodStart = summary.periodStart || startDate;
  const periodEnd = summary.periodEnd || endDate;
  let periodText = labels.allTime || (isAr ? 'كل الفترات' : 'All time');
  if (periodStart || periodEnd) {
    periodText = `${labels.from || (isAr ? 'من' : 'From')} ${periodStart ? new Date(String(periodStart)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE') : '—'} — ${labels.to || (isAr ? 'إلى' : 'To')} ${periodEnd ? new Date(String(periodEnd)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE') : '—'}`;
  } else if (period) {
    periodText = period;
  }

  return (
    <div
      className="rpt-print-root"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        width: '794px',
        minHeight: '1123px',
        background: '#ffffff',
        color: '#111827',
        fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif',
        padding: '32px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ borderTop: '4px solid #D4AF37', paddingTop: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="E-Tashleh" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            <div>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: 700 }}>
                {labels.platform || 'E-Tashleh.net — ELLIPP FZ LLC'}
              </p>
              <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 900, color: '#B8860B', textTransform: 'uppercase' }}>
                {title}
              </h1>
            </div>
          </div>
          <div style={{ textAlign: isAr ? 'left' : 'right', fontSize: '11px', color: '#6b7280' }}>
            <p style={{ margin: 0 }}>{labels.generatedAt || (isAr ? 'تاريخ التوليد' : 'Generated')}: {generatedAt}</p>
            <p style={{ margin: '4px 0 0' }}>{labels.period || (isAr ? 'الفترة' : 'Period')}: {periodText}</p>
          </div>
        </div>
      </div>

      {summaryEntries.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', color: '#B8860B', marginBottom: '12px', textTransform: 'uppercase' }}>
            {labels.summarySection || (isAr ? 'ملخص المؤشرات' : 'Summary KPIs')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            {summaryEntries.map(([key, val]) => (
              <div
                key={key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  background: '#fafafa',
                }}
              >
                <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                  {columnLabels[key] || key}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 900, color: '#111827', fontFamily: 'monospace' }}>
                  {formatReportCell(key, val, isAr, columnLabels)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', color: '#B8860B', marginBottom: '12px', textTransform: 'uppercase' }}>
          {labels.detailsSection || (isAr ? 'تفاصيل التقرير' : 'Report details')}
        </p>
        {columns.length === 0 || rows.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '12px' }}>{isAr ? 'لا توجد صفوف تفصيلية' : 'No detail rows'}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      background: '#D4AF37',
                      color: '#fff',
                      padding: '10px 8px',
                      textAlign: isAr ? 'right' : 'left',
                      fontWeight: 800,
                      border: '1px solid #c4a030',
                    }}
                  >
                    {columnLabels[col] || col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 ? '#f9fafb' : '#ffffff' }}>
                  {columns.map((col) => (
                    <td
                      key={col}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #e5e7eb',
                        textAlign: col === 'amount' || col.includes('Amount') ? (isAr ? 'left' : 'right') : isAr ? 'right' : 'left',
                        fontFamily: col === 'amount' || col.includes('Amount') ? 'monospace' : 'inherit',
                      }}
                    >
                      {formatReportCell(col, row[col], isAr, columnLabels)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af' }}>
        <p style={{ margin: 0 }}>
          {labels.rowCount || (isAr ? 'عدد الصفوف' : 'Row count')}: {rows.length}
        </p>
        {rows.length >= 500 && (
          <p style={{ margin: '4px 0 0' }}>
            {labels.truncatedNote?.replace('{n}', '500') ||
              (isAr ? 'يعرض أول 500 صف فقط' : 'Showing first 500 rows only')}
          </p>
        )}
        <p style={{ margin: '8px 0 0' }}>
          {labels.platform || 'E-Tashleh.net — ELLIPP FZ LLC'} · {isAr ? 'وثيقة مالية إلكترونية' : 'Verified electronic financial document'}
        </p>
      </div>
    </div>
  );
};
