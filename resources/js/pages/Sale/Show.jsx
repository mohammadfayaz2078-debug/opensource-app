import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SaleShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState([]);

  const fetchSale = async () => {
    try {
      const r = await api.get(`/sales/${id}`);
      setSale(r.data.data);
      // Fetch payment history for this invoice
      try {
        const txRes = await api.get('/account-transactions', {
          params: {
            reference_type: 'App\\Models\\Sale',
            reference_id: id,
            per_page: 50
          }
        });
        setPayments(txRes.data.data || []);
      } catch (e) { /* ignore */ }
    } catch { navigate('/sales'); }
  };

  useEffect(() => {
    fetchSale().finally(() => setLoading(false));
    api.get('/accounts/list/options').then(r => setAccounts(r.data?.data || [])).catch(() => {});
  }, [id, navigate]);

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPaying(true);
    try {
      const res = await api.post(`/sales/${id}/pay`, { amount, account_id: payAccountId });
      setPayAmount('');
      setPayAccountId('');
      setShowPayModal(false);
      const txId = res.data?.transaction_id;
      if (txId) {
        navigate(`/sale-payment-receipt/${txId}`);
      } else {
        await fetchSale();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally { 
      setPaying(false); 
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try { 
      await api.post(`/sales/${id}/cancel`); 
      await fetchSale();
    } catch (err) { 
      alert(err.response?.data?.message || 'Failed to cancel invoice'); 
    }
  };

  const handleReturn = () => {
    // Navigate to return create page with sale_id pre-filled
    navigate(`/sale-returns/create?sale_id=${id}`);
  };

  const canTakeAction = () => {
    if (!sale) return false;
    return sale.status !== 'cancelled' && sale.status !== 'returned';
  };

  const canPay = () => {
    return canTakeAction() && sale?.payment_status !== 'paid';
  };

  const canReturn = () => {
    return canTakeAction() && sale?.status === 'confirmed' && sale?.payment_status !== 'unpaid';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-[#007c89] border-t-transparent"></div>
          <span className="text-sm text-gray-500">Loading invoice details...</span>
        </div>
      </div>
    );
  }

  if (!sale) return null;

  const unpaid = parseFloat(sale.total_amount) - parseFloat(sale.paid_amount);

  const statusColors = { 
    draft: 'bg-gray-100 text-gray-700', 
    confirmed: 'bg-blue-100 text-blue-700', 
    cancelled: 'bg-red-100 text-red-700',
    returned: 'bg-purple-100 text-purple-700'
  };

  const paymentColors = { 
    unpaid: 'bg-red-50 text-red-600', 
    partial: 'bg-amber-50 text-amber-600', 
    paid: 'bg-emerald-50 text-emerald-600' 
  };

  const statusIcons = {
    draft: '📄',
    confirmed: '✅',
    cancelled: '❌',
    returned: '↩️'
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/sales')} 
          className="inline-flex items-center gap-1 text-sm text-[#007c89] hover:text-[#006d77] hover:underline transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Sales
        </button>
        
        <div className="flex flex-wrap items-start justify-between gap-4 mt-3">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{sale.reference_no || 'Invoice'}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[sale.status] || 'bg-gray-100 text-gray-700'}`}>
              <span>{statusIcons[sale.status] || '📄'}</span>
              <span>{sale.status?.toUpperCase()}</span>
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${paymentColors[sale.payment_status] || 'bg-gray-100 text-gray-700'}`}>
              {sale.payment_status?.toUpperCase()}
            </span>
            {sale.status === 'returned' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fully Returned
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canPay() && (
              <button 
                onClick={() => setShowPayModal(true)} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pay Now
              </button>
            )}
            {canReturn() && (
              <button 
                onClick={handleReturn} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Process Return
              </button>
            )}
            {sale.status !== 'cancelled' && sale.status !== 'returned' && (
              <button 
                onClick={handleCancel} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-all border border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Items
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">{sale.items?.length || 0} items</span>
                {sale.status === 'returned' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium border border-purple-200">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Fully Returned
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/30 text-xs text-gray-500 uppercase">
                    <th className="text-left py-3 px-4 font-medium w-12">#</th>
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-right py-3 px-4 font-medium w-20">Qty</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Price</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Total</th>
                    <th className="text-center py-3 px-4 font-medium w-28">Refund Status</th>
                    <th className="text-right py-3 px-4 font-medium w-20">Refund Qty</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items?.map((item, idx) => {
                    const refundStatus = item.refund_status || 'none';
                    const refundedQty = parseFloat(item.refunded_quantity || 0);
                    const refundedAmount = parseFloat(item.refunded_amount || 0);
                    const quantity = parseFloat(item.quantity);
                    const isFullyRefunded = refundStatus === 'full';
                    const hasRefund = refundStatus !== 'none';

                    const refundStatusBadge = () => {
                      if (refundStatus === 'full') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Full
                          </span>
                        );
                      } else if (refundStatus === 'partial') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Partial
                          </span>
                        );
                      } else {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            None
                          </span>
                        );
                      }
                    };

                    const progressPercentage = quantity > 0 ? (refundedQty / quantity) * 100 : 0;

                    return (
                      <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${hasRefund ? 'bg-purple-50/30' : ''}`}>
                        <td className="py-3 px-4 text-gray-400 text-center">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{item.product?.name || '—'}</div>
                          {item.notes && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>
                          )}
                          {hasRefund && (
                            <div className="mt-1">
                              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${isFullyRefunded ? 'bg-purple-500' : 'bg-yellow-500'}`}
                                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {progressPercentage.toFixed(0)}% refunded
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-gray-700 ${isFullyRefunded ? 'line-through text-gray-400' : ''}`}>
                            {quantity.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-700">
                          {parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {parseFloat(item.total).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {refundStatusBadge()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={refundedQty > 0 ? 'text-purple-700 font-medium' : 'text-gray-400'}>
                            {refundedQty.toFixed(2)}
                          </span>
                          {refundedQty > 0 && (
                            <span className="text-[10px] text-gray-400 ml-1">
                              / {quantity.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={refundedAmount > 0 ? 'text-purple-700 font-medium' : 'text-gray-400'}>
                            {refundedAmount.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Summary Row */}
                {sale.items?.some(item => item.refund_status && item.refund_status !== 'none') && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                      <td colSpan="4" className="py-3 px-4 text-right font-semibold text-gray-900">
                        Total Refunded
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        {sale.items?.reduce((sum, item) => sum + parseFloat(item.refunded_amount || 0), 0).toFixed(2)}
                      </td>
                      <td colSpan="3" className="py-3 px-4 text-right text-xs text-gray-500">
                        {sale.items?.filter(item => item.refund_status === 'full').length} fully refunded items
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment History
                </h2>
                <span className="text-xs text-gray-500">{payments.length} transactions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/30 text-xs text-gray-500 uppercase">
                      <th className="text-left py-3 px-6 font-medium">Date</th>
                      <th className="text-right py-3 px-6 font-medium">Amount</th>
                      <th className="text-right py-3 px-6 font-medium">Balance</th>
                      <th className="text-center py-3 px-6 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt, idx) => (
                      <tr key={pmt.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="py-3 px-6 text-gray-600 whitespace-nowrap">
                          {new Date(pmt.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-6 text-right font-medium text-green-600">
                          +{parseFloat(pmt.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-6 text-right text-gray-600">
                          {parseFloat(pmt.balance_after).toFixed(2)}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button
                            onClick={() => navigate(`/sale-payment-receipt/${pmt.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-6 3v-3m-6 3h18M5 7h14M5 7v10a2 2 0 002 2h10a2 2 0 002-2V7" />
                </svg>
                Summary
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{parseFloat(sale.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600">-{parseFloat(sale.discount_value).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="text-gray-900">{parseFloat(sale.shipping_cost).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{parseFloat(sale.total_amount).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">Paid</span>
                <span className="text-green-600 font-medium">{parseFloat(sale.paid_amount).toFixed(2)}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold border-t pt-3 ${unpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Due</span>
                <span>{unpaid.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Details
              </h3>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="text-gray-900 font-medium">{sale.customer?.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-900">{sale.document_date?.split('T')[0]}</span>
              </div>
              {sale.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-gray-900">{sale.due_date?.split('T')[0]}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Wallet</span>
                <span className="text-gray-900">{sale.account?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created By</span>
                <span className="text-gray-900">{sale.creator?.first_name + ' ' + sale.creator?.last_name || '—'}</span>
              </div>
              {sale.notes && (
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-gray-500 block mb-1">Notes</span>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{sale.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Make Payment
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{sale.reference_no}</p>
              </div>
              <button 
                onClick={() => setShowPayModal(false)} 
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
                    <p className="text-xl font-bold text-gray-900">{parseFloat(sale.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Paid</p>
                    <p className="text-xl font-bold text-green-600">{parseFloat(sale.paid_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Due</p>
                    <p className="text-xl font-bold text-red-600">{unpaid.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Wallet *
                </label>
                <select 
                  value={payAccountId} 
                  onChange={e => setPayAccountId(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent transition-all"
                >
                  <option value="">Select Wallet</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Payment Amount *
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  max={unpaid} 
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 text-lg font-medium border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">Maximum: {unpaid.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button 
                  type="button" 
                  onClick={() => setPayAmount(String(Math.min(unpaid, 100)))}
                  className="py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  100
                </button>
                <button 
                  type="button" 
                  onClick={() => setPayAmount(String(Math.min(unpaid, 500)))}
                  className="py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  500
                </button>
                <button 
                  type="button" 
                  onClick={() => setPayAmount(String(Math.min(unpaid, 1000)))}
                  className="py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  1000
                </button>
                <button 
                  type="button" 
                  onClick={() => setPayAmount(String(unpaid))}
                  className="py-2 text-xs font-medium bg-[#007c89]/10 text-[#007c89] rounded-lg hover:bg-[#007c89]/20 transition-colors"
                >
                  Full
                </button>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setShowPayModal(false)}
                className="px-5 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handlePay} 
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || !payAccountId}
                className="px-6 py-2.5 text-sm bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm hover:shadow-md"
              >
                {paying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}