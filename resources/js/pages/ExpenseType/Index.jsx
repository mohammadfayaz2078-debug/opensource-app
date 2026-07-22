import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const ExpenseTypeIndex = () => {
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({
    expense_category_id: '',
    name: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expense-types');
      setTypes(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch types:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expense-categories');
      setCategories(res.data?.data?.data || res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTypes(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedType(null);
    setForm({
      expense_category_id: '',
      name: '',
      description: '',
      is_active: true,
      sort_order: 0,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (type) => {
    setIsEditing(true);
    setSelectedType(type);
    setForm({
      expense_category_id: type.expense_category_id || '',
      name: type.name || '',
      description: type.description || '',
      is_active: type.is_active ?? true,
      sort_order: type.sort_order || 0,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form };
      if (payload.sort_order) payload.sort_order = parseInt(payload.sort_order);
      if (!payload.description) delete payload.description;

      let res;
      if (isEditing && selectedType) {
        res = await api.put(`/expense-types/${selectedType.id}`, payload);
      } else {
        res = await api.post('/expense-types', payload);
      }

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Updated' : 'Created',
        text: res.data?.message || 'Success',
        timer: 2000,
        showConfirmButton: false,
      });
      closeModal();
      fetchTypes();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type) => {
    const result = await Swal.fire({
      title: 'Delete Expense Type?',
      html: `Delete <strong>${type.name}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/expense-types/${type.id}`);
        Swal.fire({ icon: 'success', title: 'Deleted!', text: res.data?.message, timer: 2000, showConfirmButton: false });
        fetchTypes();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
      }
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Expense Types</h1>
        <p className="text-sm text-gray-500 mt-1">Define expense types for your organization</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search types..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          <button onClick={openCreateModal} className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Type
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )}

      {!loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                      <p className="text-sm">No expense types found.</p>
                    </td>
                  </tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{type.name}</p>
                          {type.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{type.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{type.category?.name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(type)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(type)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {types.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="text-sm">No expense types found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {types.map((type) => (
                  <div key={type.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{type.name}</p>
                        <p className="text-xs text-gray-500">{type.category?.name || '—'}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(type)} className="p-2 rounded hover:bg-yellow-50 text-yellow-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(type)} className="p-2 rounded hover:bg-red-50 text-red-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Expense Type' : 'Create Expense Type'}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select name="expense_category_id" value={form.expense_category_id} onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.expense_category_id ? 'border-red-500' : 'border-gray-300'}`} required>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.expense_category_id && <p className="text-xs text-red-500 mt-1">{errors.expense_category_id[0]}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors.name ? 'border-red-500' : 'border-gray-300'}`} required />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={form.description} onChange={handleInputChange} rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" name="sort_order" value={form.sort_order} onChange={handleInputChange} min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                </div>

                {/* Checkboxes */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] disabled:opacity-50 inline-flex items-center">
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
    </div>
  );
};

export default ExpenseTypeIndex;
