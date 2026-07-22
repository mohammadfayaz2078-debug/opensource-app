import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function ProductIndex() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [summary, setSummary] = useState({
    total_products: 0,
    avg_price: 0
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStatistics();
  }, [filterCategory, minPrice, maxPrice]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category_id = filterCategory;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      if (search) params.search = search;
      
      const res = await api.get('/products', { params });
      setProducts(res.data.data || []);
      setSummary(res.data.summary || {});
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/product-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const res = await api.get('/products/statistics');
      setSummary(prev => ({ ...prev, ...res.data }));
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
      fetchStatistics();
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory('');
    setMinPrice('');
    setMaxPrice('');
    fetchProducts();
  };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{summary.total_products || 0} total</span>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">${summary.avg_price?.toLocaleString() || 0} avg</span>
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{summary.categories_with_products || 0} categories</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap flex-1 gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or barcode..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Search
            </button>
          </form>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min Price"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md w-28 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md w-28 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          />
          {(filterCategory || minPrice || maxPrice || search) && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/products/export')}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <Link
            to="/products/create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Product
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading products...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm text-gray-700">
                {search || filterCategory || minPrice || maxPrice 
                  ? 'No products match your filters.' 
                  : 'No products found. Create your first product to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Barcode</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Purchase Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Sale Price</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Units</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Attachments</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => (
                    <tr key={product.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link to={`/products/${product.id}`} className="text-sm font-medium text-gray-900 hover:text-[#007c89]">
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-gray-700">{product.barcode || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{product.category?.name || 'Uncategorized'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm text-gray-700">${product.purchase_price?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-medium text-emerald-600">${product.sale_price?.toLocaleString()}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700">
                        <div>P: {product.purchase_unit?.name || '—'}</div>
                        <div>S: {product.sale_unit?.name || '—'}</div>
                        <div>St: {product.stock_unit?.name || '—'}</div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                        {product.attachments_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                            {product.attachments_count}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
                            title="Delete"
                          >
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
    </div>
  );
}
