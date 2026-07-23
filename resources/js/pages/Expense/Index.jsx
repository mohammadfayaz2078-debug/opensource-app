// pages/Expenses/ExpenseIndex.jsx - Fixed
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Tag,
  Calendar,
  DollarSign,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

const ExpenseIndex = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1
  });

  useEffect(() => {
    fetchExpenseTypes();
    fetchExpenses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, current_page: 1 }));
      fetchExpenses();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [pagination.current_page, pagination.per_page]);

  const fetchExpenseTypes = async () => {
    try {
      const res = await api.get('/expense-types?active_only=true');
      setExpenseTypes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page
      };
      
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.expense_type_id = typeFilter;

      const res = await api.get('/expenses', { params });
      setExpenses(res.data?.data || []);
      setPagination({
        current_page: res.data?.current_page || 1,
        per_page: res.data?.per_page || 20,
        total: res.data?.total || 0,
        last_page: res.data?.last_page || 1
      });
      setSummaryData(res.data?.summary || null);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      setPagination(prev => ({ ...prev, current_page: newPage }));
    }
  };

  const handlePerPageChange = (e) => {
    const newPerPage = parseInt(e.target.value);
    setPagination(prev => ({ 
      ...prev, 
      per_page: newPerPage,
      current_page: 1
    }));
  };

  const handleDelete = async (expense) => {
    const result = await Swal.fire({
      title: 'Delete Expense?',
      html: `Delete "<strong>${expense.description || 'Expense #' + expense.id}</strong>"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/expenses/${expense.id}`);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        fetchExpenses();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
      }
    }
  };

  // Helper function to safely format amount
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  const startItem = (pagination.current_page - 1) * pagination.per_page + 1;
  const endItem = Math.min(pagination.current_page * pagination.per_page, pagination.total);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Expenses
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {summaryData?.total_expenses || 0} total expenses · 
                Total: AFN {formatAmount(summaryData?.total_amount)}
              </p>
            </div>
            <Link
              to="/expenses/create"
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Expense
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {expenseTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 ml-auto">
              <select
                value={pagination.per_page}
                onChange={handlePerPageChange}
                className="px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={fetchExpenses}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Loading expenses...</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Description / Vendor
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">No expenses found</p>
                          <Link
                            to="/expenses/create"
                            className="mt-3 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create your first expense
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {new Date(expense.date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                            {expense.expense_type?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {expense.description || 'No description'}
                            </p>
                            {expense.paid_to && (
                              <p className="text-xs text-gray-400 truncate">
                                Vendor: {expense.paid_to}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-800">
                            AFN {formatAmount(expense.amount)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs text-gray-500">
                            {expense.account?.name || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/expenses/${expense.id}/edit`}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(expense)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="px-3 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  Showing <span className="font-medium text-gray-700">{startItem}</span> to{' '}
                  <span className="font-medium text-gray-700">{endItem}</span> of{' '}
                  <span className="font-medium text-gray-700">{pagination.total}</span> results
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className={`inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border ${
                      pagination.current_page === 1
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    } transition-colors`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Prev
                  </button>

                  <div className="flex items-center gap-0.5">
                    {[...Array(Math.min(5, pagination.last_page))].map((_, idx) => {
                      let pageNum;
                      const currentPage = pagination.current_page;
                      const lastPage = pagination.last_page;
                      
                      if (lastPage <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= lastPage - 2) {
                        pageNum = lastPage - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }
                      
                      if (pageNum >= 1 && pageNum <= lastPage) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                              pagination.current_page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    {pagination.last_page > 5 && pagination.current_page < pagination.last_page - 2 && (
                      <>
                        <span className="px-1 text-gray-400 text-xs">…</span>
                        <button
                          onClick={() => handlePageChange(pagination.last_page)}
                          className="px-2.5 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          {pagination.last_page}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className={`inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border ${
                      pagination.current_page === pagination.last_page
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    } transition-colors`}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseIndex;