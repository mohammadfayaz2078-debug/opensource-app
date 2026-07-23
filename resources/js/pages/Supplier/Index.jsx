import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= Math.min(5, total); i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...', total);
  }
  return pages;
}

export default function SupplierIndex() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [summary, setSummary] = useState({
    total_suppliers: 0,
    active_suppliers: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    fetchSuppliers(1);
  }, [filterActive, perPage]);

  const fetchSuppliers = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (filterActive !== 'all') {
        params.is_active = filterActive === 'active';
      }
      const res = await api.get('/suppliers', { params });
      setSuppliers(res.data.data || []);
      setSummary(res.data.summary || {});
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier? This action cannot be undone.')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      setSummary(prev => ({
        ...prev,
        total_suppliers: prev.total_suppliers - 1,
        active_suppliers: suppliers.find(s => s.id === id)?.is_active ? prev.active_suppliers - 1 : prev.active_suppliers,
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const res = await api.post(`/suppliers/${id}/toggle-status`);
      setSuppliers(prev => prev.map(s => 
        s.id === id ? { ...s, is_active: !currentStatus } : s
      ));
      if (!currentStatus) {
        setSummary(prev => ({ ...prev, active_suppliers: prev.active_suppliers + 1 }));
      } else {
        setSummary(prev => ({ ...prev, active_suppliers: prev.active_suppliers - 1 }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filtered = suppliers.filter(s =>
    s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.supplier_code?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{summary.total_suppliers} total</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{summary.active_suppliers} active</span>
          </div>
        </div>
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
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/suppliers/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/suppliers/create"
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
          <span className="ml-3 text-gray-700 text-sm">Loading suppliers...</span>
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
                {search ? 'No suppliers match your search.' : 'No suppliers yet. Create your first supplier.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Supplier</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact Person</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Phone/Email</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((supplier, idx) => (
                      <tr key={supplier.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {supplier.first_name?.[0]}{supplier.last_name?.[0]}
                            </div>
                            <div>
                              <Link to={`/suppliers/${supplier.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">{supplier.first_name} {supplier.last_name}</Link>
                              {supplier.contact_person && <p className="text-[11px] text-gray-700">{supplier.contact_person}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{supplier.supplier_code}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{supplier.contact_person || '—'}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700"><div className="text-xs">{supplier.phone || '—'}</div><div className="text-[11px] text-gray-700">{supplier.email || ''}</div></td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700">{supplier.city ? `${supplier.city}, ${supplier.country}` : supplier.country || '—'}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <button onClick={() => handleToggleStatus(supplier.id, supplier.is_active)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${supplier.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-700'}`}>
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => navigate(`/suppliers/${supplier.id}/edit`)} className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(supplier.id)} className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title="Delete">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filtered.map((supplier) => (
                  <div key={supplier.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {supplier.first_name?.[0]}{supplier.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/suppliers/${supplier.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{supplier.first_name} {supplier.last_name}</Link>
                          {supplier.contact_person && <p className="text-[11px] text-gray-400 truncate">{supplier.contact_person}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleToggleStatus(supplier.id, supplier.is_active)}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${supplier.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-700'}`}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Code</span><span className="font-mono text-xs text-gray-700">{supplier.supplier_code || '—'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Phone</span><span className="text-gray-700">{supplier.phone || '—'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Email</span><span className="text-gray-700 text-right truncate max-w-[55%]">{supplier.email || '—'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">Location</span><span className="text-gray-700">{supplier.city ? `${supplier.city}, ${supplier.country}` : supplier.country || '—'}</span></div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Link to={`/suppliers/${supplier.id}`} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">View</Link>
                      <button onClick={() => navigate(`/suppliers/${supplier.id}/edit`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(supplier.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">Page {currentPage} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => fetchSuppliers(1)} disabled={currentPage === 1} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="First page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => fetchSuppliers(currentPage - 1)} disabled={currentPage === 1} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Previous page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 select-none">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchSuppliers(p)} className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-md font-medium transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>{p}</button>
                  )
                )}
                <button onClick={() => fetchSuppliers(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Next page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
                <button onClick={() => fetchSuppliers(totalPages)} disabled={currentPage === totalPages} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Last page">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                <span className="hidden sm:inline">Show</span>
                <select value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="hidden sm:inline">per page</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
