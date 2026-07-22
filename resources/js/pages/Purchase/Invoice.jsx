import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PurchaseInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/purchases/${id}`)
      .then(r => setPurchase(r.data.data))
      .catch(() => navigate('/purchases'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
      </div>
    );
  }

  if (!purchase) return null;

  const unpaid = parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount);

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:py-0 print:bg-white">
      {/* Toolbar - hidden when printing */}
      <div className="max-w-4xl mx-auto mb-4 px-4 print:hidden">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#007c89] text-white text-sm rounded-lg hover:bg-[#006d77] transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice */}
      <div ref={printRef} className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-[#007c89] to-[#006d77] px-8 py-6 text-white print:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">PURCHASE BILL</h1>
                <p className="text-sm text-white/80 mt-0.5">Bill # {purchase.id}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{parseFloat(purchase.total_amount).toFixed(2)} AFN</p>
                <p className="text-xs text-white/70">Total Amount</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Supplier & Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill From</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{purchase.supplier?.full_name || '—'}</p>
                  {purchase.supplier?.phone && <p className="text-sm text-gray-600 mt-1">{purchase.supplier.phone}</p>}
                  {purchase.supplier?.email && <p className="text-sm text-gray-600">{purchase.supplier.email}</p>}
                  {purchase.supplier?.address && <p className="text-sm text-gray-600 mt-1">{purchase.supplier.address}</p>}
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoice Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-right">
                  <div className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-500">Bill #</span>
                    <span className="font-medium">{purchase.id}</span>
                  </div>
                  <div className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-500">Date</span>
                    <span>{(purchase.purchase_date || '').split('T')[0]}</span>
                  </div>
                  {purchase.due_date && (
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-500">Due Date</span>
                      <span>{(purchase.due_date || '').split('T')[0]}</span>
                    </div>
                  )}
                  {purchase.account && (
                    <div className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-500">Account</span>
                      <span>{purchase.account.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchase.items?.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.product?.name || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{parseFloat(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-72">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{parseFloat(purchase.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{parseFloat(purchase.discount_value || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">Shipping</span>
                    <span>{parseFloat(purchase.shipping_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span>{parseFloat(purchase.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
                    <span>{parseFloat(purchase.paid_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600 font-bold">
                    <span>Due</span>
                    <span>{unpaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="mb-8 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{purchase.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">This is a computer-generated document. No signature required.</p>
              <p className="text-xs text-gray-400 mt-0.5">Bill #{purchase.id} · {(purchase.purchase_date || '').split('T')[0]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
