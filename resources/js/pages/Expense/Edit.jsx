// pages/Expenses/ExpenseEdit.jsx - Updated with AFN
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  Save,
  Loader2,
  Calendar,
  User,
  FileText,
  DollarSign,
  Tag,
  ArrowLeft,
  AlertCircle,
  Clock,
  Building2
} from 'lucide-react';

const ExpenseEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expense, setExpense] = useState(null);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    expense_type_id: '',
    account_id: '',
    amount: '',
    description: '',
    paid_to: '',
    date: '',
  });

  useEffect(() => {
    fetchExpenseTypes();
    fetchAccounts();
    fetchExpense();
  }, [id]);

  const fetchExpenseTypes = async () => {
    try {
      const res = await api.get('/expense-types?active_only=true');
      setExpenseTypes(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses/${id}`);
      const data = res.data.data;
      setExpense(data);
      
      setForm({
        expense_type_id: data.expense_type_id || '',
        account_id: data.account_id || '',
        amount: data.amount || '',
        description: data.description || '',
        paid_to: data.paid_to || '',
        date: formatDate(data.date),
      });
    } catch (err) {
      Swal.fire('Error', 'Failed to load expense', 'error');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = {
        expense_type_id: parseInt(form.expense_type_id),
        account_id: parseInt(form.account_id),
        amount: parseFloat(form.amount) || 0,
        description: form.description?.trim() || null,
        paid_to: form.paid_to || null,
        date: form.date,
      };

      await api.put(`/expenses/${id}`, payload);

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Expense updated successfully.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });

      navigate('/expenses');
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors || {};
        setErrors(validationErrors);
        Swal.fire('Error', 'Please check the form for errors.', 'error');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to update expense', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600">Loading expense...</span>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Expense not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/expenses')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Edit Expense</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  #{expense.id} • {expense.description || 'No description'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                expense.account ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {expense.account?.name || 'No Account'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expense Type */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Tag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Expense Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="expense_type_id"
                  value={form.expense_type_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.expense_type_id ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select Type</option>
                  {expenseTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.expense_type_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.expense_type_id[0]}</p>
                )}
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  name="account_id"
                  value={form.account_id}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.account_id ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (AFN {parseFloat(a.balance).toFixed(2)})
                    </option>
                  ))}
                </select>
                {errors.account_id && (
                  <p className="text-xs text-red-500 mt-1">{errors.account_id[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Amount (AFN) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">AFN</span>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    className={`w-full pl-12 pr-3 py-1.5 text-sm bg-gray-50 border ${errors.amount ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.amount[0]}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.date ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                />
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1">{errors.date[0]}</p>
                )}
              </div>

              {/* Paid To */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <User className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Paid To
                </label>
                <input
                  type="text"
                  name="paid_to"
                  value={form.paid_to}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Vendor name"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <FileText className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Brief description (optional)"
              />
            </div>
          </div>

          {/* Expense Info */}
          {expense && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-4">
              <h4 className="text-xs font-medium text-gray-600 mb-2">Expense Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">ID</span>
                  <p className="font-medium text-gray-700">#{expense.id}</p>
                </div>
                <div>
                  <span className="text-gray-400">Created</span>
                  <p className="font-medium text-gray-700">
                    {new Date(expense.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Type</span>
                  <p className="font-medium text-gray-700">
                    {expense.expense_type?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Account</span>
                  <p className="font-medium text-gray-700">
                    {expense.account?.name || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseEdit;