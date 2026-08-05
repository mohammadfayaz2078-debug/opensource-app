// pages/Account/Show.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import DepositModal from './components/DepositModal';
import WithdrawalModal from './components/WithdrawalModal';
import EmptyState from './components/EmptyState';

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

const AccountShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/company-admin') ? '/company-admin' : '';
  
  const [account, setAccount] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionMeta, setTransactionMeta] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountRes, depositsRes, withdrawalsRes] = await Promise.all([
        api.get(`/accounts/${id}`),
        api.get('/account-deposits'),
        api.get('/account-withdrawals')
      ]);

      setAccount(accountRes.data.data);
      
      const filteredDeposits = depositsRes.data?.data 
        ? depositsRes.data.data.filter(d => d.account_id === parseInt(id))
        : [];
      
      const filteredWithdrawals = withdrawalsRes.data?.data 
        ? withdrawalsRes.data.data.filter(w => w.account_id === parseInt(id))
        : [];
      
      setDeposits(filteredDeposits);
      setWithdrawals(filteredWithdrawals);
      
      await fetchTransactions(1);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      Swal.fire('Error', 'Failed to load account data', 'error');
      navigate(`${basePath}/accounts`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setTransactionLoading(true);
    try {
      const res = await api.get(`/accounts/${id}/transactions?page=${page}`);
      setTransactions(res.data.data || []);
      setTransactionMeta(res.data);
      setTransactionPage(page);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDeposit = async (data) => {
    try {
      await api.post('/account-deposits', {
        account_id: id,
        ...data
      });
      await fetchData();
      Swal.fire('Success!', 'Deposit completed successfully.', 'success');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to process deposit', 'error');
      throw err;
    }
  };

  const handleWithdrawal = async (data) => {
    try {
      await api.post('/account-withdrawals', {
        account_id: id,
        ...data
      });
      await fetchData();
      Swal.fire('Success!', 'Withdrawal completed successfully.', 'success');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to process withdrawal', 'error');
      throw err;
    }
  };

  const handleTransactionPageChange = (page) => {
    if (page >= 1 && page <= transactionMeta?.last_page) {
      fetchTransactions(page);
    }
  };

  // Helper functions for transaction types
  const getTransactionBadge = (type) => {
    const badges = {
      income: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      deposit: 'bg-blue-100 text-blue-800',
      withdraw: 'bg-orange-100 text-orange-800',
      withdrawal: 'bg-orange-100 text-orange-800',
      transfer: 'bg-purple-100 text-purple-800',
      payment: 'bg-teal-100 text-teal-800',
      refund: 'bg-indigo-100 text-indigo-800',
      fee: 'bg-gray-100 text-gray-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const getTransactionIcon = (type) => {
    const icons = {
      income: (
        <svg className="w-3 h-3 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      ),
      expense: (
        <svg className="w-3 h-3 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      ),
      deposit: (
        <svg className="w-3 h-3 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ),
      withdraw: (
        <svg className="w-3 h-3 mr-1 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
      withdrawal: (
        <svg className="w-3 h-3 mr-1 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
      transfer: (
        <svg className="w-3 h-3 mr-1 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      payment: (
        <svg className="w-3 h-3 mr-1 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      refund: (
        <svg className="w-3 h-3 mr-1 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    };
    return icons[type] || null;
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      income: 'text-green-600',
      expense: 'text-red-600',
      deposit: 'text-blue-600',
      withdraw: 'text-orange-600',
      withdrawal: 'text-orange-600',
      transfer: 'text-purple-600',
      payment: 'text-teal-600',
      refund: 'text-indigo-600',
    };
    return colors[type] || 'text-gray-600';
  };

  const getTransactionSign = (type) => {
    const positive = ['income', 'deposit', 'refund'];
    return positive.includes(type) ? '+' : '-';
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading account...</span>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-gray-600">Wallet not found</p>
          <button
            onClick={() => navigate(`${basePath}/accounts`)}
            className="mt-2 text-blue-600 hover:underline"
          >
            Go back to wallets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(`${basePath}/accounts`)}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Wallets
        </button>

        {/* Account Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 break-words">{account.name}</h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                account.is_active 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {account.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDepositModalOpen(true)}
                className="px-3.5 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Deposit
              </button>
              <button
                onClick={() => setWithdrawalModalOpen(true)}
                className="px-3.5 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
                Withdraw
              </button>
            </div>
          </div>
          {account.description && (
            <p className="text-sm text-gray-500 mt-2">{account.description}</p>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm p-4 sm:p-6 mb-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-100 text-xs font-medium">Current Balance</p>
              <p className="text-2xl sm:text-3xl font-bold mt-0.5">{parseFloat(account.balance).toFixed(2)}</p>
              <p className="text-blue-100 text-xs">AFN</p>
            </div>
            <div className="flex gap-6 sm:gap-8">
              <div>
                <p className="text-blue-100 text-xs">Deposits</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2)}
                </p>
                <p className="text-blue-100 text-xs">AFN</p>
              </div>
              <div>
                <p className="text-blue-100 text-xs">Withdrawals</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0).toFixed(2)}
                </p>
                <p className="text-blue-100 text-xs">AFN</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Transactions
                {activeTab === 'transactions' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {transactionMeta?.total || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('deposits')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'deposits'
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Deposits
                {activeTab === 'deposits' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {deposits.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'withdrawals'
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Withdrawals
                {activeTab === 'withdrawals' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                )}
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {withdrawals.length}
                </span>
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <>
                {transactionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Balance After</th>
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-2">
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getTransactionBadge(transaction.type)}`}>
                                  {getTransactionIcon(transaction.type)}
                                  {transaction.type?.charAt(0).toUpperCase() + transaction.type?.slice(1) || 'Unknown'}
                                </span>
                              </td>
                              <td className={`py-2 font-medium whitespace-nowrap ${getTransactionTypeColor(transaction.type)}`}>
                                {getTransactionSign(transaction.type)} {parseFloat(transaction.amount).toFixed(2)} AFN
                              </td>
                              <td className="py-2 text-gray-600 whitespace-nowrap">
                                {parseFloat(transaction.balance_after).toFixed(2)} AFN
                              </td>
                              <td className="py-2 text-gray-600 max-w-xs truncate">
                                {transaction.description || '-'}
                              </td>
                              <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                                {new Date(transaction.created_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-gray-100">
                      {transactions.map((transaction) => {
                        const sign = getTransactionSign(transaction.type);
                        const isPositive = sign === '+';
                        return (
                          <div key={transaction.id} className="py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getTransactionBadge(transaction.type)}`}>
                                {getTransactionIcon(transaction.type)}
                                {transaction.type?.charAt(0).toUpperCase() + transaction.type?.slice(1) || 'Unknown'}
                              </span>
                              <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {sign} {parseFloat(transaction.amount).toFixed(2)} AFN
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Balance After:</span>
                                <span className="text-gray-700 font-medium">{parseFloat(transaction.balance_after).toFixed(2)} AFN</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Date:</span>
                                <span className="text-gray-700">{formatDate(transaction.created_at)}</span>
                              </div>
                              {transaction.description && (
                                <div className="text-xs text-gray-500 mt-1">{transaction.description}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {transactionMeta && transactionMeta.last_page > 1 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-100 gap-3">
                        <div className="text-xs text-gray-500 text-center sm:text-left">
                          Showing {transactionMeta.from || 0} to {transactionMeta.to || 0} of {transactionMeta.total || 0} transactions
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleTransactionPageChange(transactionPage - 1)}
                            disabled={transactionPage === 1}
                            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ◀
                          </button>
                          {generatePageNumbers(transactionPage, transactionMeta.last_page).map((p, i) => 
                            p === '...' ? (
                              <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                            ) : (
                              <button key={p} onClick={() => handleTransactionPageChange(p)} 
                                className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                                  p === transactionPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}>{p}</button>
                            )
                          )}
                          <button
                            onClick={() => handleTransactionPageChange(transactionPage + 1)}
                            disabled={transactionPage === transactionMeta.last_page}
                            className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState 
                    title="No transactions yet" 
                    message="Start by making your first transaction" 
                    actionLabel="Make Deposit"
                    onAction={() => setDepositModalOpen(true)}
                  />
                )}
              </>
            )}

            {/* Deposits Tab */}
            {activeTab === 'deposits' && (
              deposits.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {deposits.map((deposit) => (
                          <tr key={deposit.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 font-medium text-green-600 whitespace-nowrap">+{parseFloat(deposit.amount).toFixed(2)} AFN</td>
                            <td className="py-2 text-gray-600">{deposit.description || '-'}</td>
                            <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(deposit.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-bold text-green-600">+{parseFloat(deposit.amount).toFixed(2)} AFN</span>
                          <span className="text-xs text-gray-500">{formatDate(deposit.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600">{deposit.description || '-'}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title="No deposits yet" 
                  message="Start by making your first deposit" 
                  actionLabel="Make Deposit"
                  onAction={() => setDepositModalOpen(true)}
                />
              )
            )}

            {/* Withdrawals Tab */}
            {activeTab === 'withdrawals' && (
              withdrawals.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {withdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 font-medium text-red-600 whitespace-nowrap">-{parseFloat(withdrawal.amount).toFixed(2)} AFN</td>
                            <td className="py-2 text-gray-600">{withdrawal.description || '-'}</td>
                            <td className="py-2 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(withdrawal.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-bold text-red-600">-{parseFloat(withdrawal.amount).toFixed(2)} AFN</span>
                          <span className="text-xs text-gray-500">{formatDate(withdrawal.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600">{withdrawal.description || '-'}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState 
                  title="No withdrawals yet" 
                  message="Start by making your first withdrawal" 
                  actionLabel="Make Withdrawal"
                  onAction={() => setWithdrawalModalOpen(true)}
                />
              )
            )}
          </div>
        </div>

        {/* Modals */}
        <DepositModal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          onSuccess={handleDeposit}
        />
        
        <WithdrawalModal
          isOpen={withdrawalModalOpen}
          onClose={() => setWithdrawalModalOpen(false)}
          onSuccess={handleWithdrawal}
          currentBalance={account.balance}
        />
      </div>
    </div>
  );
};

export default AccountShow;
