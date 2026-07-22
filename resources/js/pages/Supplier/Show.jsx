import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SupplierShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data);
    } catch (err) {
      console.error('Failed to fetch supplier', err);
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this supplier? This action cannot be undone.')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      navigate('/suppliers');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await api.post(`/suppliers/${id}/toggle-status`);
      setSupplier(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading supplier...</span>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/suppliers')} className="hover:text-[#007c89]">Suppliers</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{supplier.first_name} {supplier.last_name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{supplier.first_name} {supplier.last_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Code: {supplier.supplier_code}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                supplier.is_active 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {supplier.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/suppliers/${id}/edit`)}
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
        {/* Supplier Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Supplier Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Supplier Code</dt>
                  <dd className="mt-1 font-mono text-sm text-gray-900">{supplier.supplier_code}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Contact Person</dt>
                  <dd className="mt-1 text-sm text-gray-900">{supplier.contact_person || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      supplier.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {supplier.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {supplier.creator?.name || '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{supplier.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{supplier.email || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Address</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2">
                {supplier.address && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Street Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{supplier.address}</dd>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplier.city && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">City</dt>
                      <dd className="mt-1 text-sm text-gray-900">{supplier.city}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Country</dt>
                    <dd className="mt-1 text-sm text-gray-900">{supplier.country}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Notes */}
          {supplier.note && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Accounting */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Accounting</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Opening Balance</dt>
                  <dd className="mt-1">
                    <span className={`text-lg font-semibold ${
                      supplier.opening_balance_type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {supplier.opening_balance?.toLocaleString()} AFN
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({supplier.opening_balance_type === 'credit' ? 'Credit' : 'Debit'})
                    </span>
                  </dd>
                  <dd className="text-xs text-gray-400 mt-1">
                    {supplier.opening_balance_type === 'credit' 
                      ? 'Supplier owes this amount to your business' 
                      : 'Your business owes this amount to the supplier'}
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
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(supplier.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(supplier.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}