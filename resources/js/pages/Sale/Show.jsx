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

  const [payments, setPayments] = useState([]);

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
    } catch (err) { alert(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice?')) return;
    try { await api.post(`/sales/${id}/cancel`); await fetchSale(); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!sale) return null;

  const unpaid = parseFloat(sale.total_amount) - parseFloat(sale.paid_amount);

  const statusColors = { draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700' };
  const paymentColors = { unpaid: 'bg-red-50 text-red-600', partial: 'bg-amber-50 text-amber-600', paid: 'bg-emerald-50 text-emerald-600' };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate('/sales')} className="text-sm text-[#007c89] hover:underline">&larr; Back to Sales</button>
        <div className="flex justify-between items-start mt-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{sale.reference_no || 'Invoice'}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[sale.status] || 'bg-gray-100 text-gray-700'}`}>{sale.status}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${paymentColors[sale.payment_status] || 'bg-gray-100 text-gray-700'}`}>{sale.payment_status}</span>
          </div>
          <div className="flex gap-2">
            {sale.payment_status !== 'paid' && (
              <button onClick={() => { setPayAccountId(sale?.account_id || ''); setShowPayModal(true); }} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Pay Now</button>
            )}
            {sale.status !== 'cancelled' && (
              <button onClick={handleCancel} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors">Cancel</button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
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
                  {sale.items.map(item => (
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
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{parseFloat(sale.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-{parseFloat(sale.discount_value).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{parseFloat(sale.shipping_cost).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{parseFloat(sale.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{parseFloat(sale.paid_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600 font-bold"><span>Due</span><span>{unpaid.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            </div>
            <div className="p-4 space-y-1 text-sm">
              <div><span className="text-gray-500">Customer: </span>{sale.customer?.full_name || '—'}</div>
              <div><span className="text-gray-500">Date: </span>{sale.document_date?.split('T')[0]}</div>
              <div><span className="text-gray-500">Account: </span>{sale.account?.name || '—'}</div>
              {sale.notes && <div><span className="text-gray-500">Notes: </span>{sale.notes}</div>}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2">
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
                        <td className="py-2 px-4 text-right font-medium text-green-600">
                          +{parseFloat(pmt.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-right text-gray-600">
                          {parseFloat(pmt.balance_after).toFixed(2)}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            onClick={() => navigate(`/sale-payment-receipt/${pmt.id}`)}
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
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Make Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{sale.reference_no}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total</p>
                    <p className="text-lg font-bold text-gray-900">{parseFloat(sale.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Paid</p>
                    <p className="text-lg font-bold text-green-600">{parseFloat(sale.paid_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Due</p>
                    <p className="text-lg font-bold text-red-600">{unpaid.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account *</label>
                <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]">
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
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

              <div className="flex gap-2">
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 100)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">100</button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 500)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">500</button>
                <button type="button" onClick={() => setPayAmount(String(Math.min(unpaid, 1000)))}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">1000</button>
                <button type="button" onClick={() => setPayAmount(String(unpaid))}
                  className="flex-1 py-1.5 text-xs font-medium bg-[#007c89]/10 text-[#007c89] rounded-md hover:bg-[#007c89]/20 transition-colors">Full Amount</button>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={() => setShowPayModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                className="px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors">
                {paying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</span>
                ) : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
