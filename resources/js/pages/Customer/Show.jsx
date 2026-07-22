import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import PaymentModal from '../../components/PaymentModal';

export default function CustomerShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [invoices, setInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const [loadingTab, setLoadingTab] = useState(false);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => { fetchCustomer(); }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.data);
    } catch (err) { navigate('/customers'); }
    finally { setLoading(false); }
  };


  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchTabData = async (tab) => {
    setLoadingTab(true);
    try {
      if (tab === 'invoices') {
        const res = await api.get('/sales', { params: { customer_id: id } });
        setInvoices(res.data?.data || []);
      } else if (tab === 'returns') {
        const res = await api.get('/sale-returns');
        setReturns((res.data?.data || []).filter(r => r.sale?.customer_id == id));
      } else if (tab === 'payments') {
        const res = await api.get(`/account-transactions`, {
          params: {
            reference_type: 'App\\Models\\Sale',
            per_page: 50
          }
        });
        // Filter to only show invoices belonging to this customer
        try {
          const invRes = await api.get('/sales', { params: { customer_id: id, per_page: 100 } });
          const invoiceIds = (invRes.data?.data || []).map(s => s.id);
          const filtered = (res.data.data || []).filter(t => invoiceIds.includes(t.reference_id));
          setPayments(filtered);
        } catch (e) {
          setPayments(res.data.data || []);
        }
        setPaymentMeta(res.data);
        setPaymentPage(1);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingTab(false); }
  };

  useEffect(() => {
    if (activeTab !== 'info') fetchTabData(activeTab);
  }, [activeTab, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); navigate('/customers'); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleToggleStatus = async () => {
    try { await api.post(`/customers/${id}/toggle-status`); setCustomer(prev => ({ ...prev, is_active: !prev.is_active })); }
    catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

<<<<<<< HEAD
  const handleConvertToCustomer = async () => {
    if (!confirm('Convert this lead to a customer?\n\nPending orders will be converted to invoices.')) return;
    try {
      const res = await api.post(`/customers/${id}/convert-to-customer`);
      setCustomer(res.data.data);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert lead.');
    }
=======
  const openPayModal = (invoice) => {
    // Don't allow payment for returned or cancelled sales
    if (invoice.status === 'returned' || invoice.status === 'cancelled') {
      return;
    }
    setSelectedInvoice(invoice);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh invoices after payment
    fetchTabData('invoices');
>>>>>>> fc062ef9846ee7d99db5b4de421e9a4ecd99308c
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'returns', label: 'Returns' },
    { id: 'payments', label: 'Payments' },
  ].filter(t => customer?.status === 'lead' ? t.id === 'info' : true);

  const mapUrl = customer?.gps_lat && customer?.gps_lng
    ? `https://www.openstreetmap.org/?mlat=${customer.gps_lat}&mlon=${customer.gps_lng}#map=15/${customer.gps_lat}/${customer.gps_lng}`
    : null;

  if (loading) return <div className="p-8 text-center text-gray-500">Loading customer...</div>;
  if (!customer) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline">&larr; Back</button>
        <div className="flex justify-between items-start mt-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{customer.first_name} {customer.last_name}</h1>
            <p className="text-sm text-gray-500">Code: {customer.user_code} | {customer.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="flex gap-2">
            {customer.status === 'lead' && (
              <button onClick={handleConvertToCustomer}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700
                  shadow-sm shadow-emerald-500/25 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Convert to Customer
              </button>
            )}
            <button onClick={() => navigate(`/customers/${id}/edit`)} className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]">Edit</button>
            <button onClick={handleToggleStatus} className={`px-4 py-2 text-sm rounded-md ${customer.is_active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{customer.is_active ? 'Deactivate' : 'Activate'}</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50">Delete</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-[#007c89] text-[#007c89]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Customer Information</h2></div>
              <div className="p-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-gray-500 uppercase">Code</dt><dd className="text-gray-900 font-mono">{customer.user_code}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Phone</dt><dd className="text-gray-900">{customer.phone || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="text-gray-900">{customer.email || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Country</dt><dd className="text-gray-900">{customer.country || '—'}</dd></div>
                  {customer.district && <div><dt className="text-xs text-gray-500 uppercase">District</dt><dd className="text-gray-900">{customer.district}</dd></div>}
                  {customer.province && <div><dt className="text-xs text-gray-500 uppercase">Province</dt><dd className="text-gray-900">{customer.province}</dd></div>}
                </dl>
              </div>
            </div>
            {customer.street_address && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Address</h2></div>
                <div className="p-4"><p className="text-sm text-gray-900">{customer.street_address}</p></div>
              </div>
            )}
            {customer.note && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Notes</h2></div>
                <div className="p-4"><p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.note}</p></div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">Audit</h3></div>
              <div className="p-4 space-y-1 text-sm">
                <div><span className="text-gray-500">Created: </span>{new Date(customer.created_at).toLocaleDateString()}</div>
                <div><span className="text-gray-500">Updated: </span>{new Date(customer.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
            <button onClick={() => navigate('/sales/create')} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">+ New Invoice</button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : invoices.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No invoices for this customer.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Paid</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Due</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Payment</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((s, idx) => {
                      const canAct = s.status !== 'cancelled' && s.status !== 'returned';
                      const canPay = canAct && s.payment_status !== 'paid';
                      const canReturn = canAct && s.status === 'confirmed';
                      const canEdit = canAct && s.payment_status !== 'paid';
                      const canDelete = canAct && s.payment_status !== 'paid';
                      
                      const statusColors = {
                        draft: 'bg-gray-100 text-gray-700',
                        confirmed: 'bg-blue-100 text-blue-700',
                        cancelled: 'bg-orange-100 text-orange-700',
                        returned: 'bg-purple-100 text-purple-700'
                      };
                      
                      const paymentColors = {
                        unpaid: 'bg-red-100 text-red-700',
                        partial: 'bg-yellow-100 text-yellow-700',
                        paid: 'bg-green-100 text-green-700'
                      };
                      
                      const refundColors = {
                        none: 'bg-gray-100 text-gray-500',
                        partial: 'bg-yellow-100 text-yellow-700',
                        full: 'bg-purple-100 text-purple-700'
                      };

                      const statusBadge = (status) => {
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
                            {status === 'returned' && (
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                            {status === 'cancelled' && (
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            {status === 'confirmed' && (
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {status?.toUpperCase()}
                          </span>
                        );
                      };

                      const refundBadge = (status) => {
                        const statusDisplay = status || 'none';
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${refundColors[statusDisplay]}`}>
                            {statusDisplay === 'full' && (
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {statusDisplay === 'partial' && (
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {statusDisplay.toUpperCase()}
                          </span>
                        );
                      };

                      const handleDeleteInvoice = async (invoiceId) => {
                        if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
                        try {
                          await api.delete(`/sales/${invoiceId}`);
                          // Refresh invoices
                          fetchTabData('invoices');
                        } catch (err) {
                          alert(err.response?.data?.message || 'Delete failed');
                        }
                      };

                      const handleReturn = (invoiceId) => {
                        navigate(`/sale-returns/create?sale_id=${invoiceId}`);
                      };

                      return (
                        <tr key={s.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors ${s.status === 'returned' || s.status === 'cancelled' ? 'opacity-75' : ''}`}>
                          <td className="px-4 py-2.5">
                            <button onClick={() => navigate(`/sales/${s.id}`)} className="text-[#007c89] hover:underline font-medium">
                              {s.reference_no}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            {s.document_date?.split('T')[0] || s.document_date}
                          </td>
                          <td className="px-4 py-2.5">
                            {statusBadge(s.status)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                            {parseFloat(s.total_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                            {parseFloat(s.paid_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                            {parseFloat(s.due_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentColors[s.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                              {s.payment_status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <button onClick={() => navigate(`/sales/${s.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600" title="View">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* Download Invoice */}
                              <button onClick={() => navigate(`/sales/${s.id}/invoice`)} className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" title="Download Invoice">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>

                              {/* Return Button */}
                              {canReturn && (
                                <button 
                                  onClick={() => handleReturn(s.id)} 
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors" 
                                  title="Process Return"
                                >
                                  Return
                                </button>
                              )}

                              {/* Pay Button - Using Payment Modal */}
                              {canPay && (
                                <button 
                                  onClick={() => openPayModal(s)} 
                                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors" 
                                  title="Pay"
                                >
                                  Pay
                                </button>
                              )}

                              {/* Edit Button */}
                              {canEdit && (
                                <button 
                                  onClick={() => navigate(`/sales/${s.id}/edit`)} 
                                  className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" 
                                  title="Edit"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}

                              {/* Delete Button */}
                              {canDelete && (
                                <button 
                                  onClick={() => handleDeleteInvoice(s.id)} 
                                  className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" 
                                  title="Delete"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}

                              {/* Returned/Cancelled Badge */}
                              {s.status === 'returned' && (
                                <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap">
                                  Fully Returned
                                </span>
                              )}
                              {s.status === 'cancelled' && (
                                <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded whitespace-nowrap">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">{returns.length} return{returns.length !== 1 ? 's' : ''}</span>
            <button onClick={() => navigate('/sale-returns/create')} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">+ New Return</button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : returns.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No returns for this customer.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((r, idx) => {
                      const canEdit = r.status !== 'cancelled' && r.status !== 'returned';
                      const canDelete = r.status !== 'cancelled' && r.status !== 'returned';

                      const handleDeleteReturn = async (id) => {
                        if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) return;
                        try {
                          await api.delete(`/sale-returns/${id}`);
                          // Refresh returns
                          fetchTabData('returns');
                        } catch (err) {
                          alert(err.response?.data?.message || 'Delete failed');
                        }
                      };

                      const handleViewItems = (returnData) => {
                        api.get(`/sale-returns/${returnData.id}`)
                          .then(res => {
                            // You can open a modal here similar to the main page
                            // For simplicity, navigate to the view page or open modal
                            navigate(`/sale-returns/${returnData.id}`);
                          })
                          .catch(err => console.error('Error fetching return details:', err));
                      };

                      const getStatusBadge = (returnData) => {
                        // Check if there are any refunds
                        const hasRefunds = returnData.items?.some(item => 
                          item.refund_status && item.refund_status !== 'none'
                        );
                        
                        if (hasRefunds) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Processed
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
                        <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button onClick={() => navigate(`/sale-returns/${r.id}`)} className="font-medium text-[#007c89] hover:underline">
                              {r.reference_no}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                            {formatDate(r.return_date)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                            {r.sale?.reference_no || '—'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                            {r.customer?.name || r.sale?.customer?.name || '—'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium text-red-600">
                            {parseFloat(r.total_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">
                            {r.reason || '—'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            {getStatusBadge(r)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit */}
                              {canEdit && (
                                <button
                                  onClick={() => navigate(`/sale-returns/${r.id}/edit`)}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}

                              {/* Delete */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteReturn(r.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div>
          <div className="mb-3">
            <span className="text-sm text-gray-500">{payments.length} payment(s)</span>
          </div>
          {loadingTab ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No payments recorded yet.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Account</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-900">{p.account?.name || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => navigate(`/sales/${p.reference_id}`)} className="text-[#007c89] hover:underline">
                            #{p.reference_id}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-600">
                          +{parseFloat(p.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => navigate(`/sale-payment-receipt/${p.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title="View receipt"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal - Reusable Component */}
      <PaymentModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setSelectedInvoice(null);
        }}
        onSuccess={handlePaymentSuccess}
        entity={selectedInvoice}
        entityType="sale"
        endpoint={`/sales/${selectedInvoice?.id}/pay`}
        receiptPath="/sale-payment-receipt/:id"
      />
    </div>
  );
}