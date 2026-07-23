import React, { useState, useEffect } from 'react';
import api from '../plugins/axios';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  entity, 
  entityType, 
  endpoint, 
  receiptPath 
}) => {
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (isOpen && entity) {
      const unpaid = parseFloat(entity.total_amount) - parseFloat(entity.paid_amount);
      setPayAmount(unpaid > 0 ? String(unpaid) : '');
      setPayAccountId(entity.account_id || '');
    }
  }, [isOpen, entity]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts/list/options');
      setAccounts(res.data?.data || []);
    } catch (err) { 
      console.error('Error fetching accounts:', err); 
    }
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0 || !entity) return;
    
    setPaying(true);
    try {
      const res = await api.post(endpoint, { 
        amount, 
        account_id: payAccountId 
      });
      
      setPayAmount('');
      setPayAccountId('');
      
      const txId = res.data?.transaction_id;
      if (txId && receiptPath) {
        // Redirect to receipt page
        window.location.href = receiptPath.replace(':id', txId);
      } else {
        // Call success callback to refresh data
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally { 
      setPaying(false); 
    }
  };

  const unpaid = entity ? parseFloat(entity.total_amount) - parseFloat(entity.paid_amount) : 0;

  if (!isOpen || !entity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 z-10 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Make Payment
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{entity.reference_no || entity.invoice_no || `#${entity.id}`}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {parseFloat(entity.total_amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Paid</p>
                <p className="text-xl font-bold text-green-600">
                  {parseFloat(entity.paid_amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Due</p>
                <p className="text-xl font-bold text-red-600">
                  {unpaid.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Account Selection */}
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

          {/* Payment Amount */}
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

          {/* Quick Amount Buttons */}
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

        {/* Modal Footer */}
        <div className="px-6 py-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;