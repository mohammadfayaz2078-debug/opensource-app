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
  });

  const [filterStatus, setFilterStatus] = useState('customer');

  useEffect(() => {
    fetchCustomers();
    fetchLocations();
  }, [filterActive, filterProvince, filterStatus]);

  const fetchCustomers = async () => {
    setLoading(true);
    setCustomers([]); // Clear old data immediately to avoid flash of wrong data
    try {
      const params = {};
      if (filterActive !== 'all') {
        params.is_active = filterActive === 'active';
      }
      if (filterStatus) {
        params.status = filterStatus;
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

  const handleConvertToCustomer = async (id) => {
    if (!confirm('Convert this lead to a customer?\n\nPending orders will be converted to invoices.')) return;
    try {
      const res = await api.post(`/customers/${id}/convert-to-customer`);
      alert(res.data.message);
      // Refresh the list
      const params = { status: 'lead' };
      if (filterActive !== 'all') params.is_active = filterActive === 'active';
      if (filterProvince) params.province = filterProvince;
      const refreshRes = await api.get('/customers', { params });
      setCustomers(refreshRes.data.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert lead.');
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
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{summary.total_customers} total</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{summary.active_customers} active</span>
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{provinces.length} provinces</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-6">
          {[
            { id: 'customer', label: 'Customers' },
            { id: 'lead', label: '🔹 Leads' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setFilterStatus(tab.id)}
              className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${filterStatus === tab.id ? 'border-[#007c89] text-[#007c89]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterProvince}
            onChange={e => setFilterProvince(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
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
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/customers/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading customers...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-700">
                {search ? 'No customers match your search.' : 'No customers yet. Create your first customer.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, idx) => (
                  <tr key={customer.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {customer.first_name?.[0]}{customer.last_name?.[0]}
                        </div>
                        <div>
                          <Link to={`/customers/${customer.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                            {customer.first_name} {customer.last_name}
                          </Link>
                          {customer.district && (
                            <p className="text-[11px] text-gray-700">{customer.district}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{customer.user_code}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">
                      <div className="text-xs">{customer.phone || '—'}</div>
                      <div className="text-[11px] text-gray-700">{customer.email || ''}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700">
                      {customer.province || '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        customer.status === 'lead' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {customer.status === 'lead' ? 'Lead' : 'Customer'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleStatus(customer.id, customer.is_active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          customer.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {customer.status === 'lead' && (
                          <button
                            onClick={() => handleConvertToCustomer(customer.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold
                              bg-emerald-50 text-emerald-700 border border-emerald-200
                              hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                            title="Convert to Customer"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Convert
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/customers/${customer.id}/edit`)}
                          className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
