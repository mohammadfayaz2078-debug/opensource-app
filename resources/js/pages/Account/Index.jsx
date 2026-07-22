import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function AccountIndex() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', type: 'cash', description: '', balance: '0' });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/accounts', { params });
      setAccounts(res.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(fetchAccounts, 300); return () => clearTimeout(t); }, [search]);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedAccount(null);
    setForm({ name: '', type: 'cash', description: '', balance: '0' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setIsEditing(true);
    setSelectedAccount(account);
    setForm({ name: account.name || '', type: account.type || 'cash', description: account.description || '', balance: String(account.balance || 0) });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setSelectedAccount(null); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/accounts/${selectedAccount.id}`, form);
      } else {
        await api.post('/accounts', form);
      }
      closeModal();
      fetchAccounts();
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try { await api.delete(`/accounts/${id}`); fetchAccounts(); } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const inputClass = (f) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  const typeColors = { cash: 'bg-green-100 text-green-700', bank: 'bg-blue-100 text-blue-700', other: 'bg-gray-100 text-gray-700' };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Accounts / Wallets</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{accounts.length} accounts</span>
            <button onClick={openCreateModal} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">+ New Account</button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 text-sm">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-sm">No accounts yet. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{account.name}</h3>
                    {account.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{account.description}</p>
                    )}
                  </div>
                  <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 mb-0.5">Balance</p>
                  <p className="text-lg font-bold text-gray-900">{parseFloat(account.balance || 0).toFixed(2)} <span className="text-xs font-normal text-gray-500">AFN</span></p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${typeColors[account.type] || typeColors.other}`}>{account.type}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/accounts/${account.id}`)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => openEditModal(account)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{isEditing ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Name *</label>
                  <input type="text" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass('name')} required placeholder="e.g., Main Cash, Bank Account" />
                  {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Type</label>
                  <select name="type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass('type')}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Description</label>
                  <input type="text" name="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass('description')} placeholder="Optional description" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Initial Balance</label>
                  <input type="number" step="0.01" name="balance" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className={inputClass('balance')} />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]">{isEditing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
