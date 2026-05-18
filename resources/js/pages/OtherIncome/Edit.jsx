import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function OtherIncomeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    income_category_id: '',
    income_number: '',
    income_date: '',
    description: '',
    amount: '',
    currency_id: '',
    exchange_rate: 1,
    payment_account_id: '',
    income_account_id: '',
    note: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchCurrencies();
    fetchAccounts();
    fetchIncome();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/income-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/currencies/active-list');
      setCurrencies(res.data.data || []);
    } catch {
      setCurrencies([]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/chart-of-accounts?per_page=1000');
      const payload = res.data.data;
      setAccounts(Array.isArray(payload) ? payload : payload?.data || []);
    } catch {
      setAccounts([]);
    }
  };

  const fetchIncome = async () => {
    try {
      const res = await api.get(`/other-incomes/${id}`);
      const income = res.data.data;
      setForm({
        income_category_id: income.income_category_id || '',
        income_number: income.income_number || '',
        income_date: income.income_date || '',
        description: income.description || '',
        amount: income.amount || '',
        currency_id: income.currency_id || '',
        exchange_rate: income.exchange_rate || 1,
        payment_account_id: income.payment_account_id || '',
        income_account_id: income.income_account_id || '',
        note: income.note || '',
      });
    } catch {
      navigate('/other-incomes');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
    
    setForm(prev => ({
      ...prev,
      income_category_id: categoryId,
      income_account_id: selectedCategory?.income_account_id || prev.income_account_id
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.put(`/other-incomes/${id}`, form);
      navigate(`/other-incomes/${id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to update income record.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading income record...</span>
      </div>
    );
  }

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/other-incomes')} className="hover:text-[#007c89]">Other Incomes</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => navigate(`/other-incomes/${id}`)} className="hover:text-[#007c89]">
            {form.income_number}
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Other Income</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Income Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Income Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Number
                    </label>
                    <input
                      name="income_number"
                      value={form.income_number}
                      onChange={handleChange}
                      className={inputClass('income_number')}
                    />
                    {errors.income_number && <p className="text-red-500 text-xs mt-1">{errors.income_number[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Date
                    </label>
                    <input
                      type="date"
                      name="income_date"
                      value={form.income_date}
                      onChange={handleChange}
                      className={inputClass('income_date')}
                    />
                    {errors.income_date && <p className="text-red-500 text-xs mt-1">{errors.income_date[0]}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows="2"
                      className={inputClass('description')}
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Amount & Currency</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      className={inputClass('amount')}
                    />
                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Currency
                    </label>
                    <select
                      name="currency_id"
                      value={form.currency_id}
                      onChange={handleChange}
                      className={inputClass('currency_id')}
                    >
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                    {errors.currency_id && <p className="text-red-500 text-xs mt-1">{errors.currency_id[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Exchange Rate
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      name="exchange_rate"
                      value={form.exchange_rate}
                      onChange={handleChange}
                      className={inputClass('exchange_rate')}
                    />
                    {errors.exchange_rate && <p className="text-red-500 text-xs mt-1">{errors.exchange_rate[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Category & Accounts */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Category & Accounts</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Category
                    </label>
                    <select
                      name="income_category_id"
                      value={form.income_category_id}
                      onChange={handleCategoryChange}
                      className={inputClass('income_category_id')}
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Account
                    </label>
                    <select
                      name="income_account_id"
                      value={form.income_account_id}
                      onChange={handleChange}
                      className={inputClass('income_account_id')}
                    >
                      <option value="">Select income account</option>
                      {accounts.filter(a => a.type === 'income' || a.type === 'revenue').map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Payment Account
                    </label>
                    <select
                      name="payment_account_id"
                      value={form.payment_account_id}
                      onChange={handleChange}
                      className={inputClass('payment_account_id')}
                    >
                      <option value="">Select payment account</option>
                      {accounts.filter(a => a.type === 'asset' || a.type === 'bank').map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Additional Notes</h2>
              </div>
              <div className="p-6">
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows="3"
                  className={inputClass('note')}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/other-incomes/${id}`)}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}