import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PaymentReceipt() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const receiptRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await api.get(`/payment-receipt/${transactionId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [transactionId]);

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

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-600 mb-4">{error || 'Receipt not found'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#007c89] hover:underline">&larr; Go Back</button>
      </div>
    );
  }

  const { transaction, purchase, account } = data;
  const receiptDate = new Date(transaction.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gray-100 py-6 print:py-0 print:bg-white">
      {/* Toolbar - hidden when printing */}
      <div className="max-w-2xl mx-auto mb-4 px-4 print:hidden">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#007c89] text-white text-sm rounded-lg hover:bg-[#006d77] transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Card */}
      <div ref={receiptRef} className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          {/* Receipt Header */}
          <div className="bg-gradient-to-r from-[#007c89] to-[#006d77] px-6 py-5 text-white print:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold tracking-tight">PAYMENT RECEIPT</h1>
                <p className="text-sm text-white/80 mt-0.5">Receipt #{transaction.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{receiptDate}</p>
                <p className="text-xs text-white/70">Date of Payment</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Payment Details */}
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Details</h2>
              <div>
                <p className="text-xs text-gray-400">Amount Paid</p>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(transaction.amount).toFixed(2)} <span className="text-sm font-normal text-gray-500">AFN</span></p>
              </div>
            </div>

            {/* Bill Info */}
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bill Information</h2>
              <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                <div>
                  <span className="text-gray-400">Bill #</span>
                  <p className="font-medium text-gray-900">#{purchase.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Bill Total</span>
                  <p className="font-medium text-gray-900">{parseFloat(purchase.total_amount).toFixed(2)} AFN</p>
                </div>
                <div>
                  <span className="text-gray-400">Supplier</span>
                  <p className="font-medium text-gray-900">{purchase.supplier?.full_name || '—'}</p>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">Remaining Due</span>
                  <p className="font-medium text-red-600">{parseFloat(purchase.due_amount).toFixed(2)} AFN</p>
                </div>
                <div>
                  <span className="text-gray-400">Payment Status</span>
                  <p className={`font-medium ${purchase.payment_status === 'paid' ? 'text-green-600' : purchase.payment_status === 'partial' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {purchase.payment_status?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Source</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{account?.name || '—'}</p>
                  <p className="text-xs text-gray-400 capitalize">{account?.type || '—'} account</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {transaction.description && (
              <div className="pb-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h2>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{transaction.description}</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 text-center">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">This is a computer-generated receipt. No signature required.</p>
                <p className="text-xs text-gray-400 mt-0.5">Transaction ID: {transaction.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
