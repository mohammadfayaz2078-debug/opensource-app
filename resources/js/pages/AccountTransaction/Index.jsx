import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

const TYPE_COLORS = {
  deposit: 'bg-green-100 text-green-700',
  withdrawal: 'bg-red-100 text-red-700',
  transfer: 'bg-blue-100 text-blue-700',
  expense: 'bg-orange-100 text-orange-700',
  income: 'bg-emerald-100 text-emerald-700',
  adjustment: 'bg-purple-100 text-purple-700',
};

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

export default function AccountTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const fetchTransactions = async (p = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page: p, per_page: pp };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await api.get('/account-transactions', { params });
      setTransactions(res.data.data || []);
      setMeta(res.data);
      setPage(p);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchTransactions(1), 300);
    return () => clearTimeout(t);
  }, [search, typeFilter, perPage]);

  const getTypeBadge = (type) => {
    const color = TYPE_COLORS[type] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  const getAmountStyle = (type) => {
    const isCredit = ['deposit', 'income', 'adjustment'].includes(type);
    return isCredit ? 'text-green-600' : 'text-red-600';
  };

  const getAmountPrefix = (type) => {
    const isCredit = ['deposit', 'income', 'adjustment'].includes(type);
    return isCredit ? '+' : '-';
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
    <div className="relative bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Account Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">View all financial transactions across accounts</p>
          </div>
          <button
            onClick={() => navigate('/accounts')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Manage Accounts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description or account..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] bg-white"
        >
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="transfer">Transfer</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="adjustment">Adjustment</option>
        </select>
        {(search || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); }}
            className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stats summary */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
          <span>Total: {meta?.total || 0} transactions</span>
          {meta?.total > 0 && (
            <span>
              Page {meta?.current_page || 1} of {meta?.last_page || 1}
            </span>
          )}
        </div>
      )}

      {/* Transactions Table / Mobile Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <div className="inline-block p-3 bg-gray-50 rounded-full mb-3">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No transactions found</h3>
          <p className="text-xs text-gray-400">
            {search || typeFilter ? 'Try adjusting your filters' : 'No transactions have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/accounts/${txn.account_id}`)}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                          {txn.account?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{txn.account?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">{getTypeBadge(txn.type)}</td>
                    <td className={`py-2.5 px-4 font-semibold whitespace-nowrap ${getAmountStyle(txn.type)}`}>
                      {getAmountPrefix(txn.type)} {parseFloat(txn.amount).toFixed(2)} <span className="text-xs font-normal text-gray-400">AFN</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                      {parseFloat(txn.balance_after).toFixed(2)} <span className="text-xs font-normal text-gray-400">AFN</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 max-w-[200px] truncate">
                      {txn.description || <span className="italic text-gray-300">No description</span>}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(txn.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/accounts/${txn.account_id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                      {txn.account?.name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{txn.account?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{formatDate(txn.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {getTypeBadge(txn.type)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Amount</div>
                    <div className={`text-sm font-bold ${getAmountStyle(txn.type)}`}>
                      {getAmountPrefix(txn.type)} {parseFloat(txn.amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase">Balance</div>
                    <div className="text-sm font-semibold text-gray-700">{parseFloat(txn.balance_after).toFixed(2)}</div>
                  </div>
                </div>
                {txn.description && (
                  <div className="text-xs text-gray-500 truncate">{txn.description}</div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  Showing {meta.from || 0} to {meta.to || 0} of {meta.total || 0} transactions
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => fetchTransactions(1)}
                    disabled={page === 1}
                    className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => fetchTransactions(page - 1)}
                    disabled={page === 1}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ◀
                  </button>
                  {generatePageNumbers(page, meta.last_page).map((p, i) => 
                    p === '...' ? (
                      <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button key={p} onClick={() => fetchTransactions(p)} 
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                          p === page
                            ? 'bg-[#007c89] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>{p}</button>
                    )
                  )}
                  <button
                    onClick={() => fetchTransactions(page + 1)}
                    disabled={page === meta.last_page}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => fetchTransactions(meta.last_page)}
                    disabled={page === meta.last_page}
                    className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏭
                  </button>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <span className="text-xs text-gray-500">Show</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(parseInt(e.target.value)); setPage(1); fetchTransactions(1, parseInt(e.target.value)); }}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-gray-500">per page</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}