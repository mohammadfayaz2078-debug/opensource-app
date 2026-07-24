import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../plugins/axios';
import Swal from 'sweetalert2';

const formatPrice = (price) => {
  const value = Number(price ?? 0);
  if (Number.isNaN(value)) return '$0.00';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
};

export default function TransferModal({ open, walletId, onClose }) {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    sender_account_id: walletId || '',
    recipient_wallet_number: '',
    amount: '',
    note: '',
  });

  const [recipient, setRecipient] = useState(null);
  const [recipientVerified, setRecipientVerified] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        sender_account_id: walletId || '',
        recipient_wallet_number: '',
        amount: '',
        note: '',
      });
      setRecipient(null);
      setRecipientVerified(false);
      setRecipientError('');
      setErrors({});
      fetchWallets();
    }
  }, [open, walletId]);

  const fetchWallets = useCallback(async () => {
    try {
      const res = await api.get('/account-transfers/my-wallets');
      setWallets(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const selectedWallet = wallets.find(w => w.id === parseInt(form.sender_account_id));

  const handleVerifyRecipient = useCallback(async () => {
    const walletNumber = form.recipient_wallet_number.trim();
    if (!walletNumber) {
      setRecipientError('Please enter a wallet number.');
      return;
    }

    setVerifying(true);
    setRecipientError('');
    setRecipient(null);
    setRecipientVerified(false);

    try {
      const res = await api.post('/account-transfers/verify-recipient', {
        wallet_number: walletNumber,
      });

      if (res.data.data) {
        setRecipient(res.data.data);
        setRecipientVerified(true);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setRecipientError('Wallet not found or inactive.');
      } else {
        setRecipientError(err.response?.data?.message || 'Failed to verify recipient.');
      }
    } finally {
      setVerifying(false);
    }
  }, [form.recipient_wallet_number]);

  const handleWalletNumberChange = (value) => {
    setForm(prev => ({ ...prev, recipient_wallet_number: value }));
    setRecipient(null);
    setRecipientVerified(false);
    setRecipientError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!form.sender_account_id) {
      setErrors({ sender_account_id: ['Please select a source wallet.'] });
      return;
    }

    if (!recipientVerified) {
      setRecipientError('Please verify the recipient first.');
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      setErrors({ amount: ['Please enter a valid amount.'] });
      return;
    }

    if (selectedWallet && parseFloat(form.amount) > selectedWallet.balance) {
      setErrors({ amount: ['Insufficient balance.'] });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Transfer',
      html: `
        <div class="text-left">
          <p><strong>From:</strong> ${selectedWallet?.name} (${selectedWallet?.wallet_number})</p>
          <p><strong>To:</strong> ${recipient?.name} (${recipient?.wallet_number})</p>
          <p><strong>Amount:</strong> ${formatPrice(form.amount)}</p>
          ${form.note ? `<p><strong>Note:</strong> ${form.note}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#007c89',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Confirm Transfer',
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await api.post('/account-transfers', {
        sender_account_id: parseInt(form.sender_account_id),
        recipient_wallet_number: form.recipient_wallet_number.trim().toUpperCase(),
        amount: parseFloat(form.amount),
        note: form.note || null,
      });

      const transferId = res.data?.data?.id;
      onClose();
      navigate(`/account-transfers/${transferId}`);
    } catch (err) {
      if (err.response?.status === 422) {
        const responseErrors = err.response.data.errors || {};
        setErrors(responseErrors);
        if (err.response.data.message) {
          Swal.fire('Error', err.response.data.message, 'error');
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to process transfer', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">New Wallet Transfer</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Transfer funds using wallet/card number</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Source Wallet */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Source Wallet <span className="text-red-500">*</span>
            </label>
            {walletId ? (
              <div className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium">
                {selectedWallet ? `${selectedWallet.name} (${selectedWallet.wallet_number}) — ${formatPrice(selectedWallet.balance)}` : 'Loading...'}
              </div>
            ) : (
              <select
                value={form.sender_account_id}
                onChange={(e) => setForm(prev => ({ ...prev, sender_account_id: e.target.value }))}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]/20 focus:border-[#007c89] ${errors.sender_account_id ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
              >
                <option value="">Select a wallet</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.wallet_number}) — {formatPrice(w.balance)}</option>
                ))}
              </select>
            )}
            {errors.sender_account_id && <p className="mt-1 text-[10px] text-red-500">{errors.sender_account_id[0]}</p>}
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Recipient Wallet Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.recipient_wallet_number}
                onChange={(e) => handleWalletNumberChange(e.target.value)}
                placeholder="WLT-000000000001"
                className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]/20 focus:border-[#007c89] font-mono uppercase ${recipientError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleVerifyRecipient}
                disabled={verifying || !form.recipient_wallet_number.trim()}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
              >
                {verifying ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    Verify
                  </span>
                ) : 'Verify'}
              </button>
            </div>
            {recipientError && <p className="mt-1 text-[10px] text-red-500">{recipientError}</p>}
          </div>

          {/* Verified Recipient */}
          {recipientVerified && recipient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-800">{recipient.name}</span>
                    <span className="text-[10px] text-green-600">Verified</span>
                  </div>
                  <p className="text-[10px] text-green-600 truncate">{recipient.wallet_number} &middot; {recipient.type}</p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]/20 focus:border-[#007c89] ${errors.amount ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.amount && <p className="mt-1 text-[10px] text-red-500">{errors.amount[0]}</p>}
            {selectedWallet && form.amount && parseFloat(form.amount) > selectedWallet.balance && (
              <p className="mt-1 text-[10px] text-red-500">Insufficient balance. Available: {formatPrice(selectedWallet.balance)}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]/20 focus:border-[#007c89] resize-none"
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !recipientVerified}
              className="flex-[2] px-4 py-2 text-sm font-medium text-white bg-[#007c89] rounded-lg hover:bg-[#006a75] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transfer Funds
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}