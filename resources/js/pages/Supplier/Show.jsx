import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SupplierShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Tab data
  const [purchases, setPurchases] = useState([]);
  const [returns, setReturns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentMeta, setPaymentMeta] = useState(null);
  const [paymentPage, setPaymentPage] = useState(1);
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => { fetchSupplier(); }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data.data);
    } catch (err) { navigate('/suppliers'); }
    finally { setLoading(false); }
  };

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
      }
    } catch (err) { console.error(err); }
    finally { setLoadingTab(false); }
  };

  useEffect(() => {
    if (activeTab !== 'info') fetchTabData(activeTab);
  }, [activeTab, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this supplier?')) return;
    try { await api.delete(`/suppliers/${id}`); navigate('/suppliers'); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleToggleStatus = async () => {
    try {
      await api.post(`/suppliers/${id}/toggle-status`);
      setSupplier(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'purchases', label: 'Bills' },
    { id: 'returns', label: 'Returns' },
    { id: 'payments', label: 'Payments' },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">Loading supplier...</div>;
  if (!supplier) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <button onClick={() => window.history.go(-1)} className="text-sm text-[#007c89] hover:underline">&larr; Back</button>
        <div className="flex justify-between items-start mt-1">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{supplier.first_name} {supplier.last_name}</h1>
            <p className="text-sm text-gray-500">Code: {supplier.supplier_code} | {supplier.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/suppliers/${id}/edit`)}
              className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]">Edit</button>
            <button onClick={handleToggleStatus}
              className={`px-4 py-2 text-sm rounded-md ${supplier.is_active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
              {supplier.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50">Delete</button>
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
              <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Supplier Information</h2></div>
              <div className="p-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-gray-500 uppercase">Code</dt><dd className="text-gray-900 font-mono">{supplier.supplier_code}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Contact Person</dt><dd className="text-gray-900">{supplier.contact_person || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Phone</dt><dd className="text-gray-900">{supplier.phone || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="text-gray-900">{supplier.email || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">City</dt><dd className="text-gray-900">{supplier.city || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-500 uppercase">Country</dt><dd className="text-gray-900">{supplier.country || '—'}</dd></div>
                </dl>
              </div>
            </div>
            {supplier.address && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Address</h2></div>
                <div className="p-4"><p className="text-sm text-gray-900">{supplier.address}</p></div>
              </div>
            )}
            {supplier.note && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200"><h2 className="text-sm font-semibold text-gray-900">Notes</h2></div>
                <div className="p-4"><p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.note}</p></div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-900">Audit</h3></div>
              <div className="p-4 space-y-1 text-sm">
                <div><span className="text-gray-500">Created: </span>{new Date(supplier.created_at).toLocaleDateString()}</div>
                <div><span className="text-gray-500">Updated: </span>{new Date(supplier.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{purchases.length} bill(s)</span>
            <button onClick={() => navigate(`/purchases/create?supplier_id=${id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              New Bill
            </button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : purchases.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No bills for this supplier.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Bill #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Due</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr></thead>
                <tbody>{purchases.map((p, idx) => (
                  <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                    <td className="px-4 py-2.5"><button onClick={() => navigate(`/purchases/${p.id}`)} className="text-[#007c89] hover:underline">{p.reference_no || `#${p.id}`}</button></td>
                    <td className="px-4 py-2.5 text-gray-700">{(p.purchase_date || '').split('T')[0]}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{parseFloat(p.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{parseFloat(p.due_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.payment_status?.toUpperCase()}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => navigate(`/purchases/${p.id}/invoice`)} className="p-1 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900" title="Download Bill">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'returns' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{returns.length} return(s)</span>
            <button onClick={() => navigate(`/purchase-returns/create?supplier_id=${id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              New Return
            </button>
          </div>
          {loadingTab ? <div className="py-8 text-center text-gray-500 text-sm">Loading...</div> : returns.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">No returns for this supplier.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">PO Reference</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                </tr></thead>
                <tbody>{returns.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                    <td className="px-4 py-2.5 font-medium">{r.reference_no}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.return_date}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.purchase?.reference_no || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.reason || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
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
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Balance After</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr key={p.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-900">{p.account?.name || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate(`/purchases/${p.reference_id}`)}
                            className="text-[#007c89] hover:underline"
                          >
                            {p.reference?.reference_no || `#${p.reference_id}`}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">
                          -{parseFloat(p.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate">
                          {p.description || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          {parseFloat(p.balance_after).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => navigate(`/payment-receipt/${p.id}`)}
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

              {/* Pagination */}
              {paymentMeta && paymentMeta.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Showing {paymentMeta.from || 0} to {paymentMeta.to || 0} of {paymentMeta.total || 0} payments
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        const newPage = paymentPage - 1;
                        if (newPage < 1) return;
                        const res = await api.get(`/suppliers/${id}/payments`, { params: { page: newPage, per_page: 25 } });
                        setPayments(res.data.data || []);
                        setPaymentMeta(res.data);
                        setPaymentPage(newPage);
                      }}
                      disabled={paymentPage === 1}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-600 px-2">
                      {paymentPage} / {paymentMeta.last_page}
                    </span>
                    <button
                      onClick={async () => {
                        const newPage = paymentPage + 1;
                        if (newPage > paymentMeta.last_page) return;
                        const res = await api.get(`/suppliers/${id}/payments`, { params: { page: newPage, per_page: 25 } });
                        setPayments(res.data.data || []);
                        setPaymentMeta(res.data);
                        setPaymentPage(newPage);
                      }}
                      disabled={paymentPage === paymentMeta.last_page}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
