import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function IncomeCategoryShow() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    try {
      const res = await api.get(`/income-categories/${id}`);
      setCategory(res.data.data);
    } catch (err) {
      console.error('Failed to fetch category', err);
      navigate('/income-categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('income_category.delete_confirm'))) return;
    try {
      await api.delete(`/income-categories/${id}`);
      navigate('/income-categories');
    } catch (err) {
      const message = err.response?.data?.message || t('income_category.delete_failed');
      alert(message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await api.post(`/income-categories/${id}/toggle-status`);
      setCategory(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.response?.data?.message || t('income_category.toggle_failed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">{t('income_category.loading')}</span>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/income-categories')} className="hover:text-[#007c89] whitespace-nowrap">{t('income_category.breadcrumb')}</button>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700 truncate">{category.name}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">{category.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('income_category.show_subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                category.is_active 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {category.is_active ? t('income_category.deactivate') : t('income_category.activate')}
            </button>
            <button
              onClick={() => navigate(`/income-categories/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('income_category.edit')}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('income_category.delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('income_category.description_label')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {category.description || t('income_category.show_no_description')}
              </p>
            </div>
          </div>

          {/* Related Incomes */}
          {category.other_incomes_count > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{t('income_category.related_title')}</h2>
              </div>
              <div className="p-4 sm:p-6">
                <p className="text-sm text-gray-600">
                  {t('income_category.related_desc', { count: category.other_incomes_count })}
                </p>
                <button
                  onClick={() => navigate(`/other-incomes?category_id=${category.id}`)}
                  className="mt-3 text-sm text-[#007c89] hover:underline"
                >
                  {t('income_category.view_all')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Audit */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('income_category.status_audit')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('income_category.status_label')}</dt>
                  <dd>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category.is_active ? t('income_category.status_active') : t('income_category.status_inactive')}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('income_category.created_by')}</dt>
                  <dd className="text-gray-700">{category.creator?.first_name + ' ' + category.creator?.last_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('income_category.created_at')}</dt>
                  <dd className="text-gray-700">{new Date(category.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('income_category.last_updated')}</dt>
                  <dd className="text-gray-700">{new Date(category.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}