// pages/Expenses/ExpenseIndex.jsx - Responsive
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const ExpenseIndex = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchExpenses(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, perPage]);

  const fetchExpenseTypes = async () => {
    try {
      const res = await api.get('/expense-types?active_only=true');
      setExpenseTypes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
    }
  };

  const fetchExpenses = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.expense_type_id = typeFilter;
      const res = await api.get('/expenses', { params });
      const data = res.data;
      setExpenses(data?.data || []);
      setTotalPages(data?.last_page || 1);
      setCurrentPage(data?.current_page || 1);
      setTotal(data?.total || 0);
      setSummaryData(data?.summary || null);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!confirm('Delete this expense? This action cannot be undone.')) return;
    try {
      await api.delete(`/expenses/${expense.id}`);
      fetchExpenses(currentPage);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {summaryData?.total_expenses || 0} total · AFN {formatAmount(summaryData?.total_amount)}
            </p>
          </div>
          <Link
            to="/expenses/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors self-start"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Expense
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">All Types</option>
            {expenseTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading expenses...</span>
        </div>
      )}

      {/* Table / Mobile Cards */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {expenses.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-700">
                {searchQuery || typeFilter ? 'No expenses match your filters.' : 'No expenses found.'}
              </p>
              {!searchQuery && !typeFilter && (
                <Link to="/expenses/create"
                  className="mt-3 inline-flex items-center px-4 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
                  Create your first expense
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Description / Vendor</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Account</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-gray-100 hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{formatDate(expense.date)}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                            {expense.expense_type?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {expense.description || 'No description'}
                            </p>
                            {expense.paid_to && (
                              <p className="text-xs text-gray-400">Vendor: {expense.paid_to}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-semibold text-gray-800">
                          {formatAmount(expense.amount)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                          {expense.account?.name || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                              className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(expense)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors" title="Delete">
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
                {expenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-gray-500">{formatDate(expense.date)}</div>
                        <div className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                          {expense.description || 'No description'}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                        {formatAmount(expense.amount)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full">
                        {expense.expense_type?.name || 'Uncategorized'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {expense.account?.name || '—'}
                      </span>
                    </div>
                    {expense.paid_to && (
                      <div className="text-xs text-gray-400 mb-2">Vendor: {expense.paid_to}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(expense)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                        Delete
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
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => fetchExpenses(1)} disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏮</button>
                <button onClick={() => fetchExpenses(currentPage - 1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">◀</button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchExpenses(p)} 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
                  )
                )}
                <button onClick={() => fetchExpenses(currentPage + 1)} disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">▶</button>
                <button onClick={() => fetchExpenses(totalPages)} disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏭</button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={perPage}
                  onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchExpenses(1, parseInt(e.target.value)); }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseIndex;