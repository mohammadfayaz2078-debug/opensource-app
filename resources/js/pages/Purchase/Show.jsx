import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PurchaseShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState([]);

  const fetchPurchase = async () => {
    try {
      const r = await api.get(`/purchases/${id}`);
      setPurchase(r.data.data);
      // Also fetch payment history for this purchase
      try {
        const txRes = await api.get('/account-transactions', {
          params: {
            reference_type: 'App\\Models\\Purchase',
            reference_id: id,
            per_page: 50
          }
        });
        setPayments(txRes.data.data || []);
      } catch (e) { /* ignore */ }
    } catch { navigate('/purchases'); }
  };

  useEffect(() => {
    fetchPurchase().finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPaying(true);
    try {
      const res = await api.post(`/purchases/${id}/pay`, { amount });
      const txId = res.data?.transaction_id;
      if (txId) {
        navigate(`/payment-receipt/${txId}`);
      } else {
        await fetchPurchase();
        setPayAmount('');
        setShowPayModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!purchase) return null;

  const unpaid = parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline">&larr; Back</button>
        <div className="flex justify-between items-start mt-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{purchase.reference_no}</h1>
            <p className="text-sm text-gray-500">Purchase Date: {purchase.purchase_date?.split('T')[0]}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/purchases/${id}/invoice`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Invoice
            </button>
            {purchase.payment_status !== 'paid' && (
              <button onClick={() => setShowPayModal(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                Pay Now
              </button>
            )}
            {purchase.payment_status === 'unpaid' && (
              <button onClick={() => navigate(`/purchases/${id}/edit`)}
                className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors">
                Edit
              </button>
            )}

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-4 font-medium">Product</th>
                    <th className="text-right py-2 px-4 font-medium">Qty</th>
                    <th className="text-right py-2 px-4 font-medium">Price</th>
                    <th className="text-right py-2 px-4 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium text-gray-900">{item.product?.name || '—'}</td>
                      <td className="py-2 px-4 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-2 px-4 text-right text-gray-600">{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">{parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {purchase.returns?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Returns</h2>
              </div>
              <div className="p-4">
                {purchase.returns.map(ret => (
                  <div key={ret.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg mb-2">
                    <div>
                      <span className="font-medium text-sm">{ret.reference_no}</span>
                      <span className="text-xs text-gray-500 ml-3">{ret.return_date}</span>
                    </div>
                    <span className="text-sm font-medium text-red-600">-{parseFloat(ret.total_amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-4 font-medium">Date</th>
                      <th className="text-right py-2 px-4 font-medium">Amount</th>
                      <th className="text-right py-2 px-4 font-medium">Balance After</th>
                      <th className="text-center py-2 px-4 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt, idx) => (
                      <tr key={pmt.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-2 px-4 text-gray-600 whitespace-nowrap">
                          {new Date(pmt.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2 px-4 text-right font-medium text-red-600">
                          -{parseFloat(pmt.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-right text-gray-600">
                          {parseFloat(pmt.balance_after).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            onClick={() => navigate(`/payment-receipt/${pmt.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
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

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{parseFloat(purchase.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-{parseFloat(purchase.discount_value).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{parseFloat(purchase.shipping_cost).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{parseFloat(purchase.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{parseFloat(purchase.paid_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600 font-bold"><span>Due</span><span>{unpaid.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            </div>
            <div className="p-4 space-y-1 text-sm">
              <div><span className="text-gray-500">Supplier: </span>{purchase.supplier?.full_name || '—'}</div>
              <div><span className="text-gray-500">Status: </span>{purchase.payment_status?.toUpperCase()}</div>
              <div><span className="text-gray-500">Account: </span>{purchase.account?.name || '—'}</div>
              {purchase.notes && <div><span className="text-gray-500">Notes: </span>{purchase.notes}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{purchase.reference_no}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-lg font-bold text-gray-900">{parseFloat(purchase.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Paid</p>
                    <p className="text-lg font-bold text-green-600">{parseFloat(purchase.paid_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Due</p>
                    <p className="text-lg font-bold text-red-600">{unpaid.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Amount *</label>
                <div className="relative">
                  <input type="number" step="0.01" min="0.01" max={unpaid} value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 text-lg font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-[#007c89]" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Maximum: {unpaid.toFixed(2)}</p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 100)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  100
                </button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 500)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  500
                </button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 1000)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  1000
                </button>
                <button type="button" onClick={() => setPayAmount(String(unpaid))}
                  className="flex-1 py-1.5 text-xs font-medium bg-[#007c89]/10 text-[#007c89] rounded-md hover:bg-[#007c89]/20 transition-colors">
                  Full Amount
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                className="px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
                {paying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
