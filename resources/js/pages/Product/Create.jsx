import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function ProductCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    name: '',
    barcode: '',
    category_id: '',
    purchase_unit_id: '',
    sale_unit_id: '',
    stock_unit_id: '',
    purchase_price: '',
    sale_price: '',
    expense_account_id: '',
    income_account_id: '',
    low_stock_warning_count: '0',
    inventory_asset_account_id: '',
    reorder_point: '0',
  });

  useEffect(() => {
    fetchCategories();
    fetchUnits();
    fetchAccounts();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/product-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units/list/options');
      setUnits(res.data.data || []);
    } catch {
      setUnits([]);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setUploading(true);
    setErrors({});
    
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key] !== '' && form[key] !== null) {
        formData.append(key, form[key]);
      }
    });
    
    attachments.forEach(file => {
      formData.append('attachments[]', file);
    });
    
    try {
      await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate('/products');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create product.' });
      }
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/products')} className="hover:text-[#007c89]">Products</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Product</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Add Product</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new product for inventory management</p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Product Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                      placeholder="e.g., Laptop, Smartphone, Chair"
                      autoFocus
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Barcode/SKU
                      </label>
                      <input
                        name="barcode"
                        value={form.barcode}
                        onChange={handleChange}
                        className={inputClass('barcode')}
                        placeholder="Auto-generated if empty"
                      />
                      {errors.barcode && <p className="text-red-500 text-xs mt-1">{errors.barcode[0]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Category
                      </label>
                      <select
                        name="category_id"
                        value={form.category_id}
                        onChange={handleChange}
                        className={inputClass('category_id')}
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id[0]}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Units */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Units of Measurement</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Purchase Unit
                    </label>
                    <select
                      name="purchase_unit_id"
                      value={form.purchase_unit_id}
                      onChange={handleChange}
                      className={inputClass('purchase_unit_id')}
                    >
                      <option value="">Select unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.category_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Sale Unit
                    </label>
                    <select
                      name="sale_unit_id"
                      value={form.sale_unit_id}
                      onChange={handleChange}
                      className={inputClass('sale_unit_id')}
                    >
                      <option value="">Select unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.category_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Stock Unit
                    </label>
                    <select
                      name="stock_unit_id"
                      value={form.stock_unit_id}
                      onChange={handleChange}
                      className={inputClass('stock_unit_id')}
                    >
                      <option value="">Select unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.category_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Purchase Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="purchase_price"
                        value={form.purchase_price}
                        onChange={handleChange}
                        className={`${inputClass('purchase_price')} pl-7`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Sale Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        name="sale_price"
                        value={form.sale_price}
                        onChange={handleChange}
                        className={`${inputClass('sale_price')} pl-7`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accounting */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Accounting</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Expense Account (COGS)
                    </label>
                    <select
                      name="expense_account_id"
                      value={form.expense_account_id}
                      onChange={handleChange}
                      className={inputClass('expense_account_id')}
                    >
                      <option value="">Select account</option>
                      {accounts.filter(a => a.type === 'expense').map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Income Account (Revenue)
                    </label>
                    <select
                      name="income_account_id"
                      value={form.income_account_id}
                      onChange={handleChange}
                      className={inputClass('income_account_id')}
                    >
                      <option value="">Select account</option>
                      {accounts.filter(a => a.type === 'income').map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Inventory Asset Account
                    </label>
                    <select
                      name="inventory_asset_account_id"
                      value={form.inventory_asset_account_id}
                      onChange={handleChange}
                      className={inputClass('inventory_asset_account_id')}
                    >
                      <option value="">Select account</option>
                      {accounts.filter(a => a.type === 'asset').map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Settings */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Inventory Settings</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Low Stock Warning Count
                    </label>
                    <input
                      type="number"
                      name="low_stock_warning_count"
                      value={form.low_stock_warning_count}
                      onChange={handleChange}
                      className={inputClass('low_stock_warning_count')}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      name="reorder_point"
                      value={form.reorder_point}
                      onChange={handleChange}
                      className={inputClass('reorder_point')}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Attachments</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Product Images / Documents
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#007c89] file:text-white hover:file:bg-[#006d77]"
                    />
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="border rounded-md divide-y">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📎</span>
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-400">
                              ({(file.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Units should belong to the same category for conversion</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    {uploading ? 'Uploading...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Create Product
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/products')}
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