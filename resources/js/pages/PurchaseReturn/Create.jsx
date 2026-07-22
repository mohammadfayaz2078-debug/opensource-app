import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PurchaseReturnCreate() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: '',
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/purchases/list/options'),
      api.get('/products/list/options'),
    ]).then(([pRes, prRes]) => {
      setPurchases(pRes.data?.data || []);
      setProducts(prRes.data?.data || []);
    }).catch(() => {});
  }, []);

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
    if (items.some(it => it.product_id === product.id)) return;
    setItems(prev => [...prev, {
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price: product.purchase_price || product.sale_price || 0,
    }]);
    setProductSearch('');
    setShowDropdown(false);
  };

  const updateItemField = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calcItemTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { setErrors({ general: 'Please add at least one item.' }); return; }
    setLoading(true);
    setErrors({});
    try {
      await api.post('/purchase-returns', {
        ...form,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
        })),
      });
      navigate('/purchase-returns');
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else setErrors({ general: err.response?.data?.message || 'Failed' });
    } finally { setLoading(false); }
  };

  const inputClass = `w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]`;
  const inputClassErr = (f) => `w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate('/purchase-returns')} className="text-sm text-[#007c89] hover:underline">&larr; Back to Purchase Returns</button>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">New Purchase Return</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Return Details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Return Details</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Order *</label>
                <select name="purchase_id" value={form.purchase_id} onChange={e => setForm({ ...form, purchase_id: e.target.value })}
                  className={inputClassErr('purchase_id')} required>
                  <option value="">Select PO</option>
                  {purchases.map(p => <option key={p.id} value={p.id}>{p.reference_no} - {parseFloat(p.total_amount).toFixed(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Return Date *</label>
                <input type="date" name="return_date" value={form.return_date}
                  onChange={e => setForm({ ...form, return_date: e.target.value })}
                  className={inputClassErr('return_date')} required />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <input type="text" name="reason" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className={inputClass} placeholder="Reason for return..." />
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''} added</span>
          </div>

          {/* Product Search */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <div className="max-w-sm">
              <label className="block text-xs text-gray-500 mb-0.5">Select Product</label>
              <div className="relative" ref={dropdownRef}>
                <input type="text" value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search products..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#007c89]/10 flex justify-between items-center">
                          <span className="text-gray-900">{p.name}</span>
                          <span className="text-gray-400 text-xs ml-2">{parseFloat(p.purchase_price || 0).toFixed(2)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-4">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No items added yet. Search and select a product above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-3 font-medium w-8">#</th>
                      <th className="text-left py-2 px-3 font-medium">Product</th>
                      <th className="text-right py-2 px-3 font-medium w-20">Qty</th>
                      <th className="text-right py-2 px-3 font-medium w-24">Price</th>
                      <th className="text-right py-2 px-3 font-medium w-20">Total</th>
                      <th className="text-center py-2 px-3 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const total = calcItemTotal(item);
                      return (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-500 text-center">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-gray-900">{item.name}</td>
                          <td className="py-2 px-3">
                            <input type="number" min="0.01" step="any" value={item.quantity}
                              onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right" />
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
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows="2" className={inputClass} placeholder="Optional notes..." />
            </div>
          </div>
          <div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Items</span><span>{items.length}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{subtotal.toFixed(2)}</span></div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-4 px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Return'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
