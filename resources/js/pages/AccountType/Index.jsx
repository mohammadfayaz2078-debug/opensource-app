import React, { useState, useEffect } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const AccountTypeIndex = () => {
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';
  const isCompanyAdmin = userType === 'company_admin';
  const needsBranchSelector = isSuperAdmin || isCompanyAdmin;

  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const getBranchParam = () => {
    if (needsBranchSelector && selectedBranchId) return { branch_id: selectedBranchId };
    return {};
  };

  const fetchBranches = async () => {
    if (!needsBranchSelector) return;
    try {
      const endpoint = isSuperAdmin ? '/super-admin/branches' : '/branches';
      const res = await api.get(endpoint, { params: { per_page: 999 } });
      const list = res.data?.data || res.data?.branches?.data || res.data?.branches || [];
      const branchList = Array.isArray(list) ? list : [];
      setBranches(branchList);
      if (branchList.length > 0 && !selectedBranchId) {
        setSelectedBranchId(String(branchList[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    type: '',
    internal_group: '',
    include_initial_balance: false,
    description: '',
    sequence: 10,
  });

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchTypes = async () => {
    if (needsBranchSelector && !selectedBranchId) return;
    setLoading(true);
    try {
      const params = { ...getBranchParam() };
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter) params.type = categoryFilter;
      if (groupFilter) params.internal_group = groupFilter;

      const res = await api.get('/account-types', { params });
      if (res.data?.success) setTypes(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch account types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBranches(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTypes(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter, groupFilter, selectedBranchId]);

  // ─── Modal ──────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedType(null);
    setForm({ name: '', type: '', internal_group: '', include_initial_balance: false, description: '', sequence: 10 });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (type) => {
    setIsEditing(true);
    setSelectedType(type);
    setForm({
      name: type.name || '',
      type: type.type || '',
      internal_group: type.internal_group || '',
      include_initial_balance: type.include_initial_balance || false,
      description: type.description || '',
      sequence: type.sequence ?? 10,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Auto-set internal_group when type changes
  const handleTypeChange = (e) => {
    const val = e.target.value;
    let internalGroup = '';
    if (['asset', 'liability', 'equity'].includes(val)) internalGroup = 'balance_sheet';
    else if (['income', 'expense'].includes(val)) internalGroup = 'profit_loss';
    setForm(prev => ({ ...prev, type: val, internal_group: internalGroup }));
  };

  // ─── CRUD ───────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, sequence: parseInt(form.sequence) || 10 };
      if (!payload.description) delete payload.description;

      const params = getBranchParam();
      let res;
      if (isEditing && selectedType) {
        res = await api.put(`/account-types/${selectedType.id}`, { ...payload, ...params });
      } else {
        res = await api.post('/account-types', { ...payload, ...params });
      }

      if (res.data?.success) {
        Swal.fire({ icon: 'success', title: isEditing ? 'Updated' : 'Created', text: res.data.message, timer: 2000, showConfirmButton: false });
        closeModal();
        fetchTypes();
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type) => {
    const result = await Swal.fire({
      title: 'Delete Account Type?',
      html: `Are you sure you want to delete <strong>"${type.name}"</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/account-types/${type.id}`, { params: getBranchParam() });
        if (res.data?.success) {
          Swal.fire({ icon: 'success', title: 'Deleted!', text: res.data.message, timer: 2000, showConfirmButton: false });
          fetchTypes();
        }
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete', 'error');
      }
    }
  };

  // ─── Helpers ────────────────────────────────────────────────

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700 border-blue-200',
    liability: 'bg-orange-100 text-orange-700 border-orange-200',
    equity: 'bg-purple-100 text-purple-700 border-purple-200',
    income: 'bg-green-100 text-green-700 border-green-200',
    expense: 'bg-red-100 text-red-700 border-red-200',
  };

  const groupLabels = {
    balance_sheet: 'Balance Sheet',
    profit_loss: 'Profit & Loss',
    off_balance: 'Off-Balance Sheet',
  };

  const groupColors = {
    balance_sheet: 'bg-indigo-50 text-indigo-600',
    profit_loss: 'bg-amber-50 text-amber-600',
    off_balance: 'bg-gray-100 text-gray-600',
  };

  // Summary counts
  const categoryCounts = types.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Account Types</h1>
        <p className="text-sm text-gray-500 mt-1">Define the categories for your chart of accounts (Asset, Liability, Equity, Income, Expense)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {['asset', 'liability', 'equity', 'income', 'expense'].map(cat => {
          const colors = { asset: 'text-blue-600', liability: 'text-orange-600', equity: 'text-purple-600', income: 'text-green-600', expense: 'text-red-600' };
          return (
            <div key={cat} className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide capitalize">{cat}</p>
              <p className={`text-xl font-bold mt-1 ${colors[cat]}`}>{categoryCounts[cat] || 0}</p>
            </div>
          );
        })}
      </div>

      {/* Branch Selector */}
      {needsBranchSelector && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {branches.length > 0 ? (
            <>
              <label className="text-sm font-medium text-yellow-800">Branch:</label>
              <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="px-3 py-1.5 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 bg-white">
                <option value="">-- Select --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </>
          ) : (
            <p className="text-sm font-medium text-yellow-800">No branches found.</p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-5">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
              <option value="">All Categories</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]">
              <option value="">All Groups</option>
              <option value="balance_sheet">Balance Sheet</option>
              <option value="profit_loss">Profit & Loss</option>
              <option value="off_balance">Off-Balance Sheet</option>
            </select>

            <button onClick={openCreateModal} className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Type
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      )}

      {/* Table & Mobile Cards */}
      {!loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">

          {/* ─── Desktop Table (md+) ─────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internal Group</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Natures</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-sm">No account types found.</p>
                    </td>
                  </tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{type.sequence}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{type.name}</p>
                          {type.description && <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{type.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type.type] || 'bg-gray-100 text-gray-700'}`}>
                          {type.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${groupColors[type.internal_group] || 'bg-gray-100 text-gray-600'}`}>
                          {groupLabels[type.internal_group] || type.internal_group}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {type.include_initial_balance ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {['asset', 'expense'].includes(type.type) ? 'Debit' : 'Credit'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700 font-medium">
                        {type.accounts_count || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-700 font-medium">
                        {type.account_groups_count || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(type)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(type)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Cards (below md) ─────────────────────── */}
          <div className="md:hidden">
            {types.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm">No account types found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {types.map((type) => (
                  <div key={type.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {/* Top row: name + actions */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{type.name}</p>
                        {type.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{type.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(type)} className="p-2 rounded-lg hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(type)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type.type] || 'bg-gray-100 text-gray-700'}`}>
                        {type.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${groupColors[type.internal_group] || 'bg-gray-100 text-gray-600'}`}>
                        {groupLabels[type.internal_group] || type.internal_group}
                      </span>
                      {type.include_initial_balance && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Initial Bal
                        </span>
                      )}
                    </div>

                    {/* Details row */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
                        <span className="block text-gray-400 text-[10px] uppercase">Nature</span>
                        <span className="font-medium capitalize">{['asset', 'expense'].includes(type.type) ? 'Debit' : 'Credit'}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
                        <span className="block text-gray-400 text-[10px] uppercase">Accounts</span>
                        <span className="font-medium">{type.accounts_count || 0}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
                        <span className="block text-gray-400 text-[10px] uppercase">Groups</span>
                        <span className="font-medium">{type.account_groups_count || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ─── Create/Edit Modal ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Account Type' : 'Create Account Type'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Receivable, Bank and Cash"
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                {/* Type + Internal Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleTypeChange}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Group <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="internal_group"
                      value={form.internal_group}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.internal_group ? 'border-red-500' : 'border-gray-300'}`}
                      required
                    >
                      <option value="">Select Group</option>
                      <option value="balance_sheet">Balance Sheet</option>
                      <option value="profit_loss">Profit & Loss</option>
                      <option value="off_balance">Off-Balance Sheet</option>
                    </select>
                    {errors.internal_group && <p className="text-xs text-red-500 mt-1">{errors.internal_group[0]}</p>}
                  </div>
                </div>

                {/* Sequence + Initial Balance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sequence (Order)</label>
                    <input
                      type="number"
                      name="sequence"
                      value={form.sequence}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="include_initial_balance"
                        checked={form.include_initial_balance}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                      />
                      <span className="text-sm text-gray-700">Include Initial Balance</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  />
                </div>

                {/* Nature hint */}
                {form.type && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-600">
                    <strong>Normal balance:</strong> {['asset', 'expense'].includes(form.type) ? 'Debit' : 'Credit'} &nbsp;|&nbsp;
                    <strong>Statement:</strong> {['asset', 'liability', 'equity'].includes(form.type) ? 'Balance Sheet' : 'Profit & Loss'}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50 inline-flex items-center">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    isEditing ? 'Update Type' : 'Create Type'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountTypeIndex;
