import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function CustomerShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.data);
    } catch (err) {
      console.error('Failed to fetch customer', err);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this customer? This action cannot be undone.')) return;
    try {
      await api.delete(`/customers/${id}`);
      navigate('/customers');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await api.post(`/customers/${id}/toggle-status`);
      setCustomer(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading customer...</span>
      </div>
    );
  }

  if (!customer) return null;

  // OpenStreetMap URL for GPS coordinates
  const mapUrl = customer.gps_lat && customer.gps_lng 
    ? `https://www.openstreetmap.org/?mlat=${customer.gps_lat}&mlon=${customer.gps_lng}#map=15/${customer.gps_lat}/${customer.gps_lng}`
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/customers')} className="hover:text-[#007c89]">Customers</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{customer.first_name} {customer.last_name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{customer.first_name} {customer.last_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Code: {customer.user_code}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                customer.is_active 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {customer.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/customers/${id}/edit`)}
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
        {/* Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Customer Code</dt>
                  <dd className="mt-1 font-mono text-sm text-gray-900">{customer.user_code}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      customer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.creator?.name || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(customer.created_at).toLocaleDateString()}
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
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-[#007c89] hover:underline">
                        {customer.phone}
                      </a>
                    ) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="text-[#007c89] hover:underline">
                        {customer.email}
                      </a>
                    ) : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Address & Location</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-3">
                {customer.street_address && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Street Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.street_address}</dd>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customer.district && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">District</dt>
                      <dd className="mt-1 text-sm text-gray-900">{customer.district}</dd>
                    </div>
                  )}
                  {customer.province && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">Province</dt>
                      <dd className="mt-1 text-sm text-gray-900">{customer.province}</dd>
                    </div>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Country</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.country}</dd>
                </div>
                {(customer.gps_lat || customer.gps_lng) && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">GPS Coordinates</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {customer.gps_lat && customer.gps_lng && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[#007c89] hover:underline">
                          {customer.gps_lat}, {customer.gps_lng} (View on Map)
                        </a>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Notes */}
          {customer.note && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Notes</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.note}</p>
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
                      customer.opening_balance_type === 'debit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {customer.opening_balance?.toLocaleString()} AFN
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({customer.opening_balance_type === 'debit' ? 'Debit' : 'Credit'})
                    </span>
                  </dd>
                  <dd className="text-xs text-gray-400 mt-1">
                    {customer.opening_balance_type === 'debit' 
                      ? 'Customer owes this amount to your business' 
                      : 'Your business owes this amount to the customer'}
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
                  <dd className="text-gray-700">{new Date(customer.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(customer.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}