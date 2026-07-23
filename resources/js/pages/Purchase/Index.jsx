import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= Math.min(5, total); i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...', total);
  }
  return pages;
}

export default function PurchaseIndex() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [paying, setPaying] = useState(false);

  const fetchPurchases = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (searchQuery) params.search = searchQuery;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      if (refundStatusFilter) params.refund_status = refundStatusFilter;
      const res = await api.get('/purchases', { params });
      setPurchases(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts/list/options');
      setAccounts(res.data?.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchAccounts();
    setCurrentPage(1);
    const t = setTimeout(() => fetchPurchases(1), 300);
    return () => clearTimeout(t);
  }, [searchQuery, paymentStatusFilter, refundStatusFilter, perPage]);

  const openPayModal = (purchase) => {
    if (purchase.refund_status === 'full') return;
    setSelectedPurchase(purchase);
    const unpaid = parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount);
    setPayAmount(unpaid > 0 ? String(unpaid) : '');
    setPayAccountId(purchase.account_id || '');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0 || !selectedPurchase) return;
    setPaying(true);
    try {
      const res = await api.post(`/purchases/${selectedPurchase.id}/pay`, { amount, account_id: payAccountId });
      setShowPayModal(false);
      setPayAmount('');
      setPayAccountId('');
      const txId = res.data?.transaction_id;
      if (txId) {
        navigate(`/payment-receipt/${txId}`);
      } else {
        fetchPurchases(currentPage);
      }
    } catch (err) { alert(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this purchase?')) return;
    try { await api.delete(`/purchases/${id}`); fetchPurchases(currentPage); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleReturn = (purchaseId) => {
    navigate(`/purchase-returns/create?purchase_id=${purchaseId}`);
  };

  const paymentBadge = (status) => {
    const c = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[status] || 'bg-gray-100 text-gray-700'}`}>{status?.toUpperCase()}</span>;
  };

  const refundBadge = (status) => {
    const c = { 
      none: 'bg-gray-100 text-gray-500', 
      partial: 'bg-yellow-100 text-yellow-700', 
      full: 'bg-purple-100 text-purple-700' 
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[status] || 'bg-gray-100 text-gray-500'}`}>
      {status === 'full' && (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === 'partial' && (
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {status?.toUpperCase() || 'NONE'}
    </span>;
  };

  const canTakeAction = (purchase) => {
    return purchase.refund_status !== 'full';
  };

  const unpaid = selectedPurchase ? parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount) : 0;

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Purchase Orders</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{purchases.length} orders</span>
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">page {currentPage}/{totalPages}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by reference..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
          </div>
          <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All Payment Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <select value={refundStatusFilter} onChange={e => setRefundStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All Refund Status</option>
            <option value="none">None</option>
            <option value="partial">Partial</option>
            <option value="full">Full</option>
          </select>
        </div>
        <button onClick={() => navigate('/purchases/create')} className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Purchase
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div></div>}

      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {purchases.length === 0 ? (
            <div className="py-16 text-center"><p className="text-sm text-gray-700">No purchases found.</p></div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Bill #</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Due</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Refund</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p, idx) => {
                      const canAct = canTakeAction(p);
                      return (
                        <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button onClick={() => navigate(`/purchases/${p.id}`)} className="hover:text-[#007c89]">{p.reference_no || `Bill #${p.id}`}</button>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{p.purchase_date?.split('T')[0]}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{p.supplier?.full_name || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 text-right">{parseFloat(p.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 text-right">{parseFloat(p.due_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">{paymentBadge(p.payment_status)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">{refundBadge(p.refund_status)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => navigate(`/purchases/${p.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600" title="View">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button onClick={() => navigate(`/purchases/${p.id}/invoice`)} className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" title="Download Bill">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </button>
                              {canAct && p.payment_status !== 'unpaid' && p.refund_status !== 'full' && <button onClick={() => handleReturn(p.id)} className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Return</button>}
                              {canAct && p.payment_status !== 'paid' && <button onClick={() => openPayModal(p)} className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">Pay</button>}
                              {canAct && p.payment_status === 'unpaid' && p.refund_status === 'none' && <button onClick={() => navigate(`/purchases/${p.id}/edit`)} className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title="Edit">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>}
                              {canAct && p.payment_status === 'unpaid' && p.refund_status === 'none' && <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>}
                              {p.refund_status === 'full' && <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap">Fully Refunded</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {purchases.map((p) => {
                  const canAct = canTakeAction(p);
                  return (
                    <div key={p.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button onClick={() => navigate(`/purchases/${p.id}`)} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{p.reference_no || `Bill #${p.id}`}</button>
                          <span className="text-xs text-gray-500">{p.purchase_date?.split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                          {paymentBadge(p.payment_status)}
                          {refundBadge(p.refund_status)}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Supplier</span><span className="text-gray-700 text-right truncate max-w-[55%]">{p.supplier?.full_name || '—'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Total</span><span className="font-semibold text-gray-900">{parseFloat(p.total_amount).toFixed(2)}</span></div>
                        <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Due</span><span className="font-medium text-red-600">{parseFloat(p.due_amount).toFixed(2)}</span></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button onClick={() => navigate(`/purchases/${p.id}`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">View</button>
                        {canAct && p.payment_status !== 'paid' && <button onClick={() => openPayModal(p)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">Pay</button>}
                        {canAct && p.payment_status !== 'unpaid' && p.refund_status !== 'full' && <button onClick={() => handleReturn(p.id)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">Return</button>}
                        {canAct && p.payment_status === 'unpaid' && p.refund_status === 'none' && <button onClick={() => navigate(`/purchases/${p.id}/edit`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">Edit</button>}
                        {canAct && p.payment_status === 'unpaid' && p.refund_status === 'none' && <button onClick={() => handleDelete(p.id)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">Delete</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => fetchPurchases(1)} disabled={currentPage === 1} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="First page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => fetchPurchases(currentPage - 1)} disabled={currentPage === 1} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Previous page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 select-none">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchPurchases(p)} className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-md font-medium transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>{p}</button>
                  )
                )}
                <button onClick={() => fetchPurchases(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Next page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => fetchPurchases(totalPages)} disabled={currentPage === totalPages} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Last page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                <span className="hidden sm:inline">Show</span>
                <select value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="hidden sm:inline">per page</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedPurchase.reference_no || `Bill #${selectedPurchase.id}`}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-lg font-bold text-gray-900">{parseFloat(selectedPurchase.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Paid</p>
                    <p className="text-lg font-bold text-green-600">{parseFloat(selectedPurchase.paid_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Due</p>
                    <p className="text-lg font-bold text-red-600">{unpaid.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Wallet *</label>
                <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]">
                  <option value="">Select Wallet</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
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
              <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || !payAccountId}
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