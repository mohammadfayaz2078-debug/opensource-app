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

export default function StockTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);

  const fetchTransactions = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (movementFilter) params.movement_type = movementFilter;
      const res = await api.get('/stock/transactions', { params });
      setTransactions(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchTransactions(1);
  }, [movementFilter, perPage]);

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Stock Transactions</h1>
            <p className="text-sm text-gray-500 mt-1">History of all stock movements</p>
          </div>
          <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full self-start">{total} records</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={movementFilter} onChange={e => setMovementFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] bg-white">
            <option value="">All Movements</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
        </div>
      </div>

      {/* Table / Mobile Cards */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-700 text-sm">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <p className="text-sm text-gray-700">No transactions found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.product?.name || '—'}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.movement_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.movement_type === 'in' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-mono">{parseFloat(t.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{t.unit?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap font-mono">{parseFloat(t.unit_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-mono">{parseFloat(t.total_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap font-mono">{parseFloat(t.balance_qty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{t.reference_type} #{t.reference_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {transactions.map(t => (
                <div key={t.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{t.product?.name || '—'}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.movement_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.movement_type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Quantity</div>
                      <div className="text-sm font-semibold font-mono text-gray-900">{parseFloat(t.quantity).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Balance</div>
                      <div className="text-sm font-semibold font-mono text-gray-600">{parseFloat(t.balance_qty).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Unit Cost</div>
                      <div className="text-xs font-mono text-gray-700">{parseFloat(t.unit_cost).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Total</div>
                      <div className="text-xs font-mono text-gray-900 font-semibold">{parseFloat(t.total_cost).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{t.unit?.name || '—'}</span>
                    <span>{t.reference_type} #{t.reference_id}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500 text-center sm:text-left">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center justify-center gap-1">
              {/* First */}
              <button 
                onClick={() => fetchTransactions(1)} 
                disabled={currentPage === 1}
                className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ⏮
              </button>
              {/* Prev */}
              <button 
                onClick={() => fetchTransactions(currentPage - 1)} 
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ◀
              </button>
              {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                p === '...' ? (
                  <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button 
                    key={p} 
                    onClick={() => fetchTransactions(p)} 
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                )
              )}
              {/* Next */}
              <button 
                onClick={() => fetchTransactions(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ▶
              </button>
              {/* Last */}
              <button 
                onClick={() => fetchTransactions(totalPages)} 
                disabled={currentPage === totalPages}
                className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ⏭
              </button>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <span className="text-xs text-gray-500">Show</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchTransactions(1, parseInt(e.target.value)); }}
                className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
              >
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