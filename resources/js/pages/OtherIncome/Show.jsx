import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function OtherIncomeShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncome();
  }, [id]);

  const fetchIncome = async () => {
    try {
      const res = await api.get(`/other-incomes/${id}`);
      setIncome(res.data.data);
    } catch (err) {
      console.error('Failed to fetch income', err);
      navigate('/other-incomes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this income record? This action cannot be undone.')) return;
    try {
      await api.delete(`/other-incomes/${id}`);
      navigate('/other-incomes');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleDuplicate = async () => {
    try {
      await api.post(`/other-incomes/${id}/duplicate`);
      alert('Income duplicated successfully');
      navigate('/other-incomes');
    } catch (err) {
      alert(err.response?.data?.message || 'Duplicate failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading income record...</span>
      </div>
    );
  }

  if (!income) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/other-incomes')} className="hover:text-[#007c89]">Other Incomes</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{income.income_number}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{income.income_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(income.income_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDuplicate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicate
            </button>
            <button
              onClick={() => navigate(`/other-incomes/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Description</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {income.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {income.note && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{income.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Amount Card */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm">
            <div className="px-6 py-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Amount Received</p>
              <p className="text-3xl font-bold text-green-700 mt-2">
                {income.amount?.toLocaleString()} {income.currency?.code || 'AFN'}
              </p>
              {income.currency?.code !== 'AFN' && (
                <p className="text-sm text-green-600 mt-1">
                  Base Amount: {income.amount_base?.toLocaleString()} AFN
                </p>
              )}
              {income.exchange_rate !== 1 && (
                <p className="text-xs text-green-500 mt-1">
                  Exchange Rate: 1 {income.currency?.code} = {income.exchange_rate} AFN
                </p>
              )}
            </div>
          </div>

          {/* Category & Accounts */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Category & Accounts</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Income Category</dt>
                  <dd className="mt-1">
                    {income.income_category ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-blue-100 text-blue-700">
                        {income.income_category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Uncategorized</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Income Account (Credit)</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {income.income_account?.name || '—'}
                    {income.income_account?.code && (
                      <span className="text-xs text-gray-400 ml-1">({income.income_account.code})</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Payment Account (Debit)</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {income.payment_account?.name || '—'}
                    {income.payment_account?.code && (
                      <span className="text-xs text-gray-400 ml-1">({income.payment_account.code})</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Audit Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="text-gray-700">{income.creator?.name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(income.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(income.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}