import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function IncomeCategoryIndex() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [summary, setSummary] = useState({
    total_categories: 0,
    active_categories: 0,
    categories_with_accounts: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [filterActive]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterActive !== 'all') {
        params.is_active = filterActive === 'active';
      }
      const res = await api.get('/income-categories', { params });
      setCategories(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/income-categories/stats');
      setSummary(prev => ({ ...prev, ...res.data }));
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? This action cannot be undone.')) return;
    try {
      await api.delete(`/income-categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      fetchStats();
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.post(`/income-categories/${id}/toggle-status`);
      setCategories(prev => prev.map(c => 
        c.id === id ? { ...c, is_active: !currentStatus } : c
      ));
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filtered = categories.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Income Categories</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{summary.total_categories} total</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{summary.active_categories} active</span>
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
            onClick={() => navigate('/income-categories/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/income-categories/create"
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
          <span className="ml-3 text-gray-700 text-sm">Loading categories...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {search ? 'No Results Found' : 'No Income Categories Yet'}
              </h3>
              <p className="text-xs text-gray-500 mb-5 text-center max-w-[200px] leading-relaxed">
                {search ? 'Try adjusting your search or filters above.' : 'Start by creating your first income category to organize your earnings.'}
              </p>
              {!search && (
                <Link
                  to="/income-categories/create"
                  className="inline-flex items-center px-4 py-2 text-sm bg-[#007c89] text-white rounded-lg hover:bg-[#006d77] transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Category
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((category, idx) => (
                    <tr key={category.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <Link to={`/income-categories/${category.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                            {category.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">
                        {category.description || '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(category.id, category.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            category.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </button>
                       </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {new Date(category.created_at).toLocaleDateString()}
                       </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => navigate(`/income-categories/${category.id}/edit`)}
                            className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
