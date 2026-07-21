import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function CustomerIndex() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [filterProvince, setFilterProvince] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [summary, setSummary] = useState({
    total_customers: 0,
    active_customers: 0,
    total_opening_balance: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchLocations();
  }, [filterActive, filterProvince]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterActive !== 'all') {
        params.is_active = filterActive === 'active';
      }
      if (filterProvince) {
        params.province = filterProvince;
      }
      const res = await api.get('/customers', { params });
      setCustomers(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/customers/locations');
      setProvinces(res.data.provinces || []);
    } catch {
      setProvinces([]);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer? This action cannot be undone.')) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSummary(prev => ({
        ...prev,
        total_customers: prev.total_customers - 1,
        active_customers: customers.find(c => c.id === id)?.is_active ? prev.active_customers - 1 : prev.active_customers,
        total_opening_balance: prev.total_opening_balance - (customers.find(c => c.id === id)?.opening_balance || 0)
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.post(`/customers/${id}/toggle-status`);
      setCustomers(prev => prev.map(c => 
        c.id === id ? { ...c, is_active: !currentStatus } : c
      ));
      if (!currentStatus) {
        setSummary(prev => ({ ...prev, active_customers: prev.active_customers + 1 }));
      } else {
        setSummary(prev => ({ ...prev, active_customers: prev.active_customers - 1 }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filtered = customers.filter(c =>
    c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user_code?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.district?.toLowerCase().includes(search.toLowerCase()) ||
    c.province?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_customers}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Customers</p>
              <p className="text-2xl font-bold text-green-600">{summary.active_customers}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Receivables</p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary.total_opening_balance?.toLocaleString()} AFN
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Provinces</p>
              <p className="text-2xl font-bold text-purple-600">{provinces.length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-1 gap-3">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, code, phone, email, or location..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
            
            <select
              value={filterActive}
              onChange={e => setFilterActive(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={filterProvince}
              onChange={e => setFilterProvince(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
            >
              <option value="">All Provinces</option>
              {provinces.map(province => (
                <option key={province.province} value={province.province}>
                  {province.province} ({province.customer_count})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/customers/export')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            
            <Link
              to="/customers/create"
              className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Customer
            </Link>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading customers...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-500">
                {search ? 'No customers match your search.' : 'No customers found. Create your first customer to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(customer => (
                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#007c89] bg-opacity-10 rounded-full flex items-center justify-center text-[#007c89] font-bold text-xs">
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                          </div>
                          <div>
                            <Link to={`/customers/${customer.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                              {customer.first_name} {customer.last_name}
                            </Link>
                            {customer.district && (
                              <p className="text-xs text-gray-500">{customer.district}, {customer.province}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-sm text-gray-600">{customer.user_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{customer.phone || '—'}</div>
                        <div className="text-xs text-gray-400">{customer.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {customer.province || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`font-medium ${customer.opening_balance_type === 'debit' ? 'text-green-600' : 'text-red-600'}`}>
                          {customer.opening_balance?.toLocaleString()} AFN
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({customer.opening_balance_type === 'debit' ? 'Debit' : 'Credit'})
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(customer.id, customer.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            customer.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}/edit`)}
                            className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}