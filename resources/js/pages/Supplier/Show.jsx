import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import ProductsTab from './tabs/ProductsTab';
import { useTranslation } from 'react-i18next';

export default function SupplierShow() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Tab data
  const [purchases, setPurchases] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const [loadingTab, setLoadingTab] = useState(false);

  // Date filter state for all tabs
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Add these state variables
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchSupplier(); }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data);
    } catch (err) { navigate('/suppliers'); }
    finally { setLoading(false); }
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
        <span className="text-xs text-gray-400">{t('supplier.to')}</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]" />
        <button onClick={clearDateFilters} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">{t('supplier.clear')}</button>
      </div>
      <button onClick={() => handlePrint(tableId, title)}
        className="inline-flex items-center px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
        {t('supplier.print')}
      </button>
    </div>
  );

  const fetchTabData = async (tab) => {
    setLoadingTab(true);
    try {
      if (tab === 'purchases') {
        const res = await api.get('/purchases', { params: { supplier_id: id } });
        setPurchases(res.data?.data || []);
      } else if (tab === 'returns') {
        const res = await api.get('/purchase-returns');
        setReturns((res.data?.data || []).filter(r => r.purchase?.supplier_id == id));
      } else if (tab === 'payments') {
        const res = await api.get(`/suppliers/${id}/payments`, { params: { page: 1, per_page: 25 } });
        setPayments(res.data.data || []);
        setPaymentMeta(res.data);
        setPaymentPage(1);
      } else if (tab === 'products') {
        const res = await api.get('/purchases', { params: { supplier_id: id, per_page: 100 } });
        const purchases = res.data?.data || [];
        // Extract unique products from purchase items
        const productMap = {};
        purchases.forEach(purchase => {
          if (purchase.items) {
            purchase.items.forEach(item => {
              const productId = item.product_id;
              if (productId) {
                if (!productMap[productId]) {
                  productMap[productId] = {
                    id: productId,
                    name: item.product?.name || item.name || '—',
                    barcode: item.product?.barcode || '',
                    unit_price: item.unit_price,
                    total_quantity: 0,
                    total_cost: 0,
                    last_purchase: purchase.purchase_date,
                  };
                }
                productMap[productId].total_quantity += parseFloat(item.quantity) || 0;
                productMap[productId].total_cost += parseFloat(item.total) || 0;
                // Update last purchase date if newer
                if (purchase.purchase_date && new Date(purchase.purchase_date) > new Date(productMap[productId].last_purchase)) {
                  productMap[productId].last_purchase = purchase.purchase_date;
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
    if (!confirm(t('supplier.delete_confirm'))) return;
    try { await api.delete(`/suppliers/${id}`); navigate('/suppliers'); }
    catch (err) { alert(err.response?.data?.message || t('supplier.delete_failed')); }
  };

  const handleToggleStatus = async () => {
    try {
      await api.post(`/suppliers/${id}/toggle-status`);
      setSupplier(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) { alert(err.response?.data?.message || t('supplier.failed')); }
  };



  
const handleDeletePurchase = async (purchaseId) => {
  if (!confirm(t('supplier.delete_bill_confirm'))) return;
  try {
    await api.delete(`/purchases/${purchaseId}`);
    fetchTabData('purchases');
  } catch (err) {
    alert(err.response?.data?.message || 'Delete failed');
  }
};

const handleDeleteReturn = async (returnId) => {
  if (!confirm(t('supplier.delete_return_confirm'))) return;
  try {
    await api.delete(`/purchase-returns/${returnId}`);
    fetchTabData('returns');
  } catch (err) {
    alert(err.response?.data?.message || 'Delete failed');
  }
};

const handleReturn = (purchaseId) => {
  navigate(`/purchase-returns/create?purchase_id=${purchaseId}`);
};

const openPayModal = (purchase) => {
  if (purchase.refund_status === 'full') return;
  setSelectedPurchase(purchase);
  const unpaidAmt = parseFloat(purchase.total_amount) - parseFloat(purchase.paid_amount);
  setPayAmount(unpaidAmt > 0 ? String(unpaidAmt) : '');
  setPayAccountId(purchase.account_id || '');
  fetchAccounts();
  setShowPayModal(true);
};

const fetchAccounts = async () => {
  try {
    const res = await api.get('/accounts');
    const accs = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    setAccounts(accs);
  } catch (err) { console.error('Failed to fetch accounts:', err); }
};

const handlePay = async () => {
  if (!selectedPurchase || !payAmount || !payAccountId) return;
  setPaying(true);
  try {
    const res = await api.post(`/purchases/${selectedPurchase.id}/pay`, {
      amount: parseFloat(payAmount),
      account_id: parseInt(payAccountId),
    });
    const transactionId = res.data.transaction_id;
    setShowPayModal(false);
    setSelectedPurchase(null);
    setPayAmount('');
    setPayAccountId('');
    // Refetch payments and purchases
    if (activeTab === 'payments') fetchTabData('payments');
    if (activeTab === 'purchases') fetchTabData('purchases');
    // Navigate to receipt if transaction was created
    if (transactionId) {
      navigate(`/payment-receipt/${transactionId}`);
    } else {
      alert(t('supplier.payment_recorded'));
    }
  } catch (err) {
    console.error('Payment error:', err);
    alert(err.response?.data?.message || t('supplier.payment_failed'));
  } finally {
    setPaying(false);
  }
};

  const tabs = [
    { id: 'info', label: t('supplier.tab_info') },
    { id: 'purchases', label: t('supplier.tab_bills') },
    { id: 'products', label: t('supplier.tab_products') },
    { id: 'returns', label: t('supplier.tab_returns') },
    { id: 'payments', label: t('supplier.tab_payments') },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">{t('supplier.loading_supplier')}</div>;
  if (!supplier) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline">&larr; {t('back')}</button>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mt-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{supplier.first_name} {supplier.last_name}</h1>
            <p className="text-sm text-gray-500">{t('supplier.code_header', { code: supplier.supplier_code })} | {supplier.is_active ? t('supplier.active') : t('supplier.inactive')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(`/suppliers/${id}/edit`)}
              className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]">{t('supplier.edit')}</button>
            <button onClick={handleToggleStatus}
              className={`px-4 py-2 text-sm rounded-md ${supplier.is_active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              {supplier.is_active ? t('supplier.deactivate') : t('supplier.activate')}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50">{t('supplier.delete')}</button>
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

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">{t('supplier.info')}</h2></div>
              <div className="p-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.col_code')}</dt><dd className="text-gray-900 font-mono">{supplier.supplier_code}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.contact_person')}</dt><dd className="text-gray-900">{supplier.contact_person || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.phone')}</dt><dd className="text-gray-900">{supplier.phone || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.email')}</dt><dd className="text-gray-900">{supplier.email || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.city')}</dt><dd className="text-gray-900">{supplier.city || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">{t('supplier.country')}</dt><dd className="text-gray-900">{supplier.country || '—'}</dd></div>
                </dl>
              </div>
            </div>
            {supplier.address && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">{t('supplier.address')}</h2></div>
                <div className="p-4"><p className="text-sm text-gray-900">{supplier.address}</p></div>
              </div>
            )}
            {supplier.note && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">{t('supplier.notes')}</h2></div>
                <div className="p-4"><p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.note}</p></div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">{t('supplier.audit')}</h3></div>
              <div className="p-4 space-y-1 text-sm">
                <div><span className="text-gray-500">{t('supplier.created')} </span>{new Date(supplier.created_at).toLocaleDateString()}</div>
                <div><span className="text-gray-500">{t('supplier.updated')} </span>{new Date(supplier.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div>
          <DateFilterBar tableId="supplier-bills-table" title={t('supplier.bills_title')} />
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{purchases.filter(p => {
              if (!dateFrom && !dateTo) return true;
              const d = new Date(p.purchase_date);
              if (dateFrom && d < new Date(dateFrom)) return false;
              if (dateTo && d > new Date(dateTo)) return false;
              return true;
            }).length} {t('supplier.bill_label')}</span>
            <button onClick={() => navigate(`/purchases/create?supplier_id=${id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              {t('supplier.new_bill')}
            </button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.loading_short')}</div> : purchases.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.no_bills')}</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div id="supplier-bills-table" className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.bill_no')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.date')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.status')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.total')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.paid')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.due')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">{t('supplier.payment')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">{t('supplier.refund')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.filter(p => {
                      if (!dateFrom && !dateTo) return true;
                      const d = new Date(p.purchase_date);
                      if (dateFrom && d < new Date(dateFrom)) return false;
                      if (dateTo && d > new Date(dateTo)) return false;
                      return true;
                    }).map((p, idx) => {
                      const canAct = p.refund_status !== 'full';
                      const canPay = canAct && p.payment_status !== 'paid';
                      const canEdit = canAct && p.payment_status === 'unpaid';
                      const canDelete = canAct && p.payment_status === 'unpaid';
                      const canReturn = canAct && p.payment_status !== 'unpaid' && p.refund_status !== 'full';

                      const refundColors = { none: 'bg-gray-100 text-gray-500', partial: 'bg-yellow-100 text-yellow-700', full: 'bg-purple-100 text-purple-700' };

                      const refundBadge = (status) => {
                        const sd = status || 'none';
                        const labels = { none: t('purchase.refund_none'), partial: t('purchase.refund_partial'), full: t('purchase.refund_full') };
                        return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${refundColors[sd]}`}>{labels[sd] || sd.toUpperCase()}</span>;
                      };

                      const badgeClass = (ps) => ps === 'paid' ? 'bg-green-100 text-green-700' : ps === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

                      return (
                        <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                          <td className="px-4 py-2.5"><button onClick={() => navigate(`/purchases/${p.id}`)} className="text-[#007c89] hover:underline font-medium">{p.reference_no || `#${p.id}`}</button></td>
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{(p.purchase_date || '').split('T')[0]}</td>
                          <td className="px-4 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass(p.payment_status)}`}>{({ unpaid: t('payment.unpaid'), partial: t('payment.partial'), paid: t('payment.paid') })[p.payment_status] || (p.payment_status || '').toUpperCase()}</span></td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900">{parseFloat(p.total_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600 font-medium">{parseFloat(p.paid_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-red-600 font-medium">{parseFloat(p.due_amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass(p.payment_status)}`}>{({ unpaid: t('payment.unpaid'), partial: t('payment.partial'), paid: t('payment.paid') })[p.payment_status] || (p.payment_status || '').toUpperCase()}</span></td>
                          <td className="px-4 py-2.5 text-center">{refundBadge(p.refund_status)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/purchases/${p.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600" title={t('supplier.view')}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button onClick={() => navigate(`/purchases/${p.id}/invoice`)} className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" title={t('supplier.download_bill')}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </button>
                              {canReturn && <button onClick={() => navigate(`/purchase-returns/create?purchase_id=${p.id}`)} className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">{t('supplier.return_btn')}</button>}
                              {canPay && <button onClick={() => openPayModal(p)} className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors">{t('supplier.pay_btn')}</button>}
                              {canEdit && <button onClick={() => navigate(`/purchases/${p.id}/edit`)} className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600" title={t('supplier.edit')}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>}
                              {canDelete && <button onClick={() => handleDeletePurchase(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600" title={t('supplier.delete')}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>}
                              {p.refund_status === 'full' && <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded whitespace-nowrap">{t('supplier.fully_refunded')}</span>}
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
                {purchases.filter(p => {
                  if (!dateFrom && !dateTo) return true;
                  const d = new Date(p.purchase_date);
                  if (dateFrom && d < new Date(dateFrom)) return false;
                  if (dateTo && d > new Date(dateTo)) return false;
                  return true;
                }).map((p) => {
                  const canAct = p.refund_status !== 'full';
                  const canPay = canAct && p.payment_status !== 'paid';
                  const canEdit = canAct && p.payment_status === 'unpaid';
                  const canDelete = canAct && p.payment_status === 'unpaid';
                  const canReturn = canAct && p.payment_status !== 'unpaid' && p.refund_status !== 'full';

                  const badgeClass = (ps) => ps === 'paid' ? 'bg-green-100 text-green-700' : ps === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
                  const refundColors = { none: 'bg-gray-100 text-gray-500', partial: 'bg-yellow-100 text-yellow-700', full: 'bg-purple-100 text-purple-700' };

                  return (
                    <div key={p.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button onClick={() => navigate(`/purchases/${p.id}`)} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{p.reference_no || `#${p.id}`}</button>
                          <span className="text-xs text-gray-500">{(p.purchase_date || '').split('T')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass(p.payment_status)}`}>{({ unpaid: t('payment.unpaid'), partial: t('payment.partial'), paid: t('payment.paid') })[p.payment_status] || (p.payment_status || '').toUpperCase()}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${refundColors[p.refund_status || 'none']}`}>{({ none: t('purchase.refund_none'), partial: t('purchase.refund_partial'), full: t('purchase.refund_full') })[p.refund_status || 'none']}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><span className="text-[10px] text-gray-400 uppercase block">{t('supplier.total')}</span><span className="font-semibold text-gray-900">{parseFloat(p.total_amount).toFixed(2)}</span></div>
                        <div><span className="text-[10px] text-gray-400 uppercase block">{t('supplier.paid')}</span><span className="font-medium text-green-600">{parseFloat(p.paid_amount).toFixed(2)}</span></div>
                        <div><span className="text-[10px] text-gray-400 uppercase block">{t('supplier.due')}</span><span className="font-medium text-red-600">{parseFloat(p.due_amount).toFixed(2)}</span></div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button onClick={() => navigate(`/purchases/${p.id}`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">{t('supplier.view')}</button>
                        {canPay && <button onClick={() => openPayModal(p)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">{t('supplier.pay_btn')}</button>}
                        {canReturn && <button onClick={() => navigate(`/purchase-returns/create?purchase_id=${p.id}`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">{t('supplier.return_btn')}</button>}
                        {canEdit && <button onClick={() => navigate(`/purchases/${p.id}/edit`)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">{t('supplier.edit')}</button>}
                        {canDelete && <button onClick={() => handleDeletePurchase(p.id)} className="flex-1 min-w-[60px] inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">{t('supplier.delete')}</button>}
                        {p.refund_status === 'full' && <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{t('supplier.fully_refunded')}</span>}
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
            <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.loading_short')}</div>
          ) : (
            <ProductsTab products={products} />
          )}
        </div>
      )}

{activeTab === 'returns' && (
  <div>
    <DateFilterBar tableId="supplier-returns-table" title={t('supplier.returns_title')} />
    <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <span className="text-sm text-gray-500">{returns.filter(r => {
        if (!dateFrom && !dateTo) return true;
        const d = new Date(r.return_date);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo)) return false;
        return true;
      }).length} {t('supplier.return_label')}</span>
      <button onClick={() => navigate(`/purchase-returns/create?supplier_id=${id}`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors w-fit">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        {t('supplier.new_return')}
      </button>
    </div>
    {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.loading_short')}</div> : returns.length === 0 ? (
      <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.no_returns')}</div>
    ) : (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div id="supplier-returns-table" className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.reference')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.date')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.po')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.amount')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.reason')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">{t('supplier.status')}</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">{t('supplier.actions')}</th>
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
                const refundStatus = r.purchase?.refund_status || 'none';
                const getStatusBadge = () => {
                  const c = refundStatus === 'full' ? 'bg-purple-100 text-purple-700' : refundStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';
                  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c}`}>{(refundStatus === 'full' ? t('supplier.full_return') : refundStatus === 'partial' ? t('supplier.partial_return') : t('supplier.returned'))}</span>;
                };
                return (
                  <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 whitespace-nowrap"><button onClick={() => navigate(`/purchase-returns/${r.id}`)} className="font-medium text-[#007c89] hover:underline">{r.reference_no}</button></td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{new Date(r.return_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{r.purchase?.reference_no || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.reason || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">{getStatusBadge()}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/purchase-returns/${r.id}/edit`)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title={t('supplier.edit')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteReturn(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title={t('supplier.delete')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
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
            const refundStatus = r.purchase?.refund_status || 'none';
            const c = refundStatus === 'full' ? 'bg-purple-100 text-purple-700' : refundStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';
            return (
              <div key={r.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/purchase-returns/${r.id}`)} className="text-sm font-semibold text-gray-900 hover:text-[#007c89] truncate block">{r.reference_no}</button>
                    <span className="text-xs text-gray-500 block">{new Date(r.return_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${c}`}>{(refundStatus === 'full' ? t('supplier.full_return') : refundStatus === 'partial' ? t('supplier.partial_return') : t('supplier.returned'))}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">                          <span className="text-gray-400 text-xs">{t('supplier.po')}</span><span className="text-gray-700">{r.purchase?.reference_no || '—'}</span></div>
                  <div className="flex items-center justify-between">                          <span className="text-gray-400 text-xs">{t('supplier.amount')}</span><span className="font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</span></div>
                  {r.reason && <div className="flex items-center justify-between">                          <span className="text-gray-400 text-xs">{t('supplier.reason')}</span><span className="text-gray-700 text-right truncate max-w-[55%]">{r.reason}</span></div>}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => navigate(`/purchase-returns/${r.id}`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">{t('supplier.view')}</button>
                  <button onClick={() => navigate(`/purchase-returns/${r.id}/edit`)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">{t('supplier.edit')}</button>
                  <button onClick={() => handleDeleteReturn(r.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">{t('supplier.delete')}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
)}

      {activeTab === 'payments' && (
        <div>
          <DateFilterBar tableId="supplier-payments-table" title={t('supplier.payments_title')} />
          {loadingTab ? (
            <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.loading_short')}</div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">{t('supplier.no_payments')}</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Desktop Table */}
              <div id="supplier-payments-table" className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.date')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.wallet')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.reference')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.amount')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">{t('supplier.description')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">{t('supplier.balance_after')}</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">{t('supplier.receipt')}</th>
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
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-2.5"><span className="text-gray-900">{p.account?.name || '—'}</span></td>
                        <td className="px-4 py-2.5"><button onClick={() => navigate(`/purchases/${p.reference_id}`)} className="text-[#007c89] hover:underline">{p.reference?.reference_no || `#${p.reference_id}`}</button></td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">-{parseFloat(p.amount).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">{p.description || '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{parseFloat(p.balance_after).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => navigate(`/payment-receipt/${p.id}`)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title={t('supplier.view_receipt')}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            {t('supplier.receipt')}
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
                        <span className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="text-sm text-gray-900 mt-0.5">{p.account?.name || '—'}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-600 flex-shrink-0">-{parseFloat(p.amount).toFixed(2)}</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t('supplier.reference')}</span>
                        <button onClick={() => navigate(`/purchases/${p.reference_id}`)} className="text-xs text-[#007c89] hover:underline">{p.reference?.reference_no || `#${p.reference_id}`}</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t('supplier.balance')}</span>
                        <span className="text-gray-700">{parseFloat(p.balance_after).toFixed(2)}</span>
                      </div>
                      {p.description && <div className="flex items-center justify-between"><span className="text-gray-400 text-xs">{t('supplier.description')}</span><span className="text-gray-600 text-right truncate max-w-[55%]">{p.description}</span></div>}
                    </div>
                    <button onClick={() => navigate(`/payment-receipt/${p.id}`)} className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      {t('supplier.view_receipt_btn')}
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {paymentMeta && paymentMeta.last_page > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-100 gap-3">
                  <div className="text-xs text-gray-500">
                    {t('supplier.showing_payments', { from: paymentMeta.from || 0, to: paymentMeta.to || 0, total: paymentMeta.total || 0 })}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={async () => { const np = paymentPage - 1; if (np < 1) return; const r = await api.get(`/suppliers/${id}/payments`, { params: { page: np, per_page: 25 } }); setPayments(r.data.data || []); setPaymentMeta(r.data); setPaymentPage(np); }}
                      disabled={paymentPage === 1} className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {t('supplier.previous')}
                    </button>
                    <span className="text-xs text-gray-600 px-2">{paymentPage} / {paymentMeta.last_page}</span>
                    <button onClick={async () => { const np = paymentPage + 1; if (np > paymentMeta.last_page) return; const r = await api.get(`/suppliers/${id}/payments`, { params: { page: np, per_page: 25 } }); setPayments(r.data.data || []); setPaymentMeta(r.data); setPaymentPage(np); }}
                      disabled={paymentPage === paymentMeta.last_page} className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {t('supplier.next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Payment Modal */}
{showPayModal && selectedPurchase && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayModal(false)}></div>
    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('supplier.make_payment')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{selectedPurchase.reference_no || `Bill #${selectedPurchase.id}`}</p>
        </div>
        <button onClick={() => setShowPayModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('supplier.total')}</p>
              <p className="text-lg font-bold text-gray-900">{parseFloat(selectedPurchase.total_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('supplier.paid')}</p>
              <p className="text-lg font-bold text-green-600">{parseFloat(selectedPurchase.paid_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">{t('supplier.due')}</p>
              <p className="text-lg font-bold text-red-600">{selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)).toFixed(2) : '0.00'}</p>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('supplier.wallet_required')}</label>
          <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]">
            <option value="">{t('supplier.select_wallet')}</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{t('supplier.payment_amount')}</label>
          <input type="number" step="0.01" min="0.01" max={selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)) : 0} value={payAmount} onChange={e => setPayAmount(e.target.value)}
            placeholder="0.00" className="w-full px-3 py-2.5 text-lg font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007c89]" />
          <p className="text-xs text-gray-400 mt-1">{t('supplier.maximum', { max: selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)).toFixed(2) : '0.00' })}</p>
        </div>          <div className="flex gap-2">
            <button type="button" onClick={() => { const u = selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)) : 0; setPayAmount(String(Math.min(u, 100))); }} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">100</button>
            <button type="button" onClick={() => { const u = selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)) : 0; setPayAmount(String(Math.min(u, 500))); }} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">500</button>
            <button type="button" onClick={() => { const u = selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)) : 0; setPayAmount(String(Math.min(u, 1000))); }} className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">1000</button>
            <button type="button" onClick={() => { const u = selectedPurchase ? (parseFloat(selectedPurchase.total_amount) - parseFloat(selectedPurchase.paid_amount)) : 0; setPayAmount(String(u)); }} className="flex-1 py-1.5 text-xs font-medium bg-[#007c89]/10 text-[#007c89] rounded-md hover:bg-[#007c89]/20">{t('supplier.full_amount')}</button>
          </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
        <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">{t('cancel')}</button>
        <button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0 || !payAccountId}
          className="px-6 py-2 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50">
          {paying ? t('supplier.processing') : t('supplier.confirm_payment')}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
