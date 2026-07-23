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
      navigate('/other-incomes');
    } catch (err) {
      alert(err.response?.data?.message || 'Duplicate failed');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'AFN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <div className="p-6 -m-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <button onClick={() => navigate('/other-incomes')} className="hover:text-[#007c89] transition-colors flex items-center gap-1 whitespace-nowrap">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Other Incomes
            </button>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-700 font-medium truncate">{income.income_number || `#${income.id}`}</span>
          </div>

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Amount</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(income.amount)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200">
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Category</p>
            <p className="text-base sm:text-lg font-semibold text-blue-800 mt-1">
              {income.income_category?.name || 'Uncategorized'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200">
            <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">Account</p>
            <p className="text-base sm:text-lg font-semibold text-purple-800 mt-1">
              {income.account?.name || 'No Account'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Description
                </h2>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {income.description || (
                    <span className="text-gray-400 italic">No description provided.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Notes */}
            {income.note && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notes
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{income.note}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Details
                </h2>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Income Number</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{income.income_number || '—'}</dd>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(income.income_date)}</dd>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {income.income_category ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {income.income_category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {income.account ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {income.account.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
              </div>
            </div>

            {/* Audit Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Audit
                </h2>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {income.creator?.first_name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium flex-shrink-0">
                          {income.creator.first_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{income.creator?.first_name + ' ' + income.creator?.last_name || '—'}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </dd>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(income.created_at)}</dd>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(income.updated_at)}</dd>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/other-incomes/${id}/edit`)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Income
                </button>
                <button
                  onClick={handleDuplicate}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate Income
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Income
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}