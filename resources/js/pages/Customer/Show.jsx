import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import PaymentModal from '../../components/PaymentModal';
import ProductsTab from './tabs/ProductsTab';

export default function CustomerShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  const [invoices, setInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const [loadingTab, setLoadingTab] = useState(false);

  // Date filter state for all tabs
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  const handlePrint = (tableId, title) => {
    const printContent = document.getElementById(tableId);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
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
            <h2>${title}</h2>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          ${printContent ? printContent.innerHTML : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const clearDateFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const DateFilterBar = ({ tableId, title }) => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
      <div className="flex items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]" />
        <button onClick={clearDateFilters} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">Clear</button>
      </div>
      <button onClick={() => handlePrint(tableId, title)}
        className="inline-flex items-center px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
        Print
      </button>
    </div>
  );

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
      } else if (tab === 'products') {
        const res = await api.get('/sales', { params: { customer_id: id, per_page: 100 } });
        const sales = res.data?.data || [];
        // Extract unique products from sale items
        const productMap = {};
        sales.forEach(sale => {
          if (sale.items) {
            sale.items.forEach(item => {
              const productId = item.product_id;
              if (productId) {
                if (!productMap[productId]) {
                  productMap[productId] = {
                    id: productId,
                    name: item.product?.name || item.name || '—',
                    barcode: item.product?.barcode || '',
                    unit_price: item.unit_price,
                    total_quantity: 0,
                    total_spent: 0,
                    last_purchase: sale.document_date,
                  };
                }
                productMap[productId].total_quantity += parseFloat(item.quantity) || 0;
                productMap[productId].total_spent += parseFloat(item.total) || 0;
                // Update last purchase date if newer
                if (sale.document_date && new Date(sale.document_date) > new Date(productMap[productId].last_purchase)) {
                  productMap[productId].last_purchase = sale.document_date;
                }
              }
            });
          }
        });
        setProducts(Object.values(productMap));
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

  const handleConvertToCustomer = async () => {
    if (!confirm('Convert this lead to a customer?\n\nPending orders will be converted to invoices.')) return;
    try {
      const res = await api.post(`/customers/${id}/convert-to-customer`);
      setCustomer(res.data.data);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert lead.');
    }

  };

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
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'products', label: 'Products' },
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
        <button onClick={() => navigate('/customers')} className="text-sm text-[#007c89] hover:underline">&larr; Back</button>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mt-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{customer.first_name} {customer.last_name}</h1>
            <p className="text-sm text-gray-500">Code: {customer.user_code} | {customer.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <DateFilterBar tableId="customer-invoices-table" title="Customer Invoices" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">{invoices.filter(s => {
              if (!dateFrom && !dateTo) return true;
              const d = new Date(s.document_date);
              if (dateFrom && d < new Date(dateFrom)) return false;
              if (dateTo && d > new Date(dateTo)) return false;
              return true;
            }).length} invoice(s)</span>
            <button onClick={() => navigate('/sales/create')} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">+ New Invoice</button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : invoices.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No invoices for this customer.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div id="customer-invoices-table" className="hidden sm:block overflow-x-auto">
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
                    {invoices.filter(s => {
                      if (!dateFrom && !dateTo) return true;
                      const d = new Date(s.document_date);
                      if (dateFrom && d < new Date(dateFrom)) return false;
                      if (dateTo && d > new Date(dateTo)) return false;
                      return true;
                    }).map((s, idx) => {
                      const canAct = s.status !== 'cancelled' && s.status !== 'returned';
                      const canPay = canAct && s.payment_status !== 'paid';
                      const canReturn = canAct && s.status === 'confirmed';
                      const canEdit = canAct && s.payment_status !== 'paid';
                      const canDelete = canAct && s.payment_status !== 'paid';

                      const statusColors = { draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700', cancelled: 'bg-orange-100 text-orange-700', returned: 'bg-purple-100 text-purple-700' };
                      const paymentColors = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700' };

                      const statusBadge = (status) => (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>{status?.toUpperCase()}</span>
                      );

                      const handleDeleteInvoice = async (id) => {
                        if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
                        try { await api.delete(`/sales/${id}`); fetchTabData('invoices'); } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
                      };

                      return (
                        <tr key={s.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors ${s.status === 'returned' || s.status === 'cancelled' ? 'opacity-75' : ''}`}>
                          <td className="px-4 py-2.5"><button onClick={() => navigate(`/sales/${s.id}`)} className="text-[#007c89] hover:underline font-medium">{s.reference_no}</button></td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{s.document_date?.split('T')[0] || s.document_date}</td>
                          <td className="px-4 py-2.5">{statusBadge(s.status)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">{parseFloat(s.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">{parseFloat(s.paid_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-red-600 font-medium">{parseFloat(s.due_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentColors[s.payment_status] || 'bg-gray-100 text-gray-700'}`}>{s.payment_status?.toUpperCase()}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/sales/${s.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600" title="View">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button onClick={() => navigate(`/sales/${s.id}/invoice`)} className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" title="Download">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </button>
                              {canReturn && <button onClick={() => navigate(`/sale-returns/create?sale_id=${s.id}`)} className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">Return</button>}
                              {canPay && <button onClick={() => openPayModal(s)} className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">Pay</button>}
                              {canEdit && <button onClick={() => navigate(`/sales/${s.id}/edit`)} className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title="Edit">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>}
                              {canDelete && <button onClick={() => handleDeleteInvoice(s.id)} className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>}
                              {s.status === 'returned' && <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap">Fully Returned</span>}
                              {s.status === 'cancelled' && <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded whitespace-nowrap">Cancelled</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {invoices.filter(s => {
                  if (!dateFrom && !dateTo) return true;
                  const d = new Date(s.document_date);
                  if (dateFrom && d < new Date(dateFrom)) return false;
                  if (dateTo && d > new Date(dateTo)) return false;
                  return true;
                }).map((s) => {
                  const canAct = s.status !== 'cancelled' && s.status !== 'returned';
                  const canPay = canAct && s.payment_status !== 'paid';
                  const canReturn = canAct && s.status === 'confirmed';
                  const canEdit = canAct && s.payment_status !== 'paid';
                  const canDelete = canAct && s.payment_status !== 'paid';

                  const statusColors = { draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700', cancelled: 'bg-orange-100 text-orange-700', returned: 'bg-purple-100 text-purple-700' };
                  const paymentColors = { unpaid: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700' };

                  const handleDeleteInvoice = async (id) => {
                    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
                    try { await api.delete(`/sales/${id}`); fetchTabData('invoices'); } catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
                  };

                  return (
                    <div key={s.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button onClick={() => navigate(`/sales/${s.id}`)} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{s.reference_no}</button>
                          <span className="text-xs text-gray-500">{s.document_date?.split('T')[0] || s.document_date}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>{s.status?.toUpperCase()}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentColors[s.payment_status] || 'bg-gray-100 text-gray-700'}`}>{s.payment_status?.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-[10px] text-gray-400 uppercase block">Total</span><span className="font-semibold text-gray-900">{parseFloat(s.total_amount).toFixed(2)}</span></div>
                        <div><span className="text-[10px] text-gray-400 uppercase block">Paid</span><span className="font-medium text-green-600">{parseFloat(s.paid_amount).toFixed(2)}</span></div>
                        <div><span className="text-[10px] text-gray-400 uppercase block">Due</span><span className="font-medium text-red-600">{parseFloat(s.due_amount).toFixed(2)}</span></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button onClick={() => navigate(`/sales/${s.id}`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">View</button>
                        {canPay && <button onClick={() => openPayModal(s)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">Pay</button>}
                        {canReturn && <button onClick={() => navigate(`/sale-returns/create?sale_id=${s.id}`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">Return</button>}
                        {canEdit && <button onClick={() => navigate(`/sales/${s.id}/edit`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">Edit</button>}
                        {canDelete && <button onClick={() => handleDeleteInvoice(s.id)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">Delete</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && (
        <div>
          <DateFilterBar tableId="customer-returns-table" title="Customer Returns" />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">{returns.filter(r => {
              if (!dateFrom && !dateTo) return true;
              const d = new Date(r.return_date);
              if (dateFrom && d < new Date(dateFrom)) return false;
              if (dateTo && d > new Date(dateTo)) return false;
              return true;
            }).length} return(s)</span>
            <button onClick={() => navigate('/sale-returns/create')} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">+ New Return</button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : returns.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No returns for this customer.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div id="customer-returns-table" className="hidden sm:block overflow-x-auto">
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
                    {returns.filter(r => {
                      if (!dateFrom && !dateTo) return true;
                      const d = new Date(r.return_date);
                      if (dateFrom && d < new Date(dateFrom)) return false;
                      if (dateTo && d > new Date(dateTo)) return false;
                      return true;
                    }).map((r, idx) => {
                      const canEdit = r.status !== 'cancelled' && r.status !== 'returned';
                      const canDelete = r.status !== 'cancelled' && r.status !== 'returned';

                      const handleDeleteReturn = async (id) => {
                        if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) return;
                        try { await api.delete(`/sale-returns/${id}`); fetchTabData('returns'); }
                        catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
                      };

                      const getStatusBadge = (returnData) => {
                        const hasRefunds = returnData.items?.some(item =>
                          item.refund_status && item.refund_status !== 'none'
                        );
                        if (hasRefunds) {
                          return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            Processed
                          </span>;
                        }
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Returned
                        </span>;
                      };

                      return (
                        <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button onClick={() => navigate(`/sale-returns/${r.id}`)} className="font-medium text-[#007c89] hover:underline">{r.reference_no}</button>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{formatDate(r.return_date)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{r.sale?.reference_no || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{r.customer?.name || r.sale?.customer?.name || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-gray-700">{r.reason || '—'}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">{getStatusBadge(r)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canEdit && (
                                <button onClick={() => navigate(`/sale-returns/${r.id}/edit`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDeleteReturn(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {returns.filter(r => {
                  if (!dateFrom && !dateTo) return true;
                  const d = new Date(r.return_date);
                  if (dateFrom && d < new Date(dateFrom)) return false;
                  if (dateTo && d > new Date(dateTo)) return false;
                  return true;
                }).map((r) => {
                  const canEdit = r.status !== 'cancelled' && r.status !== 'returned';
                  const canDelete = r.status !== 'cancelled' && r.status !== 'returned';

                  const handleDeleteReturn = async (id) => {
                    if (!confirm('Are you sure you want to delete this return? This action cannot be undone.')) return;
                    try { await api.delete(`/sale-returns/${id}`); fetchTabData('returns'); }
                    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
                  };

                  const getStatusBadgeMobile = (returnData) => {
                    const hasRefunds = returnData.items?.some(item =>
                      item.refund_status && item.refund_status !== 'none'
                    );
                    if (hasRefunds) {
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">✅ Processed</span>;
                    }
                    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">↩️ Returned</span>;
                  };

                  return (
                    <div key={r.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button onClick={() => navigate(`/sale-returns/${r.id}`)} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{r.reference_no}</button>
                          <span className="text-xs text-gray-500">{formatDate(r.return_date)}</span>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadgeMobile(r)}</div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Invoice</span>
                          <span className="text-gray-700">{r.sale?.reference_no || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-xs">Amount</span>
                          <span className="font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</span>
                        </div>
                        {r.reason && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-xs">Reason</span>
                            <span className="text-gray-700 text-right truncate max-w-[55%]">{r.reason}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => navigate(`/sale-returns/${r.id}`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">View</button>
                        {canEdit && <button onClick={() => navigate(`/sale-returns/${r.id}/edit`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">Edit</button>}
                        {canDelete && <button onClick={() => handleDeleteReturn(r.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">Delete</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {loadingTab ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : (
            <ProductsTab products={products} />
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div>
          <DateFilterBar tableId="customer-payments-table" title="Customer Payments" />
          <div className="mb-3">
            <span className="text-sm text-gray-500">{payments.filter(p => {
              if (!dateFrom && !dateTo) return true;
              const d = new Date(p.created_at);
              if (dateFrom && d < new Date(dateFrom)) return false;
              if (dateTo && d > new Date(dateTo)) return false;
              return true;
            }).length} payment(s)</span>
          </div>
          {loadingTab ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No payments recorded yet.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div id="customer-payments-table" className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Wallet</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => {
                      if (!dateFrom && !dateTo) return true;
                      const d = new Date(p.created_at);
                      if (dateFrom && d < new Date(dateFrom)) return false;
                      if (dateTo && d > new Date(dateTo)) return false;
                      return true;
                    }).map((p, idx) => (
                      <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5"><span className="text-gray-900">{p.account?.name || '—'}</span></td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => navigate(`/sales/${p.reference_id}`)} className="text-[#007c89] hover:underline">#{p.reference_id}</button>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-600">+{parseFloat(p.amount).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => navigate(`/sale-payment-receipt/${p.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title="View receipt">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {payments.filter(p => {
                  if (!dateFrom && !dateTo) return true;
                  const d = new Date(p.created_at);
                  if (dateFrom && d < new Date(dateFrom)) return false;
                  if (dateTo && d > new Date(dateTo)) return false;
                  return true;
                }).map((p) => (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="text-sm text-gray-900 mt-0.5">{p.account?.name || '—'}</div>
                      </div>
                      <span className="text-sm font-semibold text-green-600 flex-shrink-0">+{parseFloat(p.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => navigate(`/sales/${p.reference_id}`)} className="text-xs text-[#007c89] hover:underline">Invoice #{p.reference_id}</button>
                      <button onClick={() => navigate(`/sale-payment-receipt/${p.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
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
