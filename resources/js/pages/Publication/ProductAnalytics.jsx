import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function PublicationIndex() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedProductComments, setSelectedProductComments] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/publications'),
      api.get('/orders'),
    ]).then(([pRes, oRes]) => {
      setProducts(pRes.data?.data || []);
      setOrders(oRes.data?.data || []);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const togglePublic = async (product) => {
    try {
      await api.post(`/publications/${product.id}/toggle`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_public: !p.is_public } : p));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const filteredProducts = useMemo(() => {
    let list = products;
    if (filter === 'published') list = list.filter(p => p.is_public);
    else if (filter === 'unpublished') list = list.filter(p => !p.is_public);
    if (search) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, search, filter]);

  const publishedCount = useMemo(() => products.filter(p => p.is_public).length, [products]);
  const totalLikes = useMemo(() => products.reduce((s, p) => s + (p.likes_count || 0), 0), [products]);
  const totalComments = useMemo(() => products.reduce((s, p) => s + (p.comments || []).length, 0), [products]);

  const statusColor = (s) => ({ pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }[s] || 'bg-gray-100 text-gray-700');

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Publication</h1>
        <p className="text-sm text-gray-500">Manage products, orders, comments, and likes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Products', value: products.length, color: 'text-gray-900' },
          { label: 'Published', value: publishedCount, color: 'text-green-600' },
          { label: 'Total Likes', value: totalLikes, color: 'text-red-600' },
          { label: 'Total Comments', value: totalComments, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-6">
          {[
            { id: 'products', label: 'Products' },
            { id: 'orders', label: `Orders (${orders.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-[#007c89] text-[#007c89]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="flex gap-3 mb-4">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
              className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
          <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Price</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Public</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Likes</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Comments</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-gray-500 text-sm">No products found.</td></tr>
                ) : filteredProducts.map((p, idx) => (
                  <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{p.category?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{parseFloat(p.sale_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => togglePublic(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                          p.is_public ? 'bg-[#007c89]' : 'bg-gray-300'
                        }`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                          p.is_public ? 'translate-x-[20px]' : 'translate-x-[2px]'
                        }`} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {p.likes_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => { setSelectedProductComments(p.comments || []); setSelectedProductName(p.name); }}
                        className="relative inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {(p.comments || []).length}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">No orders yet.</div>
          ) : (
            <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Order #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, idx) => (
                    <tr key={o.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{o.order_no}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">{o.customer_name}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{o.customer_phone || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">{o.items?.length || 0}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">{parseFloat(o.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor(o.status)}`}>{o.status?.toUpperCase()}</span></td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex justify-center gap-1">
                          {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'confirmed')} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Confirm</button>}
                          {o.status === 'confirmed' && <button onClick={() => updateOrderStatus(o.id, 'delivered')} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Deliver</button>}
                          {o.status !== 'cancelled' && o.status !== 'delivered' && <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Cancel</button>}
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

      {/* Comments Modal */}
      {selectedProductComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSelectedProductComments(null)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Comments — {selectedProductName}</h2>
              <button onClick={() => setSelectedProductComments(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 max-h-96 overflow-y-auto">
              {selectedProductComments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedProductComments.map((c, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm text-gray-900">{c.name}</span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {c.created_at}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm text-gray-600">{c.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
