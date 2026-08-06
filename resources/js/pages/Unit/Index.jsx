import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

const generatePageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

export default function UnitIndex() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [summary, setSummary] = useState({
    total_units: 0,
    reference_units: 0,
    bigger_units: 0,
    smaller_units: 0,
    active_units: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchStatistics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchUnits(1), 300);
    return () => clearTimeout(t);
  }, [filterCategory, filterType, search, perPage]);

  const fetchUnits = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      if (filterCategory) {
        params.category_id = filterCategory;
      }
      if (filterType !== 'all') {
        params.uom_type = filterType;
      }
      const res = await api.get('/units', { params });
      setUnits(res.data.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
      if (res.data.summary) setSummary(res.data.summary);
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
    if (!confirm(t('unit.delete_confirm'))) return;
    try {
      await api.delete(`/units/${id}`);
      fetchUnits(currentPage);
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || t('unit.delete_failed');
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
      alert(err.response?.data?.message || t('unit.toggle_failed'));
    }
  };

  const getTypeBadge = (type) => {
    const labels = {
      reference: t('unit.type_reference'),
      bigger: t('unit.type_bigger'),
      smaller: t('unit.type_smaller')
    };
    const colors = {
      reference: 'bg-blue-100 text-blue-700',
      bigger: 'bg-green-100 text-green-700',
      smaller: 'bg-orange-100 text-orange-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type] || colors.reference}`}>
        {labels[type] || labels.reference}
      </span>
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('unit.title')}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('unit.total', { count: summary.total_units })}</span>
            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{t('unit.reference_count', { count: summary.reference_units })}</span>
            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{t('unit.bigger_count', { count: summary.bigger_units })}</span>
            <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">{t('unit.smaller_count', { count: summary.smaller_units })}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{t('unit.active_count', { count: summary.active_units })}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-700">{t('unit.stat_total')}</p>
              <p className="text-base sm:text-xl font-bold text-gray-900">{summary.total_units || 0}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-700">{t('unit.stat_reference')}</p>
              <p className="text-base sm:text-xl font-bold text-blue-600">{summary.reference_units || 0}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⚓</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-700">{t('unit.stat_bigger')}</p>
              <p className="text-base sm:text-xl font-bold text-green-600">{summary.bigger_units || 0}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⬆️</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-700">{t('unit.stat_smaller')}</p>
              <p className="text-base sm:text-xl font-bold text-orange-600">{summary.smaller_units || 0}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-sm">⬇️</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-700">{t('unit.stat_active')}</p>
              <p className="text-base sm:text-xl font-bold text-green-600">{summary.active_units || 0}</p>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
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
              placeholder={t('unit.search_placeholder')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">{t('unit.all_categories')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="all">{t('unit.all_types')}</option>
            <option value="reference">{t('unit.type_reference')}</option>
            <option value="bigger">{t('unit.type_bigger')}</option>
            <option value="smaller">{t('unit.type_smaller')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/units/convert')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t('unit.convert')}
          </button>
          <button
            onClick={() => navigate('/units/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('unit.export')}
          </button>
          <Link
            to="/units/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t('unit.new_unit')}
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('unit.loading')}</span>
        </div>
      )}

      {/* Table / Mobile Cards */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {units.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <p className="text-sm text-gray-700">
                {search || filterCategory || filterType !== 'all' 
                  ? t('unit.no_results_filters') 
                  : t('unit.no_results')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_unit_name')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_category')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_type')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_factor')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_rounding')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_status')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((unit, idx) => (
                      <tr key={unit.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Link to={`/units/${unit.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                            {unit.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{unit.category?.name || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {getTypeBadge(unit.uom_type)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-sm text-gray-700">
                          {Number(unit.factor).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-mono text-sm text-gray-700">
                          {Number(unit.rounding).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              unit.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {unit.is_active ? t('active') : t('inactive')}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => navigate(`/units/${unit.id}/edit`)}
                              className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                              title={t('edit')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(unit.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
                              title={t('delete')}
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

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {units.map((unit) => (
                  <div key={unit.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link to={`/units/${unit.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#007c89]">
                          {unit.name}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">{unit.category?.name || '—'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getTypeBadge(unit.uom_type)}
                        <button
                          onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            unit.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {unit.is_active ? t('active') : t('inactive')}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('unit.factor_label')}</span>
                        <span className="text-gray-700 font-mono font-medium">{Number(unit.factor).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('unit.rounding_label')}</span>
                        <span className="text-gray-700 font-mono font-medium">{Number(unit.rounding).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/units/${unit.id}`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        {t('view')}
                      </button>
                      <button
                        onClick={() => navigate(`/units/${unit.id}/edit`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                {t('unit.page_of', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center justify-center gap-1">
                {/* First */}
                <button 
                  onClick={() => fetchUnits(1)} 
                  disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏮
                </button>
                {/* Prev */}
                <button 
                  onClick={() => fetchUnits(currentPage - 1)} 
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ◀
                </button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button 
                      key={p} 
                      onClick={() => fetchUnits(p)} 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {p}
                    </button>
                  )
                )}
                {/* Next */}
                <button 
                  onClick={() => fetchUnits(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ▶
                </button>
                {/* Last */}
                <button 
                  onClick={() => fetchUnits(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏭
                </button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">{t('unit.show')}</span>
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchUnits(1, parseInt(e.target.value)); }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">{t('unit.per_page')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
