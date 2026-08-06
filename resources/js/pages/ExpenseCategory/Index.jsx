import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const ExpenseCategoryIndex = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expense-categories');
      setCategories(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchCategories(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedCategory(null);
    setForm({ name: '', description: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setIsEditing(true);
    setSelectedCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form };
      if (!payload.description) delete payload.description;

      let res;
      if (isEditing && selectedCategory) {
        res = await api.put(`/expense-categories/${selectedCategory.id}`, payload);
      } else {
        res = await api.post('/expense-categories', payload);
      }

      Swal.fire({
        icon: 'success',
        title: isEditing ? t('expense_category.index.updated') : t('expense_category.index.created'),
        text: res.data?.message || t('expense_category.index.success'),
        timer: 2000,
        showConfirmButton: false,
      });
      closeModal();
      fetchCategories();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Swal.fire(t('error'), err.response?.data?.message || t('expense_category.index.operation_failed'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const result = await Swal.fire({
      title: t('expense_category.index.delete_title'),
      html: t('expense_category.index.delete_confirm', { name: category.name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('expense_category.index.yes_delete'),
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/expense-categories/${category.id}`);
        Swal.fire({ icon: 'success', title: t('expense_category.index.deleted'), text: res.data?.message, timer: 2000, showConfirmButton: false });
        fetchCategories();
      } catch (err) {
        Swal.fire(t('error'), err.response?.data?.message || t('expense_category.index.delete_failed'), 'error');
      }
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const res = await api.post(`/expense-categories/${category.id}/toggle-active`);
      Swal.fire({
        icon: 'success',
        title: category.is_active ? t('expense_category.index.deactivated') : t('expense_category.index.activated'),
        text: res.data?.message,
        timer: 1500,
        showConfirmButton: false,
      });
      fetchCategories();
    } catch (err) {
      Swal.fire(t('error'), err.response?.data?.message || t('expense_category.index.failed'), 'error');
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">{t('expense_category.index.title')}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('expense_category.index.count', { count: categories.length })}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('expense_category.index.search')}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
          />
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {t('expense_category.index.new')}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('expense_category.index.loading')}</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {categories.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <p className="text-sm text-gray-700">{t('expense_category.index.no_categories')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('expense_category.index.name')}</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('expense_category.index.description')}</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('expense_category.index.active')}</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('expense_category.index.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr key={cat.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700 max-w-xs truncate">{cat.description || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        <button onClick={() => handleToggleActive(cat)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cat.is_active ? 'bg-[#007c89]' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cat.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEditModal(cat)} className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title={t('expense_category.index.edit')}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(cat)} className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title={t('expense_category.index.delete')}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{isEditing ? t('expense_category.index.edit_category') : t('expense_category.index.create_category')}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('expense_category.index.name_required')}</label>
                  <input type="text" name="name" value={form.name} onChange={handleInputChange}
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.name ? 'border-red-400' : 'border-gray-300'}`} required />
                  {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('expense_category.index.description')}</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} rows="2"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">{t('expense_category.index.cancel')}</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50 inline-flex items-center">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>{t('expense_category.index.saving')}</>
                  ) : (
                    isEditing ? t('expense_category.index.update') : t('expense_category.index.create')
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

export default ExpenseCategoryIndex;
