import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function IncomeCategoryCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

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
      await api.post('/income-categories', form);
      navigate('/income-categories');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create income category.' });
      }
    } finally {
      setLoading(false);
    }
  };

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
          <span className="text-gray-700">New Category</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Add Income Category</h1>
        <p className="text-sm text-gray-500 mt-1">Create a category to organize your income transactions</p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
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
                      Category Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                      placeholder="e.g., Sales Revenue, Service Income, Interest Income"
                      autoFocus
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
                      placeholder="Optional description of this income category..."
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting */}
          </div>

          {/* Sidebar Actions */}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Create Category
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/income-categories')}
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