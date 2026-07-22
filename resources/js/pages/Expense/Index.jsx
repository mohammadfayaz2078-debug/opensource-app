import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const ExpenseIndex = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem('user_type');
  const isAdmin = userType === 'company_admin';
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userBranchId = currentUser.branch_id || currentUser.raw?.branch_id || null;

  const [expenses, setExpenses] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    expense_type_id: '',
    amount: '',
    description: '',
    paid_to: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    payment_method: 'cash',
    payment_reference: '',
  });

  const [payForm, setPayForm] = useState({
    payment_method: 'cash',
    payment_account_id: '',
    payment_reference: '',
    comment: '',
  });

  // Status config
  const statusConfig = {
    draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  };

  const paymentMethods = ['cash', 'bank_transfer', 'cheque', 'card', 'other'];

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.expense_type_id = typeFilter;

      const res = await api.get('/expenses', { params });
      setExpenses(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseTypes = async () => {
    try {
      const res = await api.get('/expense-types');
      setExpenseTypes(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
    }
  };

  const fetchBranches = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/branches');
      setBranches(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchExpenses(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, typeFilter]);

  // ─── Modal helpers ──────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedExpense(null);
    setForm({
      expense_type_id: '',
      amount: '',
      description: '',
      paid_to: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      payment_method: 'cash',
      payment_reference: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (expense) => {
    setIsEditing(true);
    setSelectedExpense(expense);
    setForm({
      expense_type_id: expense.expense_type_id || '',
      amount: expense.amount || '',
      description: expense.description || '',
      paid_to: expense.paid_to || '',
      date: expense.date || new Date().toISOString().split('T')[0],
      notes: expense.notes || '',
      payment_method: 'cash',
      payment_reference: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openPayModal = (expense) => {
    setSelectedExpense(expense);
    setPayForm({
      payment_method: 'cash',
      payment_account_id: '',
      payment_reference: '',
      comment: '',
    });
    setErrors({});
    setPayModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPayModalOpen(false);
    setSelectedExpense(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handlePayInputChange = (e) => {
    const { name, value } = e.target;
    setPayForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // ─── CRUD ───────────────────────────────────────────────────

  const handleSubmit = async (e, payNow = false) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        expense_type_id: form.expense_type_id ? parseInt(form.expense_type_id) : null,
        payment_account_id: form.payment_account_id ? parseInt(form.payment_account_id) : null,
        // branch_id auto-resolved by backend like ExpenseType/Category
      };
      // Remove payment fields from create payload — they're for the pay step only
      delete payload.payment_method;
      delete payload.payment_reference;
      if (!payload.notes) delete payload.notes;
      if (!payload.paid_to) delete payload.paid_to;
      if (!payload.payment_account_id) delete payload.payment_account_id;
      console.log('Branch ID used:', userBranchId, '| User:', currentUser);
      console.log('Payload:', payload);

      let res;
      if (isEditing && selectedExpense) {
        res = await api.put(`/expenses/${selectedExpense.id}`, payload);
      } else {
        res = await api.post('/expenses', payload);
      }

      const expenseId = res.data?.data?.id;

      // Pay immediately if requested and we have an expense ID
      if (payNow && expenseId && !isEditing) {
        const payPayload = {
          payment_method: form.payment_method,
          payment_account_id: form.payment_account_id ? parseInt(form.payment_account_id) : null,
          payment_reference: form.payment_reference || '',
        };
        await api.post(`/expenses/${expenseId}/pay`, payPayload);
      }

      Swal.fire({
        icon: 'success',
        title: payNow ? 'Created & Paid' : (isEditing ? 'Updated' : 'Created'),
        text: res.data?.message || 'Success',
        timer: 2000,
        showConfirmButton: false,
      });
      closeModal();
      fetchExpenses();
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors || {};
        if (Object.keys(validationErrors).length === 0 && err.response.data.message) {
          Swal.fire('Error', err.response.data.message, 'error');
        } else {
          console.error('Validation errors:', validationErrors);
          setErrors(validationErrors);
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    const result = await Swal.fire({
      title: 'Delete Expense?',
      html: `Delete <strong>${expense.reference_no}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/expenses/${expense.id}`);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: res.data?.message,
          timer: 2000,
          showConfirmButton: false,
        });
        fetchExpenses();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
      }
    }
  };

  // ─── Workflow Actions ───────────────────────────────────────

  const handlePay = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/expenses/${selectedExpense.id}/pay`, payForm);
      Swal.fire({
        icon: 'success',
        title: 'Paid',
        text: res.data?.message || 'Expense marked as paid. Journal entry created.',
        timer: 2000,
        showConfirmButton: false,
      });
      closeModal();
      fetchExpenses();
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors || {};
        if (Object.keys(validationErrors).length === 0 && err.response.data.message) {
          Swal.fire('Error', err.response.data.message, 'error');
        } else {
          setErrors(validationErrors);
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Payment failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (expense) => {
    const { value: reason } = await Swal.fire({
      title: 'Cancel Expense',
      input: 'textarea',
      inputLabel: 'Reason',
      inputPlaceholder: 'Enter cancellation reason...',
      inputAttributes: { minlength: 5 },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Cancel Expense',
    });

    if (reason) {
      try {
        const res = await api.post(`/expenses/${expense.id}/cancel`, { reason });
        Swal.fire({ icon: 'success', title: 'Cancelled', text: res.data?.message, timer: 2000, showConfirmButton: false });
        fetchExpenses();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to cancel', 'error');
      }
    }
  };

  // ─── Summary ────────────────────────────────────────────────

  const summary = expenses.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    acc.total = (acc.total || 0) + parseFloat(e.total_amount || 0);
    return acc;
  }, {});

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
          <div className="flex items-center gap-2">
            {['draft', 'submitted', 'paid', 'cancelled'].map(status => (
              <span key={status} className="text-xs text-gray-700 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{status}: {summary[status] || 0}</span>
            ))}
            <span className="text-xs text-[#007c89] bg-[#007c89]/10 px-2 py-0.5 rounded-full font-medium">{summary.total?.toFixed(2) || '0.00'}</span>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
            <option value="">All Types</option>
            {expenseTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => navigate('/expenses/create')} className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Expense
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ref #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-700">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l6-6m-5.5.5h.01m6 0h.01m-11 0h.01m5 0h.01M9 17h6M9 5h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">No expenses found.</p>
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense, idx) => {
                    const status = statusConfig[expense.status] || statusConfig.draft;
                    return (
                      <tr key={expense.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{expense.reference_no}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {expense.expense_type?.name || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">{expense.description}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {parseFloat(expense.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {(expense.status === 'draft' || expense.status === 'submitted') && (
                              <>
                                <button onClick={() => openEditModal(expense)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title="Edit">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => handleDelete(expense)} className="p-1.5 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                                <button onClick={() => openPayModal(expense)} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100" title="Pay">
                                  Pay
                                </button>
                                <button onClick={() => handleCancel(expense)} className="p-1.5 rounded hover:bg-orange-50 text-gray-700 hover:text-orange-600" title="Cancel">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                            {expense.status === 'paid' && (
                              <span className="text-xs text-emerald-600 font-medium">
                                {expense.payment_method}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {expenses.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-700">
                <p className="text-sm">No expenses found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {expenses.map((expense) => {
                  const status = statusConfig[expense.status] || statusConfig.draft;
                  return (
                    <div key={expense.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{expense.reference_no}</p>
                          <p className="text-xs text-gray-700">{expense.expense_type?.name || '—'}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{expense.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {parseFloat(expense.total_amount || 0).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-1">
                          {(expense.status === 'draft' || expense.status === 'submitted') && (
                            <>
                              <button onClick={() => openEditModal(expense)} className="p-2 rounded hover:bg-yellow-50 text-yellow-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => openPayModal(expense)} className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
                                Pay
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {isEditing ? 'Edit Expense' : 'Create Expense'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-3">
                {/* Expense Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Expense Type *</label>
                  <select name="expense_type_id" value={form.expense_type_id} onChange={handleInputChange}
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.expense_type_id ? 'border-red-400' : 'border-gray-300'}`} required>
                    <option value="">Select Type</option>
                    {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {errors.expense_type_id && <p className="text-xs text-red-500 mt-0.5">{errors.expense_type_id[0]}</p>}
                </div>

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Amount *</label>
                    <input type="number" name="amount" value={form.amount} onChange={handleInputChange} step="0.01" min="0.01"
                      className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.amount ? 'border-red-400' : 'border-gray-300'}`} required />
                    {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Date *</label>
                    <input type="date" name="date" value={form.date} onChange={handleInputChange}
                      className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.date ? 'border-red-400' : 'border-gray-300'}`} required />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Description *</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} rows="2"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.description ? 'border-red-400' : 'border-gray-300'}`} required />
                  {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description[0]}</p>}
                </div>

                {/* Paid To + Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Paid To</label>
                    <input type="text" name="paid_to" value={form.paid_to} onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Payment Method</label>
                    <select name="payment_method" value={form.payment_method} onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                      {paymentMethods.map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleInputChange} rows="2"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                {!isEditing && (
                  <button type="button" onClick={(e) => {
                    const formEl = e.target.closest('form');
                    if (formEl.checkValidity()) {
                      handleSubmit(e, true);
                    } else {
                      formEl.reportValidity();
                    }
                  }} disabled={saving} className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center">
                    {saving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Saving...</>
                    ) : (
                      'Create & Pay'
                    )}
                  </button>
                )}
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50 inline-flex items-center">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Saving...</>
                  ) : (
                    isEditing ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Pay Modal ─────────────────────────────────────────── */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Pay Expense</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePay}>
              <div className="px-6 py-5 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><strong>Ref:</strong> {selectedExpense?.reference_no}</p>
                  <p><strong>Amount:</strong> {parseFloat(selectedExpense?.total_amount || 0).toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                  <select name="payment_method" value={payForm.payment_method} onChange={handlePayInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                    {paymentMethods.map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input type="text" name="payment_reference" value={payForm.payment_reference} onChange={handlePayInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" placeholder="Cheque #, transaction ref..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                  <textarea name="comment" value={payForm.comment} onChange={handlePayInputChange} rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Processing...</>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseIndex;
