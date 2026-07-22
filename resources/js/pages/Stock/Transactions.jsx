import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';

export default function StockTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (movementFilter) params.movement_type = movementFilter;
      const res = await api.get('/stock/transactions', { params });
      setTransactions(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, [movementFilter]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">History of all stock movements</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-4 flex gap-3">
        <select value={movementFilter} onChange={e => setMovementFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
          <option value="">All Movements</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.product?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.movement_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.movement_type === 'in' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{parseFloat(t.quantity).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{parseFloat(t.unit_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{parseFloat(t.total_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{parseFloat(t.balance_qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.reference_type} #{t.reference_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="p-4 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => fetchTransactions(page)}
                className={`px-3 py-1 text-sm rounded ${page === currentPage ? 'bg-[#007c89] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
