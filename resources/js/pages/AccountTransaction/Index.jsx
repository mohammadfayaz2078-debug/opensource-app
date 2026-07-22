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

const TYPE_ICONS = {
  deposit: '↓',
  withdrawal: '↑',
  transfer: '↔',
  expense: '🛒',
  income: '💰',
  adjustment: '⚙',
};

export default function AccountTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);

  const fetchTransactions = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 25 };
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
  }, [search, typeFilter]);

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

  const handlePageChange = (p) => {
    if (p >= 1 && p <= (meta?.last_page || 1)) {
      fetchTransactions(p);
    }
  };

  const renderPagination = () => {
    if (!meta || meta.last_page <= 1) return null;
    const pages = [];
    const last = meta.last_page;
    const current = page;

    let start = Math.max(1, current - 2);
    let end = Math.min(last, current + 2);

    if (current <= 3) {
      start = 1;
      end = Math.min(5, last);
    }
    if (current >= last - 2) {
      start = Math.max(1, last - 4);
      end = last;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Showing {meta.from || 0} to {meta.to || 0} of {meta.total || 0} transactions
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === meta.last_page}
            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/40 rounded-xl p-6 -m-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Account Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">View all financial transactions across accounts</p>
          </div>
          <button
            onClick={() => navigate('/accounts')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description or account..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <span>Total: {meta?.total || 0} transactions</span>
          {meta?.total > 0 && (
            <span>
              Page {meta?.current_page || 1} of {meta?.last_page || 1}
            </span>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
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
          <div className="overflow-x-auto">
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
                    <td className="py-2.5 px-4">{getTypeBadge(txn.type)}</td>
                    <td className={`py-2.5 px-4 font-semibold ${getAmountStyle(txn.type)}`}>
                      {getAmountPrefix(txn.type)} {parseFloat(txn.amount).toFixed(2)} <span className="text-xs font-normal text-gray-400">AFN</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 font-medium">
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

          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50/50">
            {renderPagination()}
          </div>
        </div>
      )}
    </div>
  );
}
