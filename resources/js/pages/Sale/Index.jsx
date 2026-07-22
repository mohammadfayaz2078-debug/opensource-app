import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SaleIndex() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/sales', { params });
      setSales(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => fetchSales(), 300); return () => clearTimeout(t); }, [searchQuery, statusFilter]);

  const openPayModal = (sale) => {
    setSelectedSale(sale);
    const unpaid = parseFloat(sale.total_amount) - parseFloat(sale.paid_amount);
    setPayAmount(unpaid > 0 ? String(unpaid) : '');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0 || !selectedSale) return;
    setPaying(true);
    try {
      await api.post(`/sales/${selectedSale.id}/pay`, { amount });
      setShowPayModal(false);
      setPayAmount('');
      fetchSales(currentPage);
    } catch (err) { alert(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const statusBadge = (status) => {
    const c = { draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700', cancelled: 'bg-orange-100 text-orange-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[status] || c.draft}`}>{status?.toUpperCase()}</span>;
  };

  const paymentBadge = (ps) => {
    const c = { unpaid: 'bg-red-50 text-red-700', partial: 'bg-yellow-50 text-yellow-700', paid: 'bg-emerald-50 text-emerald-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[ps] || c.unpaid}`}>{ps?.toUpperCase()}</span>;
  };

  const unpaid = selectedSale ? parseFloat(selectedSale.total_amount) - parseFloat(selectedSale.paid_amount) : 0;

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{sales.length} invoices</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={() => navigate('/sales/create')} className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          New Invoice
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div></div>}

      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {sales.length === 0 ? (
            <div className="py-16 text-center"><p className="text-sm text-gray-700">No invoices found.</p></div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reference</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, idx) => (
                  <tr key={s.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button onClick={() => navigate(`/sales/${s.id}`)} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">{s.reference_no}</button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{s.document_date?.split('T')[0]}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{s.customer?.full_name || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 text-right">{parseFloat(s.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">{statusBadge(s.status)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">{paymentBadge(s.payment_status)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/sales/${s.id}`)} className="p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#007c89]" title="View">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {s.payment_status !== 'paid' && (
                          <button onClick={() => openPayModal(s)} className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors" title="Pay">Pay</button>
                        )}
                        {s.payment_status !== 'paid' && (
                          <button onClick={() => navigate(`/sales/${s.id}/edit`)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex justify-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchSales(p)} className={`px-2.5 py-1 text-xs rounded-md ${p === currentPage ? 'bg-[#007c89] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedSale.reference_no}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-gray-500 uppercase">Total</p><p className="text-lg font-bold text-gray-900">{parseFloat(selectedSale.total_amount).toFixed(2)}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase">Paid</p><p className="text-lg font-bold text-green-600">{parseFloat(selectedSale.paid_amount).toFixed(2)}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase">Due</p><p className="text-lg font-bold text-red-600">{unpaid.toFixed(2)}</p></div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Amount *</label>
                <input type="number" step="0.01" min="0.01" max={unpaid} value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder="0.00" className="w-full px-3 py-2.5 text-lg font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]" />
                <p className="text-xs text-gray-400 mt-1">Maximum: {unpaid.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 100)))} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">100</button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 500)))} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">500</button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 1000)))} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">1000</button>
                <button type="button" onClick={() => setPayAmount(String(unpaid))} className="flex-1 py-1.5 text-xs font-medium bg-[#007c89]/10 text-[#007c89] rounded-md hover:bg-[#007c89]/20">Full Amount</button>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                className="px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50">
                {paying ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
