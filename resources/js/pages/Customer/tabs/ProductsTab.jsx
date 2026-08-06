import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ProductsTab({ products = [] }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    applyFilters();
  }, [products, dateFrom, dateTo]);

  const applyFilters = () => {
    let filtered = [...products];

    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.last_purchase) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.last_purchase) <= new Date(dateTo));
    }

    filtered.sort((a, b) => new Date(b.last_purchase) - new Date(a.last_purchase));
    setFilteredProducts(filtered);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0.00';
    }
    return parseFloat(amount).toFixed(2);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('customer-products-table');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${t('customer.products_purchased')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 8px; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${t('customer.products_purchased')}</h2>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          ${printContent ? printContent.innerHTML : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-medium text-gray-900">{t('customer.products_purchased')}</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
            <span className="text-xs text-gray-400">{t('customer.to')}</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              {t('customer.clear')}
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('customer.print')}
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-gray-500">{t('customer.no_products')}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div id="customer-products-table" className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.product')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.barcode')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.unit_price')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.total_qty')}</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.total_spent')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('customer.last_purchase')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((item, index) => (
                  <tr key={`${item.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.barcode || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.total_quantity?.toFixed(2) || 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.total_spent)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.last_purchase)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filteredProducts.map((item, index) => (
              <div key={`${item.id}-${index}`} className="p-4 space-y-2 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name || '—'}</p>
                    {item.barcode && <p className="text-xs text-gray-500">{item.barcode}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">{t('customer.unit_price')}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.unit_price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">{t('customer.qty')}</span>
                    <span className="font-medium text-gray-900">{item.total_quantity?.toFixed(2) || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">{t('customer.total_short')}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(item.total_spent)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {t('customer.last_purchase_label', { date: formatDate(item.last_purchase) })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
