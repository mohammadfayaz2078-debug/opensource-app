import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import TransferModal from '../../components/TransferModal';

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

export default function AccountIndex() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', type: 'cash', description: '', user_ids: [] });
  const [copiedId, setCopiedId] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferWalletId, setTransferWalletId] = useState('');
  const [assignableUsers, setAssignableUsers] = useState([]);
  const isCompanyAdmin = localStorage.getItem('user_type') === 'company_admin';
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const isWalletOwner = (account) => Number(account.owner_id) === Number(currentUser.id)
    && account.owner_type?.split('\\').pop() === (isCompanyAdmin ? 'Company' : 'User');
  const basePath = isCompanyAdmin ? '/company-admin' : '';

  const fetchAccounts = async (page = 1, perPageOverride) => {
    setLoading(true);
    try {
      const pp = perPageOverride || perPage;
      const params = { page, per_page: pp };
      if (search) params.search = search;
      const res = await api.get('/accounts', { params });
      setAccounts(res.data?.data || []);
      setTotalPages(res.data?.last_page || 1);
      setCurrentPage(res.data?.current_page || 1);
      setTotal(res.data?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setCurrentPage(1);
    const t = setTimeout(() => fetchAccounts(1), 300);
    return () => clearTimeout(t);
  }, [search, perPage]);

  useEffect(() => {
    api.get('/accounts/assignable-users')
      .then(res => setAssignableUsers(res.data?.data || []))
      .catch(err => console.error('Failed to load wallet users', err));
  }, [isCompanyAdmin]);

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedAccount(null);
    setForm({ name: '', type: 'cash', description: '', user_ids: [] });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setIsEditing(true);
    setSelectedAccount(account);
    setForm({
      name: account.name || '',
      type: account.type || 'cash',
      description: account.description || '',
      user_ids: account.users?.map(user => Number(user.id)) || [],
    });
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
        const { user_ids, ...createForm } = form;
        await api.post('/accounts', createForm);
      }
      closeModal();
      fetchAccounts(currentPage);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        alert(err.response?.data?.message || t('error'));
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('account.delete_confirm'))) return;
    try { await api.delete(`/accounts/${id}`); fetchAccounts(currentPage); } catch (err) { alert(err.response?.data?.message || t('error')); }
  };

  const inputClass = (f) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  const typeColors = { cash: 'bg-green-100 text-green-700', bank: 'bg-blue-100 text-blue-700', other: 'bg-gray-100 text-gray-700' };

  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">{t('account.title')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('account.total_wallets', { count: total })}</span>
            <button onClick={openCreateModal} className="px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors">{t('account.new_wallet')}</button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('account.search_placeholder')}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">{t('account.loading')}</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-700 mt-2">{t('account.empty_title')}. {t('account.empty_desc')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{account.name}</h3>
                      {account.wallet_number && (
                        <p className="text-xs text-gray-400 font-mono truncate mt-0.5 flex items-center gap-1">
                          <span className="truncate">{account.wallet_number}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(account.wallet_number);
                              setCopiedId(account.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="shrink-0 relative text-gray-300 hover:text-gray-500 transition-colors"
                            title={t('account.copy_wallet')}
                          >
                            {copiedId === account.id ? (
                              <span className="text-[10px] text-green-600 font-semibold whitespace-nowrap">{t('account.copied')}</span>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </p>
                      )}
                      {account.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{account.description}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {account.users?.length
                          ? t('account.assigned_users', { count: account.users.length })
                          : t('account.admin_wallet')}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {account.is_active ? t('active') : t('inactive')}
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-sky-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">{t('account.balance')}</p>
                    <p className="text-lg font-bold text-gray-900">{parseFloat(account.balance || 0).toFixed(2)} <span className="text-xs font-normal text-gray-500">{t('account.currency')}</span></p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${typeColors[account.type] || typeColors.other}`}>{account.type}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`${basePath}/accounts/${account.id}`)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title={t('view')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => { setTransferWalletId(account.id.toString()); setTransferModalOpen(true); }} className="p-1.5 rounded hover:bg-cyan-50 text-gray-400 hover:text-cyan-600 transition-colors" title={t('account.type_transfer')}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </button>
                      {isWalletOwner(account) && (
                        <>
                          <button onClick={() => openEditModal(account)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title={t('edit')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(account.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title={t('delete')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 011 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 px-4 py-3 border border-gray-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                {t('account.page_of', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => fetchAccounts(1)} disabled={currentPage === 1}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏮</button>
                <button onClick={() => fetchAccounts(currentPage - 1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">◀</button>
                {generatePageNumbers(currentPage, totalPages).map((p, i) => 
                  p === '...' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => fetchAccounts(p)} 
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${p === currentPage ? 'bg-[#007c89] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
                  )
                )}
                <button onClick={() => fetchAccounts(currentPage + 1)} disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">▶</button>
                <button onClick={() => fetchAccounts(totalPages)} disabled={currentPage === totalPages}
                  className="hidden sm:inline-flex px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">⏭</button>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <span className="text-xs text-gray-500">{t('account.show')}</span>
                <select value={perPage}
                  onChange={(e) => { setPerPage(parseInt(e.target.value)); setCurrentPage(1); fetchAccounts(1, parseInt(e.target.value)); }}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#007c89]">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-gray-500">{t('account.per_page')}</span>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{isEditing ? t('account.edit_title') : t('account.new_title')}</h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('account.name_label')}</label>
                  <input type="text" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass('name')} required placeholder={t('account.name_placeholder')} />
                  {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('account.type_label')}</label>
                  <select name="type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputClass('type')}>
                    <option value="cash">{t('account.type_cash')}</option>
                    <option value="bank">{t('account.type_bank')}</option>
                    <option value="other">{t('account.type_other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{t('account.description_label')}</label>
                  <input type="text" name="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass('description')} placeholder={t('account.description_placeholder')} />
                </div>
                {isEditing && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{t('account.assigned_users_label')}</label>
                      {assignableUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            user_ids: prev.user_ids.length === assignableUsers.length
                              ? []
                              : assignableUsers.map(user => Number(user.id)),
                          }))}
                          className="text-xs font-medium text-[#007c89] hover:text-[#006d77]"
                        >
                          {form.user_ids.length === assignableUsers.length ? t('account.clear_all') : t('account.select_all')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2 space-y-1.5">
                      {assignableUsers.length === 0 ? (
                        <p className="text-xs text-gray-500 p-1">{t('account.no_active_users')}</p>
                      ) : assignableUsers.map(user => {
                        const userId = Number(user.id);
                        return (
                          <label key={user.id} className="flex items-start gap-2 rounded bg-white border border-gray-100 p-2 cursor-pointer hover:border-gray-300">
                            <input
                              type="checkbox"
                              checked={form.user_ids.includes(userId)}
                              onChange={e => setForm(prev => ({
                                ...prev,
                                user_ids: e.target.checked
                                  ? [...prev.user_ids, userId]
                                  : prev.user_ids.filter(id => id !== userId),
                              }))}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                            />
                            <span className="min-w-0 text-xs text-gray-700">
                              <span className="block font-medium truncate">{user.first_name} {user.last_name}</span>
                              <span className="block text-gray-500 truncate">{user.email} {user.branch?.branch_name ? `- ${user.branch.branch_name}` : ''}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{t('account.multiple_users')}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">{t('cancel')}</button>
                <button type="submit" className="px-4 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]">{isEditing ? t('account.update') : t('account.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TransferModal
        open={transferModalOpen}
        walletId={transferWalletId}
        basePath={basePath}
        onClose={() => setTransferModalOpen(false)}
      />
    </div>
  );
}
