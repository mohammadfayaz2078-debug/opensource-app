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

export default function UnitCategoryIndex() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [summary, setSummary] = useState({
    total_categories: 0,
    unit_categories: 0,
    weight_categories: 0,
    volume_categories: 0,
    length_categories: 0,
    time_categories: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchCategories(1), 300);
    return () => clearTimeout(t);
  }, [filterType, search, perPage]);

  const fetchCategories = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      if (filterType !== 'all') {
        params.measure_type = filterType;
      }
      const res = await api.get('/unit-categories', { params });
      setCategories(res.data.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
      if (res.data.summary) setSummary(res.data.summary);
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
    if (!confirm(t('unit_category.delete_confirm'))) return;
    try {
      await api.delete(`/unit-categories/${id}`);
      fetchCategories(currentPage);
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || t('unit_category.delete_failed');
      alert(message);
    }
  };

  const handleSeedDefault = async () => {
    if (!confirm(t('unit_category.seed_confirm'))) return;
    try {
      const res = await api.post('/unit-categories/seed-default');
      alert(res.data.message);
      fetchCategories();
      fetchStatistics();
    } catch (err) {
      alert(err.response?.data?.message || t('unit_category.seed_failed'));
    }
  };

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
    const labels = {
      unit: t('unit_category.type_unit'),
      weight: t('unit_category.type_weight'),
      volume: t('unit_category.type_volume'),
      length: t('unit_category.type_length'),
      time: t('unit_category.type_time')
    };
    const colors = {
      unit: 'bg-blue-50 text-blue-700',
      weight: 'bg-green-50 text-green-700',
      volume: 'bg-purple-50 text-purple-700',
      length: 'bg-yellow-50 text-yellow-700',
      time: 'bg-orange-50 text-orange-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${colors[type] || colors.unit}`}>
        {labels[type] || labels.unit}
      </span>
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('unit_category.title')}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('unit_category.total', { count: summary.total_categories || 0 })}</span>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t('unit_category.unit_count', { count: summary.unit_categories || 0 })}</span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{t('unit_category.weight_count', { count: summary.weight_categories || 0 })}</span>
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{t('unit_category.volume_count', { count: summary.volume_categories || 0 })}</span>
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{t('unit_category.length_count', { count: summary.length_categories || 0 })}</span>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{t('unit_category.time_count', { count: summary.time_categories || 0 })}</span>
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
              placeholder={t('unit_category.search_placeholder')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="all">{t('unit_category.all_types')}</option>
            <option value="unit">{t('unit_category.type_unit')}</option>
            <option value="weight">{t('unit_category.type_weight')}</option>
            <option value="volume">{t('unit_category.type_volume')}</option>
            <option value="length">{t('unit_category.type_length')}</option>
            <option value="time">{t('unit_category.type_time')}</option>
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
            {t('unit_category.seed_default')}
          </button>
          <button
            onClick={() => navigate('/unit-categories/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('unit_category.export')}
          </button>
          <Link
            to="/unit-categories/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t('unit_category.new')}
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('unit_category.loading')}</span>
        </div>
      )}

      {/* Table / Mobile Cards */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <p className="text-sm text-gray-700">
                {search || filterType !== 'all' 
                  ? t('unit_category.no_results_filters') 
                  : t('unit_category.no_results')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit_category.col_name')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit_category.col_measure_type')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit_category.col_units')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit_category.col_created')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('unit_category.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, idx) => (
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
                              title={t('edit')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
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
                {categories.map((category) => (
                  <div key={category.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white text-xs shadow-sm">
                          {getMeasureTypeIcon(category.measure_type)}
                        </div>
                        <div>
                          <Link to={`/unit-categories/${category.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#007c89]">
                            {category.name}
                          </Link>
                        </div>
                      </div>
                      {getMeasureTypeBadge(category.measure_type)}
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('unit_category.units_label')}</span>
                        <span className="text-gray-700 font-medium">{category.units_count || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t('unit_category.created_label')}</span>
                        <span className="text-gray-700">{new Date(category.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/unit-categories/${category.id}`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        {t('view')}
                      </button>
                      <button
                        onClick={() => navigate(`/unit-categories/${category.id}/edit`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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
                {t('unit_category.page_of', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center justify-center gap-1">
                {/* First */}
                <button 
                  onClick={() => fetchCategories(1)} 
                  disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏮
                </button>
                {/* Prev */}
                <button 
                  onClick={() => fetchCategories(currentPage - 1)} 
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
                      onClick={() => fetchCategories(p)} 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {p}
                    </button>
                  )
                )}
                {/* Next */}
                <button 
                  onClick={() => fetchCategories(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ▶
                </button>
                {/* Last */}
                <button 
                  onClick={() => fetchCategories(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏭
                </button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">{t('unit_category.show')}</span>
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchCategories(1, parseInt(e.target.value)); }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">{t('unit_category.per_page')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
