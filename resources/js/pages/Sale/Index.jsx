import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import PaymentModal from '../../components/PaymentModal'; // Adjust path as needed

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

  useEffect(() => {
    const t = setTimeout(() => fetchSales(), 300);
    return () => clearTimeout(t);
  }, [searchQuery, statusFilter]);

  const openPayModal = (sale) => {
    // Don't allow payment for returned or cancelled sales
    if (sale.status === 'returned' || sale.status === 'cancelled') {
      return;
    }
    setSelectedSale(sale);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchSales(currentPage);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
    try { 
      await api.delete(`/sales/${id}`); 
      fetchSales(currentPage);
    } catch (err) { 
      alert(err.response?.data?.message || 'Delete failed'); 
    }
  };

  const statusBadge = (status) => {
    const c = { 
      draft: 'bg-gray-100 text-gray-700', 
      confirmed: 'bg-blue-100 text-blue-700', 
      cancelled: 'bg-orange-100 text-orange-700',
      returned: 'bg-purple-100 text-purple-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[status] || c.draft}`}>{status?.toUpperCase()}</span>;
  };

  const paymentBadge = (ps) => {
    const c = { unpaid: 'bg-red-50 text-red-700', partial: 'bg-yellow-50 text-yellow-700', paid: 'bg-emerald-50 text-emerald-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${c[ps] || c.unpaid}`}>{ps?.toUpperCase()}</span>;
  };

  // Helper to check if actions are allowed
  const canTakeAction = (sale) => {
    return sale.status !== 'cancelled' && sale.status !== 'returned';
  };

  // Helper to check if payment is allowed
  const canPay = (sale) => {
    return canTakeAction(sale) && sale.payment_status !== 'paid';
  };

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
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        <button onClick={() => navigate('/sales/create')} className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
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
                {sales.map((s, idx) => {
                  const canAct = canTakeAction(s);
                  return (
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
                          {/* View - Always allowed */}
                          <button 
                            onClick={() => navigate(`/sales/${s.id}`)} 
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#007c89]" 
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Download Invoice */}
                          <button 
                            onClick={() => navigate(`/sales/${s.id}/invoice`)} 
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" 
                            title="Download Invoice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>

                          {/* Pay - Only if not cancelled/returned and not fully paid */}
                          {canPay(s) && (
                            <button 
                              onClick={() => openPayModal(s)} 
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors" 
                              title="Pay"
                            >
                              Pay
                            </button>
                          )}

                          {/* Edit - Only if not cancelled/returned */}
                          {canAct && s.payment_status !== 'paid' && (
                            <button 
                              onClick={() => navigate(`/sales/${s.id}/edit`)} 
                              className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" 
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          {/* Delete - Only if draft and not paid/returned/cancelled */}
                          {canAct && s.payment_status !== 'paid' && (
                            <button 
                              onClick={() => handleDelete(s.id)} 
                              className="p-1.5 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" 
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}

                          {/* Returned badge - Show when status is returned */}
                          {s.status === 'returned' && (
                            <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                              Returned
                            </span>
                          )}

                          {/* Cancelled badge - Show when status is cancelled */}
                          {s.status === 'cancelled' && (
                            <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Payment Modal - Reusable Component */}
      <PaymentModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setSelectedSale(null);
        }}
        onSuccess={handlePaymentSuccess}
        entity={selectedSale}
        entityType="sale"
        endpoint={`/sales/${selectedSale?.id}/pay`}
        receiptPath="/sale-payment-receipt/:id"
      />
    </div>
  );
}