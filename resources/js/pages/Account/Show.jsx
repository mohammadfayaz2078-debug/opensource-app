// pages/Account/Show.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import DepositModal from './components/DepositModal';
import WithdrawalModal from './components/WithdrawalModal';
import EmptyState from './components/EmptyState';

const AccountShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
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
      
      // Fix: Check if data exists before filtering
      const filteredDeposits = depositsRes.data?.data 
        ? depositsRes.data.data.filter(d => d.account_id === parseInt(id))
        : [];
      
      const filteredWithdrawals = withdrawalsRes.data?.data 
        ? withdrawalsRes.data.data.filter(w => w.account_id === parseInt(id))
        : [];
      
      setDeposits(filteredDeposits);
      setWithdrawals(filteredWithdrawals);
      
      // Fetch transactions
      await fetchTransactions(1);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      Swal.fire('Error', 'Failed to load account data', 'error');
      navigate('/accounts');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Account not found</p>
          <button
            onClick={() => navigate('/accounts')}
            className="mt-2 text-blue-600 hover:underline"
          >
            Go back to accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/accounts')}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Accounts
        </button>

        {/* Account Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800">{account.name}</h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                account.is_active 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {account.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex gap-2">
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
            <p className="text-sm text-gray-500 mt-1">{account.description}</p>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm p-4 mb-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Current Balance</p>
              <p className="text-2xl font-bold mt-0.5">{parseFloat(account.balance).toFixed(2)}</p>
              <p className="text-blue-100 text-xs">AFN</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-blue-100 text-xs">Deposits</p>
                <p className="text-lg font-semibold">
                  {deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2)}
                </p>
                <p className="text-blue-100 text-xs">AFN</p>
              </div>
              <div>
                <p className="text-blue-100 text-xs">Withdrawals</p>
                <p className="text-lg font-semibold">
                  {withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0).toFixed(2)}
                </p>
                <p className="text-blue-100 text-xs">AFN</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
                    <div className="overflow-x-auto">
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
                              <td className={`py-2 font-medium ${getTransactionTypeColor(transaction.type)}`}>
                                {getTransactionSign(transaction.type)} {parseFloat(transaction.amount).toFixed(2)} AFN
                              </td>
                              <td className="py-2 text-gray-600">
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

                    {/* Pagination */}
                    {transactionMeta && transactionMeta.last_page > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          Showing {transactionMeta.from || 0} to {transactionMeta.to || 0} of {transactionMeta.total || 0} transactions
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTransactionPageChange(transactionPage - 1)}
                            disabled={transactionPage === 1}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          {Array.from({ length: Math.min(5, transactionMeta.last_page) }, (_, i) => {
                            let pageNum;
                            const current = transactionPage;
                            const last = transactionMeta.last_page;
                            
                            if (last <= 5) {
                              pageNum = i + 1;
                            } else if (current <= 3) {
                              pageNum = i + 1;
                            } else if (current >= last - 2) {
                              pageNum = last - 4 + i;
                            } else {
                              pageNum = current - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handleTransactionPageChange(pageNum)}
                                className={`px-2.5 py-1 text-xs border rounded transition-colors ${
                                  pageNum === transactionPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => handleTransactionPageChange(transactionPage + 1)}
                            disabled={transactionPage === transactionMeta.last_page}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
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
                <div className="overflow-x-auto">
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
                          <td className="py-2 font-medium text-green-600">+{parseFloat(deposit.amount).toFixed(2)} AFN</td>
                          <td className="py-2 text-gray-600">{deposit.description || '-'}</td>
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(deposit.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                <div className="overflow-x-auto">
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
                          <td className="py-2 font-medium text-red-600">-{parseFloat(withdrawal.amount).toFixed(2)} AFN</td>
                          <td className="py-2 text-gray-600">{withdrawal.description || '-'}</td>
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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