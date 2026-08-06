import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function SaleReturnCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [errors, setErrors] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isSaleLocked, setIsSaleLocked] = useState(false);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    sale_id: '',
    return_date: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: '',
  });

  const [items, setItems] = useState([]);

  // Check URL for sale_id parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const saleId = params.get('sale_id');
    if (saleId) {
      setForm(prev => ({ ...prev, sale_id: saleId }));
      setIsSaleLocked(true);
    }
  }, [location]);

  useEffect(() => {
    api.get('/sales/list/options').then((sRes) => {
      setSales(sRes.data?.data || []);
    }).catch(() => {});
  }, []);

  // Fetch products when needed
  useEffect(() => {
    if (products.length === 0) {
      api.get('/products/list/options').then((pRes) => {
        setProducts(pRes.data?.data || []);
      }).catch(() => {});
    }
  }, []);

  // Fetch sale items when sale is selected
  useEffect(() => {
    if (form.sale_id) {
      fetchSaleItems(form.sale_id);
    } else {
      setItems([]);
      setSelectedSale(null);
    }
  }, [form.sale_id]);

  const fetchSaleItems = async (saleId) => {
    setFetchingItems(true);
    try {
      const res = await api.get(`/sale-returns/refundable/${saleId}`);
      const data = res.data;
      setSelectedSale(data);
      
      // Map refundable items to return items
      const returnItems = (data.refundable_items || []).map(item => ({
        sale_item_id: item.sale_item_id,
        product_id: item.product_id,
        name: item.product_name,
        quantity: item.refundable_quantity,
        unit_price: item.unit_price,
        max_quantity: item.refundable_quantity,
        original_quantity: item.original_quantity,
        refunded_quantity: item.refunded_quantity,
      }));
      setItems(returnItems);
    } catch (err) {
      console.error('Error fetching sale items:', err);
      setErrors({ sale_id: t('sale_return.could_not_load') });
    } finally {
      setFetchingItems(false);
    }
  };

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
    const term = productSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(term)).slice(0, 20);
  }, [productSearch, products]);

  const addProduct = (product) => {
    if (items.some(it => it.product_id === product.id)) {
      // Product already added, update quantity instead
      setItems(prev => prev.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: Math.min(item.quantity + 1, item.max_quantity || item.quantity + 1) }
          : item
      ));
      setProductSearch('');
      setShowDropdown(false);
      return;
    }
    
    setItems(prev => [...prev, {
      sale_item_id: null,
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price: product.sale_price || product.purchase_price || 0,
      max_quantity: 999999,
      original_quantity: 0,
      refunded_quantity: 0,
    }]);
    setProductSearch('');
    setShowDropdown(false);
  };

  const updateItemField = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newValue = parseFloat(value) || 0;
        const maxQty = item.max_quantity || 999999;
        if (field === 'quantity') {
          return { ...item, [field]: Math.min(newValue, maxQty) };
        }
        return { ...item, [field]: newValue };
      }
      return item;
    }));
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calcItemTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const totalRefundable = selectedSale?.refundable_items?.reduce((sum, item) => sum + (item.refundable_quantity || 0), 0) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { setErrors({ general: t('sale_return.please_add_item') }); return; }
    
    // Validate quantities
    const invalidItems = items.filter(item => 
      item.quantity <= 0 || (item.max_quantity && item.quantity > item.max_quantity)
    );
    if (invalidItems.length > 0) {
      setErrors({ general: t('sale_return.invalid_qty') });
      return;
    }
    
    setLoading(true);
    setErrors({});
    try {
      await api.post('/sale-returns', {
        ...form,
        items: items.map(i => ({
          sale_item_id: i.sale_item_id,
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
        })),
      });
      navigate('/sale-returns');
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else setErrors({ general: err.response?.data?.message || t('sale_return.create_failed') });
    } finally { setLoading(false); }
  };

  const inputClass = `w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]`;
  const inputClassErr = (f) => `w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate('/sale-returns')} className="text-sm text-[#007c89] hover:underline">&larr; {t('sale_return.back_to_returns')}</button>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{t('sale_return.new_title')}</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Return Details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">{t('sale_return.details')}</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('sale_return.invoice_label')}</label>
                <select 
                  name="sale_id" 
                  value={form.sale_id} 
                  onChange={e => setForm({ ...form, sale_id: e.target.value })}
                  className={inputClassErr('sale_id')} 
                  required
                  disabled={isSaleLocked}
                >
                  <option value="">{t('sale_return.select_invoice')}</option>
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.reference_no} - {parseFloat(s.total_amount).toFixed(2)}
                    </option>
                  ))}
                </select>
                {isSaleLocked && (
                  <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t('sale_return.invoice_locked')}
                  </p>
                )}
                {errors.sale_id && <p className="mt-1 text-xs text-red-500">{errors.sale_id}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('sale_return.return_date')}</label>
                <input type="date" name="return_date" value={form.return_date}
                  onChange={e => setForm({ ...form, return_date: e.target.value })}
                  className={inputClassErr('return_date')} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('sale_return.reason')}</label>
                <input type="text" name="reason" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className={inputClass} placeholder={t('sale_return.reason_placeholder')} />
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{t('sale.items')}</h2>
            <span className="text-xs text-gray-500">{t('sale_return.items_added', { count: items.length })}</span>
          </div>

          {/* Selected Sale Info */}
          {selectedSale && (
            <div className="px-4 py-2 bg-blue-50/50 border-b border-gray-200 flex items-center justify-between text-sm flex-wrap gap-2">
              <span className="text-gray-700">
                {t('sale_return.invoice_colon', { ref: selectedSale.sale_reference })}
              </span>
              <span className="text-gray-700">
                {t('sale_return.refundable_items', { count: totalRefundable })}
              </span>
              {isSaleLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {t('sale_return.from_sale')}
                </span>
              )}
            </div>
          )}

          {fetchingItems && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#007c89] border-t-transparent"></div>
              <span className="ml-2 text-sm text-gray-600">{t('sale_return.loading_items')}</span>
            </div>
          )}

          {/* Product Search */}
          {!fetchingItems && (
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <div className="max-w-sm">
                <label className="block text-xs text-gray-500 mb-0.5">{t('sale_return.select_product')}</label>
                <div className="relative" ref={dropdownRef}>
                  <input type="text" value={productSearch}
                    onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder={t('sale_return.search_products')}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400">{t('sale_return.no_products_found')}</div>
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
          )}

          {/* Items Table */}
          <div className="p-4">
            {items.length === 0 && !fetchingItems ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {form.sale_id ? t('sale_return.no_refundable') : t('sale_return.select_invoice_first')}
              </p>
            ) : items.length > 0 && !fetchingItems ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-3 font-medium w-8">#</th>
                      <th className="text-left py-2 px-3 font-medium">{t('sale_return.col_product')}</th>
                      <th className="text-right py-2 px-3 font-medium w-32">{t('sale_return.col_qty')}</th>
                      <th className="text-right py-2 px-3 font-medium w-28">{t('sale_return.col_price')}</th>
                      <th className="text-right py-2 px-3 font-medium w-24">{t('sale_return.col_total')}</th>
                      <th className="text-center py-2 px-3 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const total = calcItemTotal(item);
                      const maxQty = item.max_quantity || 999999;
                      return (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-500 text-center">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div>
                              <div className="font-medium text-gray-900">{item.name}</div>
                              {item.max_quantity && (
                                <div className="text-xs text-gray-400">
                                  {t('sale_return.max_label', { max: item.max_quantity })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="0.01" step="any" value={item.quantity}
                              onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" />
                            {item.quantity > maxQty && (
                              <div className="text-xs text-red-500">{t('sale_return.exceeds_max')}</div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="0" step="any" value={item.unit_price}
                              onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" />
                          </td>
                          <td className="py-2 px-3 text-right font-medium">{total.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button type="button" onClick={() => removeItem(idx)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('sale_return.notes')}</label>
              <textarea name="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows="2" className={inputClass} placeholder={t('sale_return.notes_placeholder')} />
            </div>
          </div>
          <div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('sale_return.summary')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">{t('sale.items')}</span><span>{items.length}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>{t('sale_return.col_total')}</span><span>{subtotal.toFixed(2)}</span></div>
              </div>
              <button type="submit" disabled={loading || fetchingItems || items.length === 0}
                className="w-full mt-4 px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? t('sale_return.creating') : t('sale_return.create_return')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
