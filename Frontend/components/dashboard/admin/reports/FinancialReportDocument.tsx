import React from 'react';
import type { AdminFinancialReportId } from '../../../../stores/useAdminStore';
import {
  formatReportCell,
  getDetailColumns,
  getSummaryEntries,
} from '../../../../utils/financialReportExport';

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
    reportRef?: string;
    verifiedDocument?: string;
    types?: Record<string, string>;
    columns?: Record<string, string>;
    summaryCards?: Record<string, string>;
  };
  startDate?: string;
  endDate?: string;
  period?: string;
}

const GOLD = '#B8860B';
const GOLD_LIGHT = '#D4AF37';
const INK = '#111827';
const MUTED = '#6b7280';

function labelFor(
  key: string,
  columnLabels: Record<string, string>,
  summaryCards?: Record<string, string>,
): string {
  return summaryCards?.[key] || columnLabels[key] || key;
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
  const reportRef = `RPT-${String(reportId).slice(0, 12).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const periodStart = summary.periodStart || startDate;
  const periodEnd = summary.periodEnd || endDate;
  let periodText = labels.allTime || (isAr ? 'كل الفترات' : 'All time');
  if (periodStart || periodEnd) {
    periodText = `${labels.from || (isAr ? 'من' : 'From')} ${
      periodStart
        ? new Date(String(periodStart)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE')
        : '—'
    } — ${labels.to || (isAr ? 'إلى' : 'To')} ${
      periodEnd ? new Date(String(periodEnd)).toLocaleDateString(isAr ? 'ar-AE' : 'en-AE') : '—'
    }`;
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
        background: '#f3f4f6',
        color: INK,
        fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif',
        padding: '28px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(17,24,39,0.08)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={{ height: '6px', background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})` }} />

        <div style={{ padding: '28px 32px 24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  border: `2px solid ${GOLD_LIGHT}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                }}
              >
                <img
                  src="/logo.webp"
                  alt="E-Tashleh"
                  crossOrigin="anonymous"
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: MUTED, fontWeight: 700 }}>
                  {labels.platform || 'E-Tashleh.net — ELLIPP FZ LLC'}
                </p>
                <h1
                  style={{
                    margin: '4px 0 0',
                    fontSize: '24px',
                    fontWeight: 900,
                    color: GOLD,
                    letterSpacing: '0.04em',
                  }}
                >
                  E-TASHLEH
                </h1>
              </div>
            </div>

            <div
              style={{
                textAlign: isAr ? 'left' : 'right',
                minWidth: 220,
                padding: '12px 16px',
                borderRadius: 12,
                background: '#fafafa',
                border: '1px solid #e5e7eb',
              }}
            >
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: GOLD, textTransform: 'uppercase' }}>
                {title}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '10px', color: MUTED }}>
                {labels.reportRef || (isAr ? 'مرجع التقرير' : 'Report ref')}:{' '}
                <span style={{ fontFamily: 'monospace', color: INK, fontWeight: 700 }}>{reportRef}</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: MUTED }}>
                {labels.generatedAt || (isAr ? 'تاريخ التوليد' : 'Generated')}: {generatedAt}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: MUTED }}>
                {labels.period || (isAr ? 'الفترة' : 'Period')}: {periodText}
              </p>
            </div>
          </div>

          {summaryEntries.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div style={{ width: 4, height: 18, borderRadius: 999, background: GOLD }} />
                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    color: GOLD,
                    textTransform: 'uppercase',
                  }}
                >
                  {labels.summarySection || (isAr ? 'ملخص المؤشرات' : 'Summary KPIs')}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                {summaryEntries.map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                      borderInlineStart: `4px solid ${GOLD_LIGHT}`,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        fontWeight: 800,
                        color: MUTED,
                        textTransform: 'uppercase',
                        lineHeight: 1.4,
                      }}
                    >
                      {labelFor(key, columnLabels, labels.summaryCards)}
                    </p>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: '20px',
                        fontWeight: 900,
                        color: INK,
                        fontFamily: 'monospace',
                      }}
                    >
                      {formatReportCell(key, val, isAr, columnLabels)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 4, height: 18, borderRadius: 999, background: GOLD }} />
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '0.1em',
                  color: GOLD,
                  textTransform: 'uppercase',
                }}
              >
                {labels.detailsSection || (isAr ? 'تفاصيل التقرير' : 'Report details')}
              </p>
            </div>

            {columns.length === 0 || rows.length === 0 ? (
              <p style={{ color: MUTED, fontSize: '12px', padding: '12px 0' }}>
                {isAr ? 'لا توجد صفوف تفصيلية' : 'No detail rows'}
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        style={{
                          background: GOLD,
                          color: '#fff',
                          padding: '11px 10px',
                          textAlign: isAr ? 'right' : 'left',
                          fontWeight: 800,
                          border: '1px solid #a67c00',
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
                            padding: '9px 10px',
                            borderBottom: '1px solid #e5e7eb',
                            textAlign:
                              col === 'amount' || col.includes('Amount')
                                ? isAr
                                  ? 'left'
                                  : 'right'
                                : isAr
                                  ? 'right'
                                  : 'left',
                            fontFamily:
                              col === 'amount' || col.includes('Amount') ? 'monospace' : 'inherit',
                            color: '#374151',
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
        </div>

        <div
          style={{
            padding: '16px 32px 24px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa',
            fontSize: '10px',
            color: '#9ca3af',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ margin: 0 }}>
              {labels.rowCount || (isAr ? 'عدد الصفوف' : 'Row count')}:{' '}
              <strong style={{ color: INK }}>{rows.length}</strong>
            </p>
            {rows.length >= 500 && (
              <p style={{ margin: 0 }}>
                {labels.truncatedNote?.replace('{n}', '500') ||
                  (isAr ? 'يعرض أول 500 صف فقط' : 'Showing first 500 rows only')}
              </p>
            )}
          </div>
          <p style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            {labels.platform || 'E-Tashleh.net — ELLIPP FZ LLC'} ·{' '}
            {labels.verifiedDocument ||
              (isAr ? 'وثيقة مالية إلكترونية موثّقة' : 'Verified electronic financial document')}
          </p>
        </div>
      </div>
    </div>
  );
};
