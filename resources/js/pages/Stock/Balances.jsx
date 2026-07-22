import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';

export default function StockBalances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBalances = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (search) params.search = search;
      const res = await api.get('/stock/balances', { params });
      setBalances(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchBalances(), 300); return () => clearTimeout(t); }, [search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Stock Balances</h1>
        <p className="text-sm text-gray-500 mt-1">Current inventory levels for all products</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name..."
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : balances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No stock balances found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.product?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{parseFloat(b.quantity).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.product?.stock_unit?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{parseFloat(b.avg_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{parseFloat(b.total_value).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{b.last_movement_at ? new Date(b.last_movement_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="p-4 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => fetchBalances(page)}
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
