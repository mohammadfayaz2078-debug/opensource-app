import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SaleShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    api.get(`/sales/${id}`).then(r => setSale(r.data.data)).catch(() => navigate('/sales')).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleConfirm = async () => {
    if (!confirm('Confirm this invoice?')) return;
    try {
      const res = await api.post(`/sales/${id}/confirm`);
      setSale(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleDeliver = async () => {
    const deliverItems = sale.items.filter(i => parseFloat(i.delivered_qty) < parseFloat(i.quantity)).map(i => ({ id: i.id, quantity: parseFloat(i.quantity) - parseFloat(i.delivered_qty) }));
    if (deliverItems.length === 0) { alert('All items already delivered.'); return; }
    if (!confirm('Deliver remaining items?')) return;
    setDelivering(true);
    try {
      const res = await api.post(`/sales/${id}/deliver`, { items: deliverItems });
      setSale(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setDelivering(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice?')) return;
    try {
      const res = await api.post(`/sales/${id}/cancel`);
      setSale(res.data.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!sale) return null;

  const unpaid = parseFloat(sale.total_amount) - parseFloat(sale.paid_amount);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <button onClick={() => navigate('/sales')} className="text-sm text-[#007c89] hover:underline mb-2">&larr; Back</button>
          <h1 className="text-2xl font-semibold text-gray-900">{sale.reference_no}</h1>
          <p className="text-sm text-gray-500">Date: {sale.document_date} | Status: {sale.status?.toUpperCase()}</p>
        </div>
        <div className="flex gap-2">
          {sale.status === 'draft' && <button onClick={handleConfirm} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200">Confirm</button>}
          {sale.status === 'confirmed' && <button onClick={handleDeliver} disabled={delivering} className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50">{delivering ? 'Delivering...' : 'Deliver'}</button>}
          {sale.status !== 'cancelled' && <button onClick={handleCancel} className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200">Cancel</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Delivered</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items.map(item => (
                  <tr key={item.id}><td className="px-4 py-2 text-gray-900">{item.product?.name || '—'}</td><td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td><td className="px-4 py-2 text-right text-gray-600">{item.delivered_qty}</td><td className="px-4 py-2 text-right text-gray-600">{parseFloat(item.unit_price).toFixed(2)}</td><td className="px-4 py-2 text-right font-medium text-gray-900">{parseFloat(item.total).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{parseFloat(sale.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{parseFloat(sale.discount_value).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{parseFloat(sale.shipping_cost).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{parseFloat(sale.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{parseFloat(sale.paid_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600 font-bold"><span>Due</span><span>{unpaid.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Details</h3>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Customer: </span>{sale.customer?.full_name || '—'}</div>
              <div><span className="text-gray-500">Payment: </span>{sale.payment_status?.toUpperCase()}</div>
              {sale.notes && <div><span className="text-gray-500">Notes: </span>{sale.notes}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
