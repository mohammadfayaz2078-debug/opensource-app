import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';

const generatePageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

export default function StockBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [expanded, setExpanded] = useState({});

  const fetchBalances = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      const res = await api.get('/stock/balances', { params });
      setBalances(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => { setCurrentPage(1); fetchBalances(1); }, 300);
    return () => clearTimeout(t);
  }, [search, perPage]);

  // Group balances by product_id
  const grouped = balances.reduce((acc, b) => {
    const pid = b.product_id;
    if (!acc[pid]) {
      acc[pid] = {
        product: b.product,
        last_movement_at: b.last_movement_at,
        categories: [],
      };
    }
    acc[pid].categories.push({
      id: b.id,
      unit_category: b.unitCategory?.name || '—',
      quantity: parseFloat(b.quantity),
      avg_cost: parseFloat(b.avg_cost),
      total_value: parseFloat(b.total_value),
      reference_unit: b.reference_unit_name || '—',
    });
    // Keep latest movement date
    if (b.last_movement_at && (!acc[pid].last_movement_at || new Date(b.last_movement_at) > new Date(acc[pid].last_movement_at))) {
      acc[pid].last_movement_at = b.last_movement_at;
    }
    return acc;
  }, {});

  const toggleExpand = (pid) => setExpanded(prev => ({ ...prev, [pid]: !prev[pid] }));

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Stock Balances</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total > 0 ? `${total} total record${total !== 1 ? 's' : ''}` : 'Current inventory levels per product'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 p-3">
        <div className="relative w-full sm:max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-700 text-sm">Loading stock balances...</span>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm text-gray-700">
              {search ? 'No stock balances match your search.' : 'No stock balances found.'}
            </p>
          </div>
        ) : (
          <>
            {/* ─── Desktop Table (lg+) ─── */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(grouped).map(([pid, group]) => {
                    const isExpanded = expanded[pid];
                    const totalQty = group.categories.reduce((s, c) => s + c.quantity, 0);
                    const totalValue = group.categories.reduce((s, c) => s + c.total_value, 0);
                    const avgCost = totalQty > 0 ? totalValue / totalQty : 0;
                    return (
                      <React.Fragment key={pid}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(pid)}>
                          <td className="px-4 py-2.5 text-sm text-gray-400">
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{group.product?.name || '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{formatNumber(totalQty)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500">
                            {group.categories.length > 1 ? `${group.categories.length} categories` : group.categories[0]?.reference_unit || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{formatNumber(avgCost)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">{formatNumber(totalValue)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-500">{formatDate(group.last_movement_at)}</td>
                        </tr>
                        {isExpanded && group.categories.map(cat => (
                          <tr key={cat.id} className="bg-blue-50/50">
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2 pl-10 text-sm text-gray-600">{cat.unit_category}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right font-medium">{formatNumber(cat.quantity)}</td>
                            <td className="px-4 py-2 text-sm text-[#007c89] font-medium">{cat.reference_unit}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{formatNumber(cat.avg_cost)}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 text-right">{formatNumber(cat.total_value)}</td>
                            <td className="px-4 py-2"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Mobile Cards (lg:hidden) ─── */}
            <div className="lg:hidden divide-y divide-gray-100">
              {Object.entries(grouped).map(([pid, group]) => {
                const isExpanded = expanded[pid];
                const totalQty = group.categories.reduce((s, c) => s + c.quantity, 0);
                const totalValue = group.categories.reduce((s, c) => s + c.total_value, 0);
                const avgCost = totalQty > 0 ? totalValue / totalQty : 0;
                return (
                  <div key={pid} className="p-4 hover:bg-gray-50/50 transition-colors">
                    {/* Product Header Row */}
                    <button
                      onClick={() => toggleExpand(pid)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {group.product?.name || '—'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {group.categories.length > 1 ? `${group.categories.length} unit categories` : group.categories[0]?.unit_category || '—'}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-bold text-gray-900">{formatNumber(totalQty)}</div>
                          <div className="text-[10px] text-gray-500">units</div>
                        </div>
                      </div>

                      {/* Summary Row */}
                      <div className="flex items-center justify-between mt-2 px-0">
                        <div className="text-xs text-gray-500">
                          Avg Cost: <span className="font-medium text-gray-700">{formatNumber(avgCost)}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Value: <span className="font-medium text-gray-700">{formatNumber(totalValue)}</span>
                        </div>
                      </div>

                      {/* Last Movement */}
                      <div className="text-[10px] text-gray-400 mt-1">
                        Last movement: {formatDate(group.last_movement_at)}
                      </div>

                      {/* Expand/Collapse Indicator */}
                      <div className="flex items-center gap-1 mt-2">
                        <svg className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-[10px] text-gray-400">
                          {isExpanded ? 'Hide categories' : `${group.categories.length} categor${group.categories.length === 1 ? 'y' : 'ies'}`}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Categories */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                        {group.categories.map(cat => (
                          <div key={cat.id} className="bg-blue-50/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-gray-700">{cat.unit_category}</span>
                              <span className="text-xs font-semibold text-[#007c89]">{cat.reference_unit}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <div className="text-[10px] text-gray-500">Qty</div>
                                <div className="text-xs font-semibold text-gray-900">{formatNumber(cat.quantity)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500">Avg Cost</div>
                                <div className="text-xs text-gray-700">{formatNumber(cat.avg_cost)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500">Value</div>
                                <div className="text-xs font-semibold text-gray-900">{formatNumber(cat.total_value)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ─── Pagination ─── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500 text-center sm:text-left">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => fetchBalances(1)} disabled={currentPage === 1}
                className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏮</button>
              <button onClick={() => fetchBalances(currentPage - 1)} disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">◀</button>
              {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button key={p} onClick={() => fetchBalances(p)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
                )
              )}
              <button onClick={() => fetchBalances(currentPage + 1)} disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">▶</button>
              <button onClick={() => fetchBalances(totalPages)} disabled={currentPage === totalPages}
                className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏭</button>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <span className="text-xs text-gray-500">Show</span>
              <select value={perPage}
                onChange={(e) => { const v = parseInt(e.target.value); setPerPage(v); setCurrentPage(1); fetchBalances(1, v); }}
                className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-gray-500">per page</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
