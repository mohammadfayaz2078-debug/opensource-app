import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

// Items Modal Component
const ItemsModal = ({ returnData, onClose }) => {
  if (!returnData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#007c89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Return Items
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Reference: {returnData.reference_no}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {returnData.items && returnData.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {returnData.items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</div>
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
                      Total
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {parseFloat(returnData.total_amount).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400 mt-2">No items found for this return.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50/50 rounded-b-xl flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {returnData.items?.length || 0} item{returnData.items?.length !== 1 ? 's' : ''} returned
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PurchaseReturnIndex() {
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

  const fetchReturns = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
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
    const t = setTimeout(() => fetchReturns(), 300); 
    return () => clearTimeout(t); 
  }, [search]);

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
    if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) return;
    
    setDeleting(true);
    setDeleteId(id);
    api.delete(`/purchase-returns/${id}`)
      .then(() => {
        fetchReturns(currentPage);
      })
      .catch(err => {
        console.error('Error deleting return:', err);
        alert('Failed to delete return. Please try again.');
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
          Full Return
        </span>
      );
    } else if (refundStatus === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Partial Return
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Returned
      </span>
    );
  };

  return (
    <>
      <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-semibold text-gray-900">Purchase Returns</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{total} records</span>
              <button onClick={() => navigate('/purchase-returns/create')}
                className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
                + New Return
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
                placeholder="Search by reference..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-700 text-sm">Loading returns...</span>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
            {returns.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm text-gray-700">
                  {search ? 'No returns match your search.' : 'No returns yet.'}
                </p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">PO</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">Actions</th>
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
                            title="View Items"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEdit(r.id)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Edit"
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
                            title="Delete"
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
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex justify-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button 
                    key={p} 
                    onClick={() => fetchReturns(p)} 
                    className={`px-2.5 py-1 text-xs rounded-md ${p === currentPage ? 'bg-[#007c89] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                ))}
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