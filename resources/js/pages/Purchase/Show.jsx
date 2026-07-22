import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PurchaseShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    api.get(`/purchases/${id}`)
      .then(r => setPurchase(r.data.data))
      .catch(() => navigate('/purchases'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleReceive = async () => {
    const receiveItems = purchase.items
      .filter(item => parseFloat(item.received_qty) < parseFloat(item.quantity))
      .map(item => ({
        id: item.id,
        quantity: parseFloat(item.quantity) - parseFloat(item.received_qty),
      }));

    if (receiveItems.length === 0) {
      alert('All items already received.');
      return;
    }

    if (!confirm(`Receive ${receiveItems.length} item(s)?`)) return;

    setReceiving(true);
    try {
      const res = await api.post(`/purchases/${id}/receive`, { items: receiveItems });
      setPurchase(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Receive failed');
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!purchase) return null;

  const unpaid = parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount);

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <button onClick={() => navigate('/purchases')} className="text-sm text-[#007c89] hover:underline mb-2">&larr; Back</button>
          <h1 className="text-2xl font-semibold text-gray-900">{purchase.reference_no}</h1>
          <p className="text-sm text-gray-500">Purchase Date: {purchase.purchase_date}</p>
        </div>
        <div className="flex gap-2">
          {purchase.payment_status === 'unpaid' && (
            <button onClick={() => navigate(`/purchases/${id}/edit`)}
              className="px-4 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200">Edit</button>
          )}
          <button onClick={handleReceive} disabled={receiving}
            className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50">
            {receiving ? 'Receiving...' : 'Receive Items'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchase.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-gray-900">{item.product?.name || '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{item.received_qty}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{parseFloat(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchase.returns?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Returns</h2>
              {purchase.returns.map(ret => (
                <div key={ret.id} className="p-3 bg-red-50 rounded mb-2">
                  <span className="font-medium">{ret.reference_no}</span>
                  <span className="text-sm text-gray-600 ml-4">{ret.return_date}</span>
                  <span className="text-sm text-red-600 ml-4">-{parseFloat(ret.total_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{parseFloat(purchase.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{parseFloat(purchase.discount_value).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{parseFloat(purchase.shipping_cost).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{parseFloat(purchase.total_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{parseFloat(purchase.paid_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-red-600 font-bold"><span>Due</span><span>{unpaid.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Details</h3>
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Supplier: </span>{purchase.supplier?.full_name || '—'}</div>
              <div><span className="text-gray-500">Status: </span>{purchase.payment_status?.toUpperCase()}</div>
              {purchase.notes && <div><span className="text-gray-500">Notes: </span>{purchase.notes}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
