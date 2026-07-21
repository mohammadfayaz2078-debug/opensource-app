import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function IncomeCategoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    income_account_id: '',
    is_active: true,
  });

  useEffect(() => {
    // Fetch income accounts
    api.get('/chart-of-accounts?per_page=1000').then(r => {
      const payload = r.data.data;
      setAccounts(Array.isArray(payload) ? payload : payload?.data || []);
    }).catch(() => {});
    
    // Fetch category data
    api.get(`/income-categories/${id}`).then(r => {
      const category = r.data.data;
      setForm({
        name: category.name || '',
        description: category.description || '',
        income_account_id: category.income_account_id || '',
        is_active: category.is_active ?? true,
      });
    }).catch(() => navigate('/income-categories')).finally(() => setFetching(false));
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.put(`/income-categories/${id}`, form);
      navigate(`/income-categories/${id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to update income category.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading category...</span>
      </div>
    );
  }

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/income-categories')} className="hover:text-[#007c89]">Income Categories</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => navigate(`/income-categories/${id}`)} className="hover:text-[#007c89]">
            {form.name}
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Income Category</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Category Information</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Category Name
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows="3"
                      className={inputClass('description')}
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Accounting</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Account
                    </label>
                    <select
                      name="income_account_id"
                      value={form.income_account_id}
                      onChange={handleChange}
                      className={inputClass('income_account_id')}
                    >
                      <option value="">Select income account</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Select the Chart of Accounts entry that will be credited for income in this category.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#007c89] focus:ring-[#007c89] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Inactive categories won't appear in dropdown menus
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/income-categories/${id}`)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}