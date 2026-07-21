import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';

export default function ProductShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.data);
    } catch (err) {
      console.error('Failed to fetch product', err);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await api.delete(`/products/${id}`);
      navigate('/products');
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading product...</span>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/products')} className="hover:text-[#007c89]">Products</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{product.name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {product.barcode && <span>SKU: {product.barcode}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/products/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pricing Card */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm">
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Purchase Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${product.purchase_price?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    per {product.purchase_unit?.name || 'unit'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase">Sale Price</p>
                  <p className="text-3xl font-bold text-green-700">
                    ${product.sale_price?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    per {product.sale_unit?.name || 'unit'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 text-center">
                <p className="text-sm text-gray-600">
                  Margin: {(((product.sale_price - product.purchase_price) / product.sale_price) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Units Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Units of Measurement</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Purchase Unit</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {product.purchase_unit?.name || '—'}
                  </p>
                  {product.purchase_unit && (
                    <p className="text-xs text-gray-400">{product.purchase_unit.category?.name}</p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Sale Unit</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {product.sale_unit?.name || '—'}
                  </p>
                  {product.sale_unit && (
                    <p className="text-xs text-gray-400">{product.sale_unit.category?.name}</p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Stock Unit</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {product.stock_unit?.name || '—'}
                  </p>
                  {product.stock_unit && (
                    <p className="text-xs text-gray-400">{product.stock_unit.category?.name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Settings */}
          {(product.low_stock_warning_count > 0 || product.reorder_point > 0) && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Inventory Settings</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Low Stock Warning</p>
                    <p className="text-xl font-semibold text-orange-600">
                      {product.low_stock_warning_count} units
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Reorder Point</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {product.reorder_point} units
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {product.attachments && product.attachments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Attachments</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.attachments.map(attachment => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border rounded-lg p-3 text-center hover:shadow-md transition-shadow group"
                    >
                      <div className="text-4xl mb-2">
                        {attachment.mime_type?.startsWith('image/') ? '🖼️' : '📄'}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{attachment.file_name}</p>
                      <p className="text-xs text-gray-400">
                        {(attachment.file_size / 1024).toFixed(2)} KB
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Category</h2>
            </div>
            <div className="p-6">
              {product.category ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.category.name}</p>
                  {product.category.description && (
                    <p className="text-xs text-gray-500 mt-1">{product.category.description}</p>
                  )}
                  <Link
                    to={`/product-categories/${product.category.id}`}
                    className="inline-block mt-3 text-xs text-[#007c89] hover:underline"
                  >
                    View Category →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Uncategorized</p>
              )}
            </div>
          </div>

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Audit Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(product.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(product.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}