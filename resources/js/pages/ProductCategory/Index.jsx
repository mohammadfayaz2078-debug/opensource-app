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

export default function ProductCategoryIndex() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [summary, setSummary] = useState({
    total_categories: 0,
    categories_with_products: 0,
    categories_without_products: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchCategories(1), 300);
    return () => clearTimeout(t);
  }, [search, perPage]);

  const fetchCategories = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) {
        params.search = search;
      }
      const res = await api.get('/product-categories', { params });
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
      const res = await api.get('/product-categories/statistics');
      setSummary(prev => ({ ...prev, ...res.data }));
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('product_category.delete_confirm'))) return;
    try {
      await api.delete(`/product-categories/${id}`);
      fetchCategories(currentPage);
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || t('product_category.delete_failed');
      alert(message);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('product_category.title')}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('product_category.total', { count: summary.total_categories || 0 })}</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{t('product_category.with_products', { count: summary.categories_with_products || 0 })}</span>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{t('product_category.empty', { count: summary.categories_without_products || 0 })}</span>
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
              placeholder={t('product_category.search_placeholder')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/product-categories/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('product_category.export')}
          </button>
          <Link
            to="/product-categories/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t('product_category.new')}
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('product_category.loading')}</span>
        </div>
      )}

      {/* Table / Mobile Cards */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <p className="text-sm text-gray-700">
                {search ? t('product_category.no_results_search') : t('product_category.no_results')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('product_category.col_name')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('product_category.col_description')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('product_category.col_products')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('product_category.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, idx) => (
                      <tr key={category.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Link to={`/product-categories/${category.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                            {category.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">
                          {category.description || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 text-center">
                          {category.products_count || 0}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => navigate(`/product-categories/${category.id}`)}
                              className="p-1.5 rounded hover:bg-blue-50 text-gray-700 hover:text-[#007c89]"
                              title={t('view')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/product-categories/${category.id}/edit`)}
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
                      <div>
                        <Link to={`/product-categories/${category.id}`} className="text-sm font-semibold text-gray-900 hover:text-[#007c89]">
                          {category.name}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                          {category.description || '—'}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-bold text-gray-900">{category.products_count || 0}</div>
                        <div className="text-[10px] text-gray-400">{t('product_category.col_products')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/product-categories/${category.id}`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        {t('view')}
                      </button>
                      <button
                        onClick={() => navigate(`/product-categories/${category.id}/edit`)}
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
                {t('product_category.page_of', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center justify-center gap-1">
                <button 
                  onClick={() => fetchCategories(1)} 
                  disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏮
                </button>
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
                <button 
                  onClick={() => fetchCategories(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ▶
                </button>
                <button 
                  onClick={() => fetchCategories(totalPages)} 
                  disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ⏭
                </button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">{t('product_category.show')}</span>
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
                <span className="text-xs text-gray-500">{t('product_category.per_page')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
