import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitCategoryIndex() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [summary, setSummary] = useState({
    total_categories: 0,
    unit_categories: 0,
    weight_categories: 0,
    volume_categories: 0,
    length_categories: 0,
    time_categories: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchStatistics();
  }, [filterType]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType !== 'all') {
        params.measure_type = filterType;
      }
      const res = await api.get('/unit-categories', { params });
      setCategories(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await api.get('/unit-categories/statistics');
      setSummary(prev => ({ ...prev, ...res.data }));
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? This action cannot be undone.')) return;
    try {
      await api.delete(`/unit-categories/${id}`);
      fetchCategories();
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleSeedDefault = async () => {
    if (!confirm('This will add default unit categories (Pieces, Boxes, Packs, Weight, Volume, Length, Time). Continue?')) return;
    try {
      const res = await api.post('/unit-categories/seed-default');
      alert(res.data.message);
      fetchCategories();
      fetchStatistics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed default categories');
    }
  };

  const filtered = categories.filter(category =>
    category.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getMeasureTypeIcon = (type) => {
    const icons = {
      unit: '🔢',
      weight: '⚖️',
      volume: '🧪',
      length: '📏',
      time: '⏱️'
    };
    return icons[type] || '📦';
  };

  const getMeasureTypeBadge = (type) => {
    const badges = {
      unit: <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">Unit</span>,
      weight: <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700">Weight</span>,
      volume: <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700">Volume</span>,
      length: <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-50 text-yellow-700">Length</span>,
      time: <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700">Time</span>
    };
    return badges[type] || badges.unit;
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Unit Categories</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{summary.total_categories || 0} total</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{summary.unit_categories || 0} unit</span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{summary.weight_categories || 0} weight</span>
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{summary.volume_categories || 0} volume</span>
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{summary.length_categories || 0} length</span>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{summary.time_categories || 0} time</span>
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
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="all">All Types</option>
            <option value="unit">Unit</option>
            <option value="weight">Weight</option>
            <option value="volume">Volume</option>
            <option value="length">Length</option>
            <option value="time">Time</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedDefault}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Seed Default
          </button>
          <button
            onClick={() => navigate('/unit-categories/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/unit-categories/create"
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
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <p className="text-sm text-gray-700">
                {search || filterType !== 'all' 
                  ? 'No categories match your filters.' 
                  : 'No unit categories found.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Measure Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Units</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category, idx) => (
                  <tr key={category.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white text-xs shadow-sm">
                          {getMeasureTypeIcon(category.measure_type)}
                        </div>
                        <Link to={`/unit-categories/${category.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                          {category.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {getMeasureTypeBadge(category.measure_type)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 text-center">
                      {category.units_count || 0}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => navigate(`/unit-categories/${category.id}/edit`)}
                          className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
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
          )}
        </div>
      )}
    </div>
  );
}
