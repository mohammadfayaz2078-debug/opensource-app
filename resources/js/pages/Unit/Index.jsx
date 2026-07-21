import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitIndex() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [summary, setSummary] = useState({
    total_units: 0,
    reference_units: 0,
    bigger_units: 0,
    smaller_units: 0,
    active_units: 0
  });

  useEffect(() => {
    fetchUnits();
    fetchCategories();
    fetchStatistics();
  }, [filterCategory, filterType]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) {
        params.category_id = filterCategory;
      }
      if (filterType !== 'all') {
        params.uom_type = filterType;
      }
      const res = await api.get('/units', { params });
      setUnits(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/unit-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await api.get('/units/statistics');
      setSummary(prev => ({ ...prev, ...res.data }));
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this unit? This action cannot be undone.')) return;
    try {
      await api.delete(`/units/${id}`);
      fetchUnits();
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.post(`/units/${id}/toggle-status`);
      setUnits(prev => prev.map(u => 
        u.id === id ? { ...u, is_active: !currentStatus } : u
      ));
      fetchStatistics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filtered = units.filter(unit =>
    unit.name?.toLowerCase().includes(search.toLowerCase()) ||
    unit.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const badges = {
      reference: <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Reference</span>,
      bigger: <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Bigger</span>,
      smaller: <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Smaller</span>
    };
    return badges[type] || badges.reference;
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Units</p>
              <p className="text-xl font-bold text-gray-900">{summary.total_units || 0}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Reference</p>
              <p className="text-xl font-bold text-blue-600">{summary.reference_units || 0}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⚓</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Bigger</p>
              <p className="text-xl font-bold text-green-600">{summary.bigger_units || 0}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⬆️</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Smaller</p>
              <p className="text-xl font-bold text-orange-600">{summary.smaller_units || 0}</p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⬇️</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">{summary.active_units || 0}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 shadow-sm mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-1 gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by unit name or category..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                />
              </div>
              
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
              >
                <option value="all">All Types</option>
                <option value="reference">Reference Units</option>
                <option value="bigger">Bigger Units</option>
                <option value="smaller">Smaller Units</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/units/convert')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Convert
              </button>
              
              <button
                onClick={() => navigate('/units/export')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              
              <Link
                to="/units/create"
                className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                New Unit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading units...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <p className="text-sm text-gray-500">
                {search || filterCategory || filterType !== 'all' 
                  ? 'No units match your filters.' 
                  : 'No units found. Create your first unit to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Factor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rounding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(unit => (
                    <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link to={`/units/${unit.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                          {unit.name}
                        </Link>
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{unit.category?.name || '—'}</span>
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTypeBadge(unit.uom_type)}
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm text-gray-600">
                        {unit.factor}
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-sm text-gray-600">
                        {unit.rounding}
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            unit.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {unit.is_active ? 'Active' : 'Inactive'}
                        </button>
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/units/${unit.id}/edit`)}
                            className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(unit.id)}
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