import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function IncomeCategoryShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    try {
      const res = await api.get(`/income-categories/${id}`);
      setCategory(res.data.data);
    } catch (err) {
      console.error('Failed to fetch category', err);
      navigate('/income-categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this category? This action cannot be undone.')) return;
    try {
      await api.delete(`/income-categories/${id}`);
      navigate('/income-categories');
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await api.post(`/income-categories/${id}/toggle-status`);
      setCategory(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading category...</span>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/income-categories')} className="hover:text-[#007c89]">Income Categories</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{category.name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{category.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Income Category</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                category.is_active 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {category.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/income-categories/${id}/edit`)}
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
                {category.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Related Incomes (if other_incomes relationship exists) */}
          {category.other_incomes_count > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Related Income Records</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600">
                  This category has {category.other_incomes_count} income record(s) associated with it.
                </p>
                <button
                  onClick={() => navigate(`/other-incomes?category_id=${category.id}`)}
                  className="mt-3 text-sm text-[#007c89] hover:underline"
                >
                  View all →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Accounting Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Accounting</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Income Account</dt>
                  <dd className="mt-1">
                    {category.income_account ? (
                      <div>
                        <span className="text-sm font-medium text-gray-900">{category.income_account.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({category.income_account.code})</span>
                        {category.income_account.account_type && (
                          <p className="text-xs text-gray-500 mt-1">Type: {category.income_account.account_type}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No income account assigned</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Status & Audit */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Status & Audit</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="text-gray-700">{category.creator?.name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(category.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(category.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}