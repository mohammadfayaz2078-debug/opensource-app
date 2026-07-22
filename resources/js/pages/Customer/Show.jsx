import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

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

  useEffect(() => { fetchCustomer(); }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.data);
    } catch (err) { navigate('/customers'); }
    finally { setLoading(false); }
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
        // First get customer's invoice IDs
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

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'returns', label: 'Returns' },
    { id: 'payments', label: 'Payments' },
  ];

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
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Due</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr></thead>
                <tbody>{invoices.map((s, idx) => (
                  <tr key={s.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                    <td className="px-4 py-2.5"><button onClick={() => navigate(`/sales/${s.id}`)} className="text-[#007c89] hover:underline">{s.reference_no}</button></td>
                    <td className="px-4 py-2.5 text-gray-700">{s.document_date}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{parseFloat(s.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{parseFloat(s.due_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded ${s.payment_status === 'paid' ? 'bg-green-100 text-green-700' : s.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.payment_status?.toUpperCase()}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => navigate(`/sales/${s.id}`)} className="p-1 rounded hover:bg-blue-50 text-gray-700 hover:text-blue-600" title="View">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
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
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                </tr></thead>
                <tbody>{returns.map((r, idx) => (
                  <tr key={r.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50`}>
                    <td className="px-4 py-2.5 font-medium">{r.reference_no}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.return_date}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.sale?.reference_no || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">{parseFloat(r.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.reason || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
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
    </div>
  );
}
