import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PurchaseReturnEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [originalPurchaseId, setOriginalPurchaseId] = useState(null);

  const [form, setForm] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: '',
  });

  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);

  // Fetch products
  useEffect(() => {
    api.get('/products/list/options')
      .then((pRes) => {
        setProducts(pRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  // Fetch return data
  useEffect(() => {
    fetchReturnData();
  }, [id]);

  const fetchReturnData = async () => {
    setFetching(true);
    try {
      const res = await api.get(`/purchase-returns/${id}`);
      const data = res.data.data;
      
      setForm({
        purchase_id: data.purchase_id,
        return_date: data.return_date,
        reason: data.reason || '',
        notes: data.notes || '',
      });
      
      setOriginalPurchaseId(data.purchase_id);
      
      // Map items
      const mappedItems = (data.items || []).map(item => ({
        id: item.id,
        purchase_item_id: item.purchase_item_id,
        product_id: item.product_id,
        name: item.product?.name || 'Unknown Product',
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price),
        total: parseFloat(item.total),
        notes: item.notes || '',
        max_quantity: parseFloat(item.quantity) * 2, // Allow some flexibility
      }));
      
      setItems(mappedItems);
      setOriginalItems(JSON.parse(JSON.stringify(mappedItems)));
    } catch (err) {
      console.error('Error fetching return:', err);
      setErrors({ general: 'Failed to load return data' });
    } finally {
      setFetching(false);
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
      setItems(prev => prev.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      setProductSearch('');
      setShowDropdown(false);
      return;
    }
    
    setItems(prev => [...prev, {
      id: null,
      purchase_item_id: null,
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_price: product.purchase_price || product.sale_price || 0,
      total: 0,
      notes: '',
      max_quantity: 999999,
    }]);
    setProductSearch('');
    setShowDropdown(false);
  };

  const updateItemField = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newValue = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(value) || 0;
        const updatedItem = { ...item, [field]: newValue };
        
        // Recalculate total if quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total = (updatedItem.quantity || 0) * (updatedItem.unit_price || 0);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (index) => {
    if (items.length <= 1) {
      setErrors({ general: 'Cannot remove the last item.' });
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calcItemTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0);

  const hasChanges = () => {
    // Check if form changed
    if (form.purchase_id !== originalPurchaseId) return true;
    if (form.return_date !== originalItems[0]?.return_date) return true;
    
    // Check if items changed
    if (items.length !== originalItems.length) return true;
    
    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const original = originalItems[i];
      if (!original) return true;
      
      if (Math.abs(current.quantity - original.quantity) > 0.001) return true;
      if (Math.abs(current.unit_price - original.unit_price) > 0.001) return true;
      if ((current.notes || '') !== (original.notes || '')) return true;
      if (current.product_id !== original.product_id) return true;
    }
    
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (items.length === 0) { 
      setErrors({ general: 'Please add at least one item.' }); 
      return; 
    }
    
    // Validate quantities
    const invalidItems = items.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      setErrors({ general: 'All quantities must be greater than 0.' });
      return;
    }
    
    if (!hasChanges()) {
      setErrors({ general: 'No changes to save.' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      await api.put(`/purchase-returns/${id}`, {
        ...form,
        items: items.map(i => ({
          id: i.id,
          purchase_item_id: i.purchase_item_id,
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          notes: i.notes || '',
          total: parseFloat(calcItemTotal(i)),
        })),
      });
      navigate('/purchase-returns');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to update return' });
      }
    } finally { 
      setLoading(false); 
    }
  };

  const inputClass = `w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]`;
  const inputClassErr = (f) => `w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  if (fetching) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading return details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate('/purchase-returns')} className="text-sm text-[#007c89] hover:underline">&larr; Back to Purchase Returns</button>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Edit Purchase Return</h1>
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
                <input
                  type="text"
                  value={`PO #${form.purchase_id}`}
                  disabled
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-400 mt-1">Purchase order cannot be changed</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Return Date *</label>
                <input type="date" name="return_date" value={form.return_date}
                  onChange={e => setForm({ ...form, return_date: e.target.value })}
                  className={inputClassErr('return_date')} required />
              </div>
              <div>
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
            <span className="text-xs text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Product Search */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <div className="max-w-sm">
              <label className="block text-xs text-gray-500 mb-0.5">Add Product</label>
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
              <p className="text-sm text-gray-400 text-center py-4">No items added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-3 font-medium w-8">#</th>
                      <th className="text-left py-2 px-3 font-medium">Product</th>
                      <th className="text-right py-2 px-3 font-medium w-32">Qty</th>
                      <th className="text-right py-2 px-3 font-medium w-28">Price</th>
                      <th className="text-right py-2 px-3 font-medium w-24">Total</th>
                      <th className="text-left py-2 px-3 font-medium w-48">Notes</th>
                      <th className="text-center py-2 px-3 font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const total = calcItemTotal(item);
                      return (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-500 text-center">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.id && (
                              <div className="text-xs text-gray-400">ID: {item.id}</div>
                            )}
                          </td>
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
                          <td className="py-2 px-3">
                            <input type="text" value={item.notes || ''}
                              onChange={(e) => updateItemField(idx, 'notes', e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded" />
                          </td>
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
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea name="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                rows="2" className={inputClass} placeholder="Additional notes..." />
            </div>
          </div>
          <div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Items</span><span>{items.length}</span></div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
              </div>
              <button type="submit" disabled={loading || !hasChanges()}
                className="w-full mt-4 px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Updating...' : 'Update Return'}
              </button>
              <button type="button" onClick={() => navigate('/purchase-returns')}
                className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}