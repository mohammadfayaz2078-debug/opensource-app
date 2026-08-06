import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import { useTranslation } from 'react-i18next';

const generatePageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
};

// Items Modal Component
const ItemsModal = ({ returnData, onClose }) => {
  const { t } = useTranslation();
  if (!returnData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50/50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#007c89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('purchase_return.return_items')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('purchase_return.reference_colon', { ref: returnData.reference_no })}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
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
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('purchase_return.col_hash')}</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('purchase_return.col_product')}</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('purchase_return.col_qty')}</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('purchase_return.col_price')}</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">{t('purchase_return.col_total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnData.items.map((item, idx) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.product?.name || t('purchase_return.unknown_product')}</div>
                          {item.notes && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {parseFloat(item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {parseFloat(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-right font-semibold text-gray-900">
                        {t('purchase_return.total')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {parseFloat(returnData.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {returnData.items.map((item, idx) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">#{idx + 1}</span>
                      <span className="text-xs text-gray-400">{parseFloat(item.total).toFixed(2)} AFN</span>
                    </div>
                    <div className="font-medium text-gray-900 text-sm">{item.product?.name || t('purchase_return.unknown_product')}</div>
                    {item.notes && (
                      <div className="text-xs text-gray-400 mt-1">{item.notes}</div>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('purchase_return.col_qty')}</div>
                        <div className="text-sm font-medium text-gray-800">{parseFloat(item.quantity).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('purchase_return.col_price')}</div>
                        <div className="text-sm font-medium text-gray-800">{parseFloat(item.unit_price).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">{t('purchase_return.col_total')}</div>
                        <div className="text-sm font-medium text-gray-800">{parseFloat(item.total).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-50 rounded-lg p-3.5 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">{t('purchase_return.total')}</span>
                  <span className="text-sm font-bold text-gray-900">{parseFloat(returnData.total_amount).toFixed(2)} AFN</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400 mt-2">{t('purchase_return.no_items')}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50/50 rounded-b-xl flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {t('purchase_return.items_returned', { count: returnData.items?.length || 0 })}
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            {t('purchase_return.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PurchaseReturnIndex() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);

  const fetchReturns = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      const res = await api.get('/purchase-returns', { params });
      setReturns(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) { 
      console.error('Error fetching returns:', err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    setCurrentPage(1);
    const timer = setTimeout(() => fetchReturns(1), 300); 
    return () => clearTimeout(timer); 
  }, [search, perPage]);

  const handleViewItems = (returnData) => {
    // Fetch full return data with items
    api.get(`/purchase-returns/${returnData.id}`)
      .then(res => {
        setSelectedReturn(res.data.data);
        setShowItemsModal(true);
      })
      .catch(err => console.error('Error fetching return details:', err));
  };

  const handleDelete = (id) => {
    if (!confirm(t('purchase_return.delete_confirm'))) return;
    
    setDeleting(true);
    setDeleteId(id);
    api.delete(`/purchase-returns/${id}`)
      .then(() => {
        fetchReturns(currentPage);
      })
      .catch(err => {
        console.error('Error deleting return:', err);
        alert(t('purchase_return.delete_failed'));
      })
      .finally(() => {
        setDeleting(false);
        setDeleteId(null);
      });
  };

  const handleEdit = (id) => {
    navigate(`/purchase-returns/${id}/edit`);
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
    // Check purchase refund status if available
    const refundStatus = returnData.purchase?.refund_status || 'none';
    
    if (refundStatus === 'full') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          {t('purchase_return.full_return')}
        </span>
      );
    } else if (refundStatus === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('purchase_return.partial_return')}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {t('purchase_return.returned')}
      </span>
    );
  };

  return (
    <>
      <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{t('purchase_return.title')}</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('purchase_return.records', { count: total })}</span>
              <button onClick={() => navigate('/purchase-returns/create')}
                className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
                {t('purchase_return.new_return')}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
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
                placeholder={t('purchase_return.search_placeholder')}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-700 text-sm">{t('purchase_return.loading')}</span>
          </div>
        )}

        {/* Table / Mobile Cards */}
        {!loading && (
          <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
            {returns.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm text-gray-700">
                  {search ? t('purchase_return.no_results_search') : t('purchase_return.no_results')}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('purchase_return.reference')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('purchase_return.date')}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('purchase_return.po')}</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('purchase_return.amount')}</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">{t('purchase_return.status')}</th>
                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">{t('purchase_return.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((r, idx) => (
                        <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{r.reference_no}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">{formatDate(r.return_date)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                            {r.purchase?.reference_no || '—'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 text-right">
                            {parseFloat(r.total_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            {getStatusBadge(r)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Items Button */}
                              <button
                                onClick={() => handleViewItems(r)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title={t('purchase_return.view_items')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleEdit(r.id)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title={t('purchase_return.edit')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(r.id)}
                                disabled={deleting && deleteId === r.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title={t('purchase_return.delete')}
                              >
                                {deleting && deleteId === r.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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
                    <div key={r.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{r.reference_no}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{formatDate(r.return_date)}</div>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(r)}
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('purchase_return.po_colon')}</span>
                          <span className="text-gray-700 font-medium">{r.purchase?.reference_no || '—'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{t('purchase_return.amount_colon')}</span>
                          <span className="text-gray-900 font-semibold">{parseFloat(r.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewItems(r)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          {t('purchase_return.items')}
                        </button>
                        <button
                          onClick={() => handleEdit(r.id)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                        >
                          {t('purchase_return.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deleting && deleteId === r.id}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {deleting && deleteId === r.id ? (
                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : t('purchase_return.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  {t('purchase_return.page_of', { current: currentPage, total: totalPages })}
                </div>
                <div className="flex items-center justify-center gap-1">
                  {/* First */}
                  <button 
                    onClick={() => fetchReturns(1)} 
                    disabled={currentPage === 1}
                    className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏮
                  </button>
                  {/* Prev */}
                  <button 
                    onClick={() => fetchReturns(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ◀
                  </button>
                  {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                    p === '...' ? (
                      <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button 
                        key={p} 
                        onClick={() => fetchReturns(p)} 
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  {/* Next */}
                  <button 
                    onClick={() => fetchReturns(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ▶
                  </button>
                  {/* Last */}
                  <button 
                    onClick={() => fetchReturns(totalPages)} 
                    disabled={currentPage === totalPages}
                    className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏭
                  </button>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <span className="text-xs text-gray-500">{t('purchase_return.show')}</span>
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchReturns(1, parseInt(e.target.value)); }}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs text-gray-500">{t('purchase_return.per_page')}</span>
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
        />
      )}
    </>
  );
}