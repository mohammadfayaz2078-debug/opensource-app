import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [newAttachments, setNewAttachments] = useState([]);
  const [form, setForm] = useState({
    name: '', barcode: '', description: '', category_id: '',
    purchase_price: '', sale_price: '',
    low_stock_warning_count: '0',
  });

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get('/product-categories/list/options'),
    ]).then(([pRes, cRes]) => {
      const p = pRes.data.data;
      setForm({
        name: p.name || '', barcode: p.barcode || '', description: p.description || '', category_id: p.category_id || '',
        purchase_price: p.purchase_price || '', sale_price: p.sale_price || '',
        low_stock_warning_count: p.low_stock_warning_count || '0',
      });
      setExistingAttachments(p.attachments || []);
      setCategories(cRes.data.data || []);
    }).catch(() => navigate('/products')).finally(() => setFetching(false));
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    setNewAttachments(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const deleteExistingAttachment = async (attachmentId) => {
    if (!confirm(t('product.delete_attachment_confirm'))) return;
    try {
      await api.delete(`/products/${id}/attachments/${attachmentId}`);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch { alert(t('product.delete_attachment_failed')); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key] !== '' && form[key] !== null) formData.append(key, form[key]);
    });
    newAttachments.forEach(file => formData.append('attachments[]', file));
    formData.append('_method', 'PUT');
    try {
      await api.post(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/products/${id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: err.response?.data?.message || t('product.update_failed') });
      }
    } finally { setLoading(false); }
  };

  const inputClass = (field) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  if (fetching) return <div className="p-8 text-center text-gray-500">{t('product.loading_product')}</div>;

  return (
    <div>
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
          <button onClick={() => navigate('/products')} className="hover:text-[#007c89]">{t('product.title')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-700">{t('product.edit_title')}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{t('product.edit_title')}</h1>
      </div>

      {errors.general && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>}

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('product.basic_info')}</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.product_name')}</label>
                  <input name="name" value={form.name} onChange={handleChange} className={inputClass('name')} />
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.barcode_sku')}</label>
                  <input name="barcode" value={form.barcode} onChange={handleChange} className={inputClass('barcode')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.description')}</label>
                  <textarea name="description" value={form.description || ''} onChange={handleChange} rows="2"
                    className={inputClass('description')} placeholder={t('product.description_placeholder')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.category')}</label>
                  <select name="category_id" value={form.category_id} onChange={handleChange} className={inputClass('category_id')}>
                    <option value="">{t('product.select_category')}</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('product.pricing_inventory')}</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.purchase_price')}</label>
                  <input type="number" step="0.01" name="purchase_price" value={form.purchase_price} onChange={handleChange} className={inputClass('purchase_price')} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.sale_price')}</label>
                  <input type="number" step="0.01" name="sale_price" value={form.sale_price} onChange={handleChange} className={inputClass('sale_price')} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('product.low_stock_warning')}</label>
                  <input type="number" name="low_stock_warning_count" value={form.low_stock_warning_count} onChange={handleChange} className={inputClass('low_stock_warning_count')} placeholder="0" />
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('product.attachments')}</h2>
            </div>
            <div className="p-4">
              {existingAttachments.length > 0 && (
                <div className="mb-3 border rounded-md divide-y">
                  {existingAttachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2">
                      <a href={att.url || att.file_path} target="_blank" rel="noopener noreferrer" className="text-sm text-[#007c89] hover:underline">{att.file_name}</a>
                      <button type="button" onClick={() => deleteExistingAttachment(att.id)} className="text-red-500 hover:text-red-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#007c89] file:text-white hover:file:bg-[#006d77]" />
              </div>
              {newAttachments.length > 0 && (
                <div className="mt-2 border rounded-md divide-y">
                  {newAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button type="button" onClick={() => removeNewAttachment(index)} className="text-red-500 hover:text-red-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>{t('product.saving')}</>
              ) : (
                <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>{t('product.update_product')}</>
              )}
            </button>
            <button type="button" onClick={() => navigate(`/products/${id}`)}
              className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
