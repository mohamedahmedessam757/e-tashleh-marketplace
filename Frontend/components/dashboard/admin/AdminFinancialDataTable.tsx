import React from 'react';

export interface AdminTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  sticky?: boolean;
}

interface AdminFinancialDataTableProps<T extends Record<string, unknown>> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
}

export function AdminFinancialDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyMessage = '—',
  loadingMessage = 'Loading…',
}: AdminFinancialDataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left whitespace-nowrap min-w-[640px]">
        <thead className="bg-white/[0.03] text-[10px] text-white/30 uppercase font-black">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-5 ${col.sticky ? 'sticky left-0 z-10 bg-[#151310]' : ''} ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-8 py-16 text-center text-white/20 text-xs uppercase animate-pulse">
                {loadingMessage}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-8 py-16 text-center text-white/10 text-xs uppercase">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={rowKey(row, idx)} className="hover:bg-white/[0.02] transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-xs text-white/70 ${col.sticky ? 'sticky left-0 z-10 bg-[#0F0E0C]/95' : ''} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
