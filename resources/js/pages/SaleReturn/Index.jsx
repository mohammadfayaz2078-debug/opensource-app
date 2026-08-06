import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= Math.min(5, total); i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...', total);
  }
  return pages;
}

// Items Modal Component
const ItemsModal = ({ returnData, onClose, t }) => {
  if (!returnData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('sale_return.return_items')}</h3>
            <p className="text-sm text-gray-500">{t('sale_return.reference_colon', { ref: returnData.reference_no })}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {returnData.items && returnData.items.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('sale_return.col_product')}</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('sale_return.col_qty')}</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('sale_return.col_price')}</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">{t('sale_return.col_total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnData.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.product?.name || t('sale_return.unknown_product')}
                          {item.notes && <div className="text-xs text-gray-400">{item.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{parseFloat(item.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{parseFloat(item.unit_price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{parseFloat(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-right font-semibold text-gray-900">{t('sale_return.col_total')}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{parseFloat(returnData.total_amount).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {returnData.items.map((item, idx) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3.5 space-y-2.5 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                        <div className="text-sm font-medium text-gray-900 leading-tight">{item.product?.name || t('sale_return.unknown_product')}</div>
                        {item.notes && <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block">{t('sale_return.col_qty')}</span>
                        <span className="font-medium text-gray-700">{parseFloat(item.quantity).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block">{t('sale_return.col_price')}</span>
                        <span className="text-gray-700">{parseFloat(item.unit_price).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase block">{t('sale_return.col_total')}</span>
                        <span className="font-semibold text-gray-900">{parseFloat(item.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Mobile total */}
                <div className="flex items-center justify-between px-3.5 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{t('sale_return.col_total')}</span>
                  <span className="text-base font-bold text-gray-900">{parseFloat(returnData.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-400 py-8">{t('sale_return.no_items')}</p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">{t('sale_return.close')}</button>
        </div>
      </div>
    </div>
  );
};

export default function SaleReturnIndex() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const fetchReturns = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      const res = await api.get('/sale-returns', { params });
      setReturns(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
    } catch (err) { 
      console.error('Error fetching returns:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    setCurrentPage(1);
    const t = setTimeout(() => fetchReturns(1), 300); 
    return () => clearTimeout(t); 
  }, [search, perPage]);

  const handleViewItems = (returnData) => {
    // Fetch full return data with items
    api.get(`/sale-returns/${returnData.id}`)
      .then(res => {
        setSelectedReturn(res.data.data);
        setShowItemsModal(true);
      })
      .catch(err => console.error('Error fetching return details:', err));
  };

  const handleDelete = (id) => {
    if (!confirm(t('sale_return.delete_confirm'))) return;
    
    setDeleting(true);
    setDeleteId(id);
    api.delete(`/sale-returns/${id}`)
      .then(() => {
        fetchReturns();
      })
      .catch(err => {
        console.error('Error deleting return:', err);
        alert(t('sale_return.delete_failed'));
      })
      .finally(() => {
        setDeleting(false);
        setDeleteId(null);
      });
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (returnData) => {
    // You can add status logic here if needed
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
        {t('sale_return.returned')}
      </span>
    );
  };

  return (
    <>
      <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{t('sale_return.title')}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('sale_return.total', { count: returns.length })}</span>
              <button onClick={() => navigate('/sale-returns/create')}
                className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
                {t('sale_return.new_return')}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('sale_return.search_placeholder')}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-700 text-sm">{t('sale_return.loading')}</span>
          </div>
        )}

        {!loading && (
          <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
            {returns.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-700">
                  {search ? t('sale_return.no_results_search') : t('sale_return.no_results')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.reference')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.date')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.invoice')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.customer')}</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.amount')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('sale_return.status')}</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">{t('sale_return.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((r, idx) => (
                        <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{r.reference_no}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{formatDate(r.return_date)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{r.sale?.reference_no || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{r.customer?.name || r.sale?.customer?.name || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right font-medium text-gray-900">{parseFloat(r.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">{getStatusBadge(r)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleViewItems(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('sale_return.view_items')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                              </button>
                              <button onClick={() => navigate(`/sale-returns/${r.id}/edit`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title={t('sale_return.edit')}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(r.id)} disabled={deleting && deleteId === r.id} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50" title={t('sale_return.delete')}>
                                {deleting && deleteId === r.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {returns.map((r) => (
                    <div key={r.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-gray-900">{r.reference_no}</span>
                          <span className="text-xs text-gray-500 block">{formatDate(r.return_date)}</span>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(r)}</div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">{t('sale_return.invoice')}</span>
                          <span className="text-gray-700">{r.sale?.reference_no || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">{t('sale_return.customer')}</span>
                          <span className="text-gray-700 text-right truncate max-w-[55%]">{r.customer?.name || r.sale?.customer?.name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <span className="text-gray-400 text-xs">{t('sale_return.amount')}</span>
                          <span className="font-semibold text-gray-900">{parseFloat(r.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => handleViewItems(r)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                          {t('sale_return.items')}
                        </button>
                        <button onClick={() => navigate(`/sale-returns/${r.id}/edit`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          {t('sale_return.edit')}
                        </button>
                        <button onClick={() => handleDelete(r.id)} disabled={deleting && deleteId === r.id} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50">
                          {deleting && deleteId === r.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          )}
                          {t('sale_return.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-gray-500 whitespace-nowrap">{t('sale_return.page_of', { current: currentPage, total: totalPages })}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => fetchReturns(1)} disabled={currentPage === 1} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title={t('sale_return.first_page')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => fetchReturns(currentPage - 1)} disabled={currentPage === 1} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title={t('sale_return.previous_page')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {generatePageNumbers(currentPage, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 select-none">…</span>
                    ) : (
                      <button key={p} onClick={() => fetchReturns(p)} className={`inline-flex items-center justify-center w-8 h-8 text-xs rounded-md font-medium transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'}`}>{p}</button>
                    )
                  )}
                  <button onClick={() => fetchReturns(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title={t('sale_return.next_page')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={() => fetchReturns(totalPages)} disabled={currentPage === totalPages} className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-xs rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title={t('sale_return.last_page')}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                  <span className="hidden sm:inline">{t('sale_return.show')}</span>
                  <select value={perPage} onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="hidden sm:inline">{t('sale_return.per_page')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Modal */}
      {showItemsModal && (
        <ItemsModal 
          returnData={selectedReturn} 
          onClose={() => {
            setShowItemsModal(false);
            setSelectedReturn(null);
          }}
          t={t}
        />
      )}
    </>
  );
}
