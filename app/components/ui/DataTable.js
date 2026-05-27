'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

function SortIcon({ direction }) {
  if (direction === 'asc') return <ChevronUp size={14} />;
  if (direction === 'desc') return <ChevronDown size={14} />;
  return <ChevronsUpDown size={14} />;
}

export default function DataTable({
  columns, data, pageSize = 10, sortable = true,
  onRowClick, selectedRows, onSelectRow, onSelectAll,
  emptyMessage = 'No data found', emptyIcon: EmptyIcon,
  actions, loading, className = '',
}) {
  const [sort, setSort] = useState({ key: null, dir: null });
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (!sortable) return;
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  };

  const processed = useMemo(() => {
    let items = [...data];
    if (sort.key && sort.dir) {
      items.sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = processed.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const allSelected = selectedRows?.length === processed.length && processed.length > 0;

  if (loading) {
    return (
      <div className="data-table-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            {columns.map((col, j) => (
              <div key={j} className="skeleton-cell" style={{ width: col.width || 'auto' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`data-table ${className}`}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {onSelectRow && (
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onSelectAll?.(allSelected ? [] : processed.map(r => r.id || r._id))}
                    className="table-checkbox"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${sortable && col.sortable !== false ? 'th-sortable' : ''} ${col.align ? `th-${col.align}` : ''}`}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  onClick={() => sortable && col.sortable !== false && handleSort(col.key)}
                >
                  <div className="th-content">
                    <span>{col.label}</span>
                    {sortable && col.sortable !== false && sort.key === col.key && (
                      <SortIcon direction={sort.dir} />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="th-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectRow ? 1 : 0) + (actions ? 1 : 0)}>
                  <div className="table-empty">
                    {EmptyIcon && <EmptyIcon size={32} />}
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : pageData.map((row, i) => (
              <tr
                key={row.id || i}
                className={`${onRowClick ? 'tr-clickable' : ''} ${selectedRows?.includes(row.id) ? 'tr-selected' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {onSelectRow && (
                  <td className="td-checkbox" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows?.includes(row.id)}
                      onChange={() => onSelectRow(row.id)}
                      className="table-checkbox"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.align ? `td-${col.align}` : ''}
                    style={col.cellStyle}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
                {actions && (
                  <td className="td-actions" onClick={e => e.stopPropagation()}>
                    {typeof actions === 'function' ? actions(row) : actions}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <span className="pagination-info">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, processed.length)} of {processed.length}
          </span>
          <div className="pagination-controls">
            <button className="pagination-btn" onClick={() => setPage(0)} disabled={safePage === 0}>
              <ChevronsLeft size={14} />
            </button>
            <button className="pagination-btn" onClick={() => setPage(safePage - 1)} disabled={safePage === 0}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(safePage - 2, totalPages - 5));
              const pageNum = start + i;
              return (
                <button
                  key={pageNum}
                  className={`pagination-btn ${pageNum === safePage ? 'pagination-active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button className="pagination-btn" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages - 1}>
              <ChevronRight size={14} />
            </button>
            <button className="pagination-btn" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
