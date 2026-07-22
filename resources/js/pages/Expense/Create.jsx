import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function ExpenseCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [expenseTypes, setExpenseTypes] = useState([]);

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

  const paymentMethods = ['cash', 'bank_transfer', 'cheque', 'card', 'other'];

  useEffect(() => {
    api.get('/expense-types').then(r => {
      const data = r.data?.data?.data || r.data?.data || [];
      setExpenseTypes(data);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount) || 0,
        expense_type_id: form.expense_type_id ? parseInt(form.expense_type_id) : null,
      };
      delete payload.payment_method;
      delete payload.payment_reference;
      if (!payload.notes) delete payload.notes;
      if (!payload.paid_to) delete payload.paid_to;

      await api.post('/expenses', payload);
      navigate('/expenses');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create expense.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <button onClick={() => navigate('/expenses')} className="hover:text-[#007c89]">Expenses</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Expense</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Add Expense</h1>
      </div>

      {errors.general && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Expense Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Expense Information</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Expense Type *
                  </label>
                  <select
                    name="expense_type_id"
                    value={form.expense_type_id}
                    onChange={handleChange}
                    className={inputClass('expense_type_id')}
                    required
                  >
                    <option value="">Select Type</option>
                    {expenseTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {errors.expense_type_id && <p className="text-red-500 text-xs mt-0.5">{errors.expense_type_id[0]}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Amount *
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0.01"
                      className={inputClass('amount')}
                      placeholder="0.00"
                      required
                    />
                    {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className={inputClass('date')}
                      required
                    />
                    {errors.date && <p className="text-red-500 text-xs mt-0.5">{errors.date[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="1"
                    className={inputClass('description')}
                    placeholder="Describe the expense..."
                    required
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-0.5">{errors.description[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Payment Details</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Paid To
                  </label>
                  <input
                    type="text"
                    name="paid_to"
                    value={form.paid_to}
                    onChange={handleChange}
                    className={inputClass('paid_to')}
                    placeholder="Payee name"
                  />
                  {errors.paid_to && <p className="text-red-500 text-xs mt-0.5">{errors.paid_to[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleChange}
                    className={inputClass('payment_method')}
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Notes</h2>
            </div>
            <div className="p-4">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="2"
                className={inputClass('notes')}
                placeholder="Additional notes..."
              />
              {errors.notes && <p className="text-red-500 text-xs mt-0.5">{errors.notes[0]}</p>}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Create Expense
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
