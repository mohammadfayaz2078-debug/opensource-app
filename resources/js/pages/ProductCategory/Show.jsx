import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function ProductCategoryShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    try {
      const res = await api.get(`/product-categories/${id}`);
      setCategory(res.data.data);
    } catch (err) {
      console.error('Failed to fetch category', err);
      navigate('/product-categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('product_category.delete_confirm'))) return;
    try {
      await api.delete(`/product-categories/${id}`);
      navigate('/product-categories');
    } catch (err) {
      const message = err.response?.data?.message || t('product_category.delete_failed');
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">{t('product_category.loading_category')}</span>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/product-categories')} className="hover:text-[#007c89] whitespace-nowrap">{t('product_category.title')}</button>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700 truncate">{category.name}</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">{category.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('product_category.show_subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/product-categories/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('edit')}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('product_category.description_title')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {category.description || t('product_category.no_description')}
              </p>
            </div>
          </div>

          {/* Products in this category */}
          {category.recent_products && category.recent_products.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h2 className="text-lg font-medium text-gray-900">{t('product_category.recent_products')}</h2>
                <Link
                  to={`/products?category_id=${category.id}`}
                  className="text-sm text-[#007c89] hover:underline whitespace-nowrap"
                >
                  {t('product_category.view_all', { count: category.products_count })}
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {category.recent_products.map(product => (
                  <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <Link to={`/products/${product.id}`} className="block">
                      <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 hover:text-[#007c89] truncate">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-xs text-gray-500 mt-1">{t('product_category.sku_label', { sku: product.sku })}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            ${product.price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('product_category.statistics')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">{t('product_category.total_products')}</dt>
                  <dd className="text-2xl font-bold text-gray-900">{category.products_count || 0}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('product_category.quick_actions')}</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-2">
              <button
                onClick={() => navigate('/products/create', { state: { category_id: category.id } })}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t('product_category.add_product')}
              </button>
            </div>
          </div>

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('product_category.audit_info')}</h2>
            </div>
            <div className="p-4 sm:p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('product_category.created_at')}</dt>
                  <dd className="text-gray-700">{new Date(category.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('product_category.last_updated')}</dt>
                  <dd className="text-gray-700">{new Date(category.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
