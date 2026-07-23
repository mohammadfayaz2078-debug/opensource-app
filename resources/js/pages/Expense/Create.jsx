// pages/Expenses/ExpenseCreate.jsx - Fixed & Responsive
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function ExpenseCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [errors, setErrors] = useState({});

  const [masterFields, setMasterFields] = useState({
    account_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [expenses, setExpenses] = useState([
    { expense_type_id: '', amount: '', description: '', paid_to: '' }
  ]);

  useEffect(() => {
    fetchExpenseTypes();
    fetchAccounts();
  }, []);

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
      const accountsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAccounts(accountsData);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const addExpenseRow = () => {
    setExpenses([...expenses, { expense_type_id: '', amount: '', description: '', paid_to: '' }]);
  };

  const removeExpenseRow = (index) => {
    if (expenses.length <= 1) return;
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleExpenseChange = (index, field, value) => {
    const newExpenses = [...expenses];
    newExpenses[index][field] = value;
    setExpenses(newExpenses);
    if (errors[`${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const allErrors = {};
      let hasError = false;

      if (!masterFields.date) {
        allErrors['date'] = 'Date is required';
        hasError = true;
      }

      if (!masterFields.account_id) {
        allErrors['account_id'] = 'Account is required';
        hasError = true;
      }

      expenses.forEach((exp, index) => {
        if (!exp.expense_type_id) {
          allErrors[`${index}_expense_type_id`] = 'Expense type is required';
          hasError = true;
        }
        const parsedAmount = parseFloat(exp.amount);
        if (!exp.amount || isNaN(parsedAmount) || parsedAmount < 0.01) {
          allErrors[`${index}_amount`] = 'Amount must be at least 0.01';
          hasError = true;
        }
      });

      if (hasError) {
        setErrors(allErrors);
        setSaving(false);
        return;
      }

      const payload = {
        expenses: expenses.map(exp => ({
          expense_type_id: parseInt(exp.expense_type_id),
          account_id: parseInt(masterFields.account_id),
          amount: parseFloat(exp.amount),
          description: exp.description?.trim() || null,
          paid_to: exp.paid_to?.trim() || null,
          date: masterFields.date,
        }))
      };

      const res = await api.post('/expenses', payload);

      const successCount = res.data.success_count || (Array.isArray(res.data.data) ? res.data.data.length : 1);
      const errorCount = res.data.error_count || 0;

      if (successCount > 0) {
        alert(`${successCount} expense(s) created successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
        navigate('/expenses');
      } else {
        alert('Failed to create expenses. Check your input.');
      }
    } catch (err) {
      console.error('Expense creation error:', err);
      const responseData = err.response?.data;
      let errorMsg = '';

      if (err.response?.status === 422 && responseData) {
        // Try Laravel-style validation errors first
        if (responseData.errors && typeof responseData.errors === 'object') {
          const validationErrors = responseData.errors;
          const formattedErrors = {};
          Object.keys(validationErrors).forEach(key => {
            const fieldKey = key.replace(/^expenses\./, '').replace(/\./g, '_');
            const msg = Array.isArray(validationErrors[key]) ? validationErrors[key][0] : validationErrors[key];
            formattedErrors[fieldKey] = msg;
            if (!errorMsg) errorMsg = msg;
          });
          setErrors(formattedErrors);
        }
        // Fallback to response message
        if (!errorMsg) errorMsg = responseData.message || '';
      } else if (responseData?.message) {
        errorMsg = responseData.message;
      }

      if (!errorMsg) {
        errorMsg = 'Failed to create expenses. Please check your input and try again.';
      }

      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/expenses')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Record Expenses</h1>
                <p className="text-xs text-gray-500 mt-0.5">Record multiple expenses at once</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{totalAmount.toFixed(2)} AFN</p>
              </div>
              <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                {expenses.length} item{expenses.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Master Fields */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Account */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={masterFields.account_id}
                  onChange={(e) => { setMasterFields(prev => ({ ...prev, account_id: e.target.value })); if (errors.account_id) setErrors(prev => { const n = {...prev}; delete n.account_id; return n; }); }}
                  className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.account_id ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({parseFloat(a.balance).toFixed(2)} AFN)
                    </option>
                  ))}
                </select>
                {errors.account_id && <p className="text-xs text-red-500 mt-1">{errors.account_id}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={masterFields.date}
                  onChange={(e) => setMasterFields(prev => ({ ...prev, date: e.target.value }))}
                  className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.date ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
              </div>
            </div>
          </div>

          {/* Expense Rows */}
          <div className="space-y-3">
            {expenses.map((expense, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                  <button type="button" onClick={() => removeExpenseRow(index)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Expense Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Expense Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={expense.expense_type_id}
                      onChange={(e) => handleExpenseChange(index, 'expense_type_id', e.target.value)}
                      className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[`${index}_expense_type_id`] ? 'border-red-400' : 'border-gray-300'}`}
                    >
                      <option value="">Select Type</option>
                      {expenseTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {errors[`${index}_expense_type_id`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}_expense_type_id`]}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Amount (AFN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => handleExpenseChange(index, 'amount', e.target.value)}
                      step="0.01" min="0.01"
                      className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[`${index}_amount`] ? 'border-red-400' : 'border-gray-300'}`}
                      placeholder="0.00"
                    />
                    {errors[`${index}_amount`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`${index}_amount`]}</p>
                    )}
                  </div>

                  {/* Paid To */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Paid To</label>
                    <input
                      type="text"
                      value={expense.paid_to}
                      onChange={(e) => handleExpenseChange(index, 'paid_to', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                      placeholder="Vendor name"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => handleExpenseChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                    placeholder="Brief description (optional)"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add More Button */}
          <button type="button" onClick={addExpenseRow}
            className="w-full mt-3 py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:text-[#007c89] hover:border-[#007c89] hover:bg-[#007c89]/5 transition-all">
            + Add Another Expense
          </button>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" onClick={() => navigate('/expenses')}
              className="px-5 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center">
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : 'Save Expenses'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}