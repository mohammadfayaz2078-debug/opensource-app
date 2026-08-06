import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function OtherIncomeCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    account_id: '',
    income_category_id: '',
    income_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    note: '',
  });

  useEffect(() => {
    // Fetch categories
    api.get('/income-categories?per_page=1000').then(r => {
      const payload = r.data.data;
      setCategories(Array.isArray(payload) ? payload : payload?.data || []);
    }).catch(() => {});

    // Fetch accounts
    api.get('/accounts/list/options').then(r => {
      setAccounts(r.data?.data || []);
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
      await api.post('/other-incomes', form);
      navigate('/other-incomes');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || t('other_income.create_failed') });
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
          <button onClick={() => navigate('/other-incomes')} className="hover:text-[#007c89]">{t('other_income.breadcrumb')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{t('other_income.new_income')}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{t('other_income.create_title')}</h1>
      </div>

      {errors.general && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Income Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('other_income.income_info')}</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('other_income.wallet_label')}
                  </label>
                  <select
                    name="account_id"
                    value={form.account_id}
                    onChange={handleChange}
                    className={inputClass('account_id')}
                    required
                  >
                    <option value="">{t('other_income.select_wallet')}</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - {t('other_income.balance_label', { balance: parseFloat(acc.balance || 0).toFixed(2) })}
                      </option>
                    ))}
                  </select>
                  {errors.account_id && <p className="text-red-500 text-xs mt-0.5">{errors.account_id[0]}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('other_income.category_label')}
                  </label>
                  <select
                    name="income_category_id"
                    value={form.income_category_id}
                    onChange={handleChange}
                    className={inputClass('income_category_id')}
                  >
                    <option value="">{t('other_income.select_category')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.income_category_id && <p className="text-red-500 text-xs mt-0.5">{errors.income_category_id[0]}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('other_income.date_label')}
                    </label>
                    <input
                      type="date"
                      name="income_date"
                      value={form.income_date}
                      onChange={handleChange}
                      className={inputClass('income_date')}
                      required
                    />
                    {errors.income_date && <p className="text-red-500 text-xs mt-0.5">{errors.income_date[0]}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('other_income.amount_label')}
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={inputClass('amount')}
                      placeholder="0.00"
                      required
                    />
                    {errors.amount && <p className="text-red-500 text-xs mt-0.5">{errors.amount[0]}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('other_income.description_label')}
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="1"
                    className={inputClass('description')}
                    placeholder={t('other_income.description_placeholder')}
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-0.5">{errors.description[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('other_income.notes_title')}</h2>
            </div>
            <div className="p-4">
              <textarea
                name="note"
                value={form.note}
                onChange={handleChange}
                rows="2"
                className={inputClass('note')}
                placeholder={t('other_income.notes_placeholder')}
              />
              {errors.note && <p className="text-red-500 text-xs mt-0.5">{errors.note[0]}</p>}
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
                  {t('other_income.creating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('other_income.create_income')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/other-incomes')}
              className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('other_income.cancel')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}