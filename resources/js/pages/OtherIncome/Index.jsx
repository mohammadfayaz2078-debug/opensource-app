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

export default function OtherIncomeIndex() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    income_category_id: '',
    account_id: '',
  });
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [stats, setStats] = useState({
    current_month_total: 0,
    current_month_count: 0,
    previous_month_total: 0,
    change_percentage: 0,
  });

  useEffect(() => {
    fetchStats();
    fetchCategories();
    fetchAccounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchIncomes(1), 300);
    return () => clearTimeout(t);
  }, [search, filters, perPage]);

  const fetchIncomes = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp, ...filters };
      if (search) params.search = search;
      const res = await api.get('/other-incomes', { params });
      setIncomes(res.data.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch {
      setIncomes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/other-incomes/stats');
      setStats(prev => ({ ...prev, ...res.data }));
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/income-categories?per_page=1000');
      const payload = res.data.data;
      setCategories(Array.isArray(payload) ? payload : payload?.data || []);
    } catch {}
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts/list/options');
      setAccounts(res.data?.data || []);
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm(t('other_income.delete_confirm'))) return;
    try {
      await api.delete(`/other-incomes/${id}`);
      fetchIncomes(currentPage);
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || t('other_income.delete_failed'));
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/other-incomes/${id}/duplicate`);
      fetchIncomes(currentPage);
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || t('other_income.duplicate_failed'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'AFN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('other_income.title')}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('other_income.records', { count: total })}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('other_income.search_placeholder')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <input
            type="date"
            value={filters.from_date}
            onChange={e => updateFilter('from_date', e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
            title={t('other_income.from_title')}
          />
          <input
            type="date"
            value={filters.to_date}
            onChange={e => updateFilter('to_date', e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
            title={t('other_income.to_title')}
          />
          <select
            value={filters.income_category_id}
            onChange={e => updateFilter('income_category_id', e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">{t('other_income.all_categories')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={filters.account_id}
            onChange={e => updateFilter('account_id', e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">{t('other_income.all_wallets')}</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/other-incomes?export=1')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('other_income.export')}
          </button>
          <Link
            to="/other-incomes/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {t('other_income.new')}
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('other_income.loading')}</span>
        </div>
      )}

      {/* Table / Mobile Cards */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {incomes.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-700">
                {search || filters.from_date || filters.to_date || filters.income_category_id || filters.account_id
                  ? t('other_income.no_filters_match')
                  : t('other_income.no_records')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_income_no')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_date')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_category')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_account')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_description')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_amount')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_created_by')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('other_income.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((income, idx) => (
                      <tr key={income.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <Link to={`/other-incomes/${income.id}`} className="text-sm font-medium text-[#007c89] hover:underline">
                            {income.income_number || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(income.income_date)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {income.income_category ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {income.income_category.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {income.account ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                              {income.account.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">
                          {income.description || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(income.amount)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {income.creator?.first_name + ' ' + income.creator?.last_name || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleDuplicate(income.id)}
                              className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                              title={t('other_income.duplicate')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/other-incomes/${income.id}/edit`)}
                              className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                              title={t('other_income.edit')}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(income.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
                              title={t('other_income.delete')}
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

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {incomes.map((income) => (
                  <div key={income.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <Link to={`/other-incomes/${income.id}`} className="text-sm font-semibold text-[#007c89] hover:underline">
                          {income.income_number || '—'}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">{formatDate(income.income_date)}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                        {formatCurrency(income.amount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {income.income_category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                          {income.income_category.name}
                        </span>
                      )}
                      {income.account && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                          {income.account.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mb-3 truncate">
                      {income.description || '—'}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        {income.creator?.first_name + ' ' + income.creator?.last_name || '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDuplicate(income.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          {t('other_income.duplicate')}
                        </button>
                        <button
                          onClick={() => navigate(`/other-incomes/${income.id}/edit`)}
                          className="px-2.5 py-1 text-[11px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                        >
                          {t('other_income.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(income.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          {t('other_income.delete')}
                        </button>
                      </div>
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
                {t('other_income.page_of', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => fetchIncomes(1)} disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏮</button>
                <button onClick={() => fetchIncomes(currentPage - 1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">◀</button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchIncomes(p)} 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
                  )
                )}
                <button onClick={() => fetchIncomes(currentPage + 1)} disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">▶</button>
                <button onClick={() => fetchIncomes(totalPages)} disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏭</button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">{t('other_income.show')}</span>
                <select value={perPage}
                  onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchIncomes(1, parseInt(e.target.value)); }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">{t('other_income.per_page')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}