import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
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

export default function AccountTransferCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const basePath = location.pathname.startsWith('/company-admin') ? '/company-admin' : '';
  const [searchParams] = useSearchParams();
  const preselectedWalletId = searchParams.get('wallet_id') || '';
  const isLockedSource = !!searchParams.get('wallet_id');
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    sender_account_id: preselectedWalletId,
    recipient_wallet_number: '',
    amount: '',
    note: '',
  });

  const [recipient, setRecipient] = useState(null);
  const [recipientVerified, setRecipientVerified] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [errors, setErrors] = useState({});

  const fetchWallets = useCallback(async () => {
    try {
      const res = await api.get('/account-transfers/my-wallets');
      setWallets(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const selectedWallet = wallets.find(w => w.id === parseInt(form.sender_account_id));

  const handleVerifyRecipient = useCallback(async () => {
    const walletNumber = form.recipient_wallet_number.trim();
    if (!walletNumber) {
      setRecipientError(t('accountTransfer.please_enter_wallet'));
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
        setRecipientError(t('accountTransfer.wallet_not_found'));
      } else {
        setRecipientError(err.response?.data?.message || t('accountTransfer.failed_verify'));
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
      setErrors({ sender_account_id: [t('accountTransfer.select_source')] });
      return;
    }

    if (!recipientVerified) {
      setRecipientError(t('accountTransfer.please_verify'));
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      setErrors({ amount: [t('accountTransfer.enter_valid_amount')] });
      return;
    }

    if (selectedWallet && parseFloat(form.amount) > selectedWallet.balance) {
      setErrors({ amount: [t('accountTransfer.insufficient_balance')] });
      return;
    }

    const result = await Swal.fire({
      title: t('accountTransfer.confirm_title'),
      html: `
        <div class="text-left">
          <p><strong>${t('accountTransfer.from_label')}</strong> ${selectedWallet?.name} (${selectedWallet?.wallet_number})</p>
          <p><strong>${t('accountTransfer.to_label')}</strong> ${recipient?.name} (${recipient?.wallet_number})</p>
          <p><strong>${t('accountTransfer.amount_label')}</strong> ${formatPrice(form.amount)}</p>
          ${form.note ? `<p><strong>${t('accountTransfer.note_label2')}</strong> ${form.note}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#007c89',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('accountTransfer.confirm_button'),
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
      navigate(`${basePath}/account-transfers/${transferId}`);
    } catch (err) {
      if (err.response?.status === 422) {
        const responseErrors = err.response.data.errors || {};
        setErrors(responseErrors);
        if (err.response.data.message) {
          Swal.fire(t('error'), err.response.data.message, 'error');
        }
      } else {
        Swal.fire(t('error'), err.response?.data?.message || t('accountTransfer.failed_process'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]/20 focus:border-[#007c89] ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            {t('accountTransfer.back_to_transfers')}
          </button>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{t('accountTransfer.new_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('accountTransfer.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Source Wallet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountTransfer.source_wallet')} <span className="text-red-500">*</span>
            </label>
            {isLockedSource ? (
              <div className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {selectedWallet ? `${selectedWallet.name} (${selectedWallet.wallet_number}) - ${formatPrice(selectedWallet.balance)}` : t('accountTransfer.loading')}
              </div>
            ) : (
              <select
                value={form.sender_account_id}
                onChange={(e) => setForm(prev => ({ ...prev, sender_account_id: e.target.value }))}
                className={inputClass('sender_account_id')}
              >
                <option value="">{t('accountTransfer.select_your_wallet')}</option>
                {wallets.map(wallet => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.wallet_number}) - {formatPrice(wallet.balance)}
                  </option>
                ))}
              </select>
            )}
            {errors.sender_account_id && (
              <p className="mt-1 text-xs text-red-500">{errors.sender_account_id[0]}</p>
            )}
          </div>

          {/* Recipient Wallet Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountTransfer.recipient_number')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.recipient_wallet_number}
                onChange={(e) => handleWalletNumberChange(e.target.value)}
                placeholder={t('accountTransfer.wallet_placeholder')}
                className={`flex-1 ${inputClass('recipient_wallet_number')} font-mono uppercase`}
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleVerifyRecipient}
                disabled={verifying || !form.recipient_wallet_number.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
              >
                {verifying ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    {t('accountTransfer.verifying')}
                  </span>
                ) : (
                  t('accountTransfer.verify')
                )}
              </button>
            </div>
            {recipientError && (
              <p className="mt-1 text-xs text-red-500">{recipientError}</p>
            )}
          </div>

          {/* Verified Recipient Info */}
          {recipientVerified && recipient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">{t('accountTransfer.recipient_verified')}</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    <span className="font-semibold">{recipient.name}</span>
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {recipient.wallet_number} &middot; {recipient.type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountTransfer.amount')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className={inputClass('amount')}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-500">{errors.amount[0]}</p>
            )}
            {selectedWallet && form.amount && parseFloat(form.amount) > selectedWallet.balance && (
              <p className="mt-1 text-xs text-red-500">
                {t('accountTransfer.insufficient_available', { amount: formatPrice(selectedWallet.balance) })}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('accountTransfer.note_optional')}
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder={t('accountTransfer.note_placeholder')}
              rows={3}
              className={inputClass('note')}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-400">{t('accountTransfer.characters', { count: form.note.length })}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !recipientVerified}
              className="flex-[2] px-4 py-2.5 text-sm font-medium text-white bg-[#007c89] rounded-lg hover:bg-[#006a75] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('accountTransfer.processing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {t('accountTransfer.transfer_funds')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
