import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function SaleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    customer_id: '', document_date: '', reference_no: '',
    discount_type: 'fixed', discount_value: '0', shipping_cost: '0', paid_amount: '0', notes: '',
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/sales/${id}`),
      api.get('/customers/list/options'),
      api.get('/products/list/options'),
      api.get('/units/list/options'),
    ]).then(([sRes, cRes, pRes, uRes]) => {
      const s = sRes.data.data;
      setForm({
        customer_id: s.customer_id || '',
        document_date: s.document_date?.split('T')[0] || '',
        reference_no: s.reference_no || '',
        discount_type: s.discount_type,
        discount_value: String(s.discount_value),
        shipping_cost: String(s.shipping_cost),
        paid_amount: String(s.paid_amount),
        notes: s.notes || '',
      });
      setItems(s.items.map(i => ({
        id: i.id, product_id: i.product_id || '', name: i.product?.name || '', unit_id: i.unit_id || '',
        quantity: String(i.quantity), unit_price: String(i.unit_price), discount: String(i.discount), notes: i.notes || '',
      })));
      setCustomers(cRes.data?.data || []);
      setProducts(pRes.data?.data || []);
      setUnits(uRes.data?.data || []);
    }).catch(() => navigate('/sales')).finally(() => setLoading(false));
  }, [id, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 20);
    return products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 20);
  }, [productSearch, products]);

  const addProduct = (product) => {
    if (items.some(it => it.product_id === product.id)) return;
    setItems(prev => [...prev, {
      product_id: product.id, name: product.name, unit_id: '',
      quantity: 1, unit_price: product.sale_price || product.purchase_price || 0, discount: 0, notes: '',
    }]);
    setProductSearch('');
    setShowDropdown(false);
  };

  const updateItemField = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const calcItemTotal = (item) => {
    const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    return sub - sub * ((parseFloat(item.discount) || 0) / 100);
  };

  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const totalDiscount = form.discount_type === 'percent' ? subtotal * (parseFloat(form.discount_value || 0) / 100) : parseFloat(form.discount_value || 0);
  const grandTotal = subtotal - totalDiscount + parseFloat(form.shipping_cost || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { setErrors({ general: t('sale.please_add_item') }); return; }
    setSaving(true); setErrors({});
    try {
      await api.put(`/sales/${id}`, {
        ...form,
        items: items.map(it => ({
          id: it.id, product_id: it.product_id, unit_id: it.unit_id || null,
          quantity: parseFloat(it.quantity), unit_price: parseFloat(it.unit_price),
          discount: parseFloat(it.discount || 0), notes: it.notes || null,
        })),
      });
      navigate(`/sales/${id}`);
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else setErrors({ general: err.response?.data?.message || t('sale.failed') });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('loading')}</div>;
  const inputClass = `w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89]`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate(`/sales/${id}`)} className="text-sm text-[#007c89] hover:underline">&larr; {t('sale.back')}</button>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{t('sale.edit_invoice')}</h1>
      </div>

      {errors.general && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>}

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">{t('sale.invoice_details')}</h2></div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.customer_label')}</label><select name="customer_id" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className={inputClass}><option value="">{t('sale.select')}</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.date_label')}</label><input type="date" name="document_date" value={form.document_date} onChange={e => setForm({ ...form, document_date: e.target.value })} className={inputClass} required /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.reference_label')}</label><input name="reference_no" value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} className={inputClass} /></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{t('sale.items')}</h2>
            <span className="text-xs text-gray-500">{t('sale.items_count', { count: items.length })}</span>
          </div>
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <div className="max-w-sm">
              <label className="block text-xs text-gray-500 mb-0.5">{t('sale.add_product')}</label>
              <div className="relative" ref={dropdownRef}>
                <input type="text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)} placeholder={t('sale.search_placeholder')}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">{t('sale.no_products_found')}</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#007c89]/10 flex justify-between items-center">
                          <span className="text-gray-900">{p.name}</span>
                          <span className="text-gray-400 text-xs ml-2">{parseFloat(p.sale_price || 0).toFixed(2)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4">
            {items.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">{t('sale.no_items_short')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-xs text-gray-500 uppercase"><th className="text-left py-2 px-3 font-medium w-8">#</th><th className="text-left py-2 px-3 font-medium">{t('sale.col_product')}</th><th className="text-right py-2 px-3 font-medium w-20">{t('sale.col_qty')}</th><th className="text-left py-2 px-3 font-medium w-24">{t('sale.col_unit')}</th><th className="text-right py-2 px-3 font-medium w-24">{t('sale.col_price')}</th><th className="text-right py-2 px-3 font-medium w-20">{t('sale.col_disc')}</th><th className="text-right py-2 px-3 font-medium w-20">{t('sale.col_total')}</th><th className="text-center py-2 px-3 font-medium w-12"></th></tr></thead>
                  <tbody>{items.map((item, idx) => {
                    const total = calcItemTotal(item);
                    return (<tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-500 text-center">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-900">{item.name}</td>
                      <td className="py-2 px-3"><input type="number" min="0.01" step="any" value={item.quantity} onChange={(e) => updateItemField(idx, 'quantity', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" /></td>
                      <td className="py-2 px-3"><select value={item.unit_id} onChange={(e) => updateItemField(idx, 'unit_id', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded"><option value="">{t('sale.default')}</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></td>
                      <td className="py-2 px-3"><input type="number" min="0" step="any" value={item.unit_price} onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" max="100" step="any" value={item.discount} onChange={(e) => updateItemField(idx, 'discount', e.target.value)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" /></td>
                      <td className="py-2 px-3 text-right font-medium">{total.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center"><button type="button" onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.discount_type')}</label><select name="discount_type" value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })} className={inputClass}><option value="fixed">{t('sale.fixed')}</option><option value="percent">{t('sale.percent')}</option></select></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.discount')}</label><input type="number" name="discount_value" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} min="0" className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.shipping')}</label><input type="number" name="shipping_cost" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} min="0" className={inputClass} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.paid')}</label><input type="number" name="paid_amount" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} min="0" className={inputClass} /></div>
              </div>
              <div className="mt-3"><label className="block text-xs font-medium text-gray-600 mb-1">{t('sale.notes')}</label><textarea name="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" className={inputClass} /></div>
            </div>
          </div>
          <div><div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">{t('sale.summary')}</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-600">{t('sale.subtotal')}</span><span>{subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-gray-600">{t('sale.discount')}</span><span>-{totalDiscount.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-gray-600">{t('sale.shipping')}</span><span>{parseFloat(form.shipping_cost || 0).toFixed(2)}</span></div><div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t('sale.total')}</span><span>{grandTotal.toFixed(2)}</span></div></div><button type="submit" disabled={saving} className="w-full mt-4 px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] disabled:opacity-50">{saving ? t('sale.saving') : t('sale.update')}</button></div></div>
        </div>
      </form>
    </div>
  );
}
