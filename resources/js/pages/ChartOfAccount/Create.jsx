import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const ChartOfAccountCreate = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';
  const [loading, setLoading] = useState(false);
  const [accountTypes, setAccountTypes] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [errors, setErrors] = useState({});
  const isCompanyAdmin = userType === 'company_admin';
  const needsBranchSelector = isSuperAdmin || isCompanyAdmin;
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const getBranchParam = () => {
    if (needsBranchSelector && selectedBranchId) return { branch_id: selectedBranchId };
    return {};
  };

  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type_id: '',
    account_group_id: '',
    parent_id: '',
    currency_id: '',
    allow_reconciliation: false,
    deprecated: false,
    is_active: true,
    description: '',
    tag: '',
    opening_debit: '0.00',
    opening_credit: '0.00',
    nature: '',
  });

  // Fetch branches
  useEffect(() => {
    if (!needsBranchSelector) return;
    const fetchBranches = async () => {
      try {
        const endpoint = isSuperAdmin ? '/super-admin/branches' : '/branches';
        const res = await api.get(endpoint, { params: { per_page: 999 } });
        const list = res.data?.data || res.data?.branches?.data || res.data?.branches || [];
        const branchList = Array.isArray(list) ? list : [];
        setBranches(branchList);
        if (branchList.length > 0) setSelectedBranchId(String(branchList[0].id));
      } catch (err) { console.error(err); }
    };
    fetchBranches();
  }, []);

  // Fetch dropdown data
  useEffect(() => {
    fetchAccountTypes();
    fetchCurrencies();
  }, []);

  // Reload branch-scoped data when branch changes
  useEffect(() => {
    if (needsBranchSelector && !selectedBranchId) return;
    fetchParentOptions();
    fetchAccountTypes();
  }, [selectedBranchId]);

  // Fetch groups when account_type_id changes
  useEffect(() => {
    if (form.account_type_id) {
      fetchAccountGroups(form.account_type_id);
    } else {
      setAccountGroups([]);
    }
  }, [form.account_type_id]);

  const fetchAccountTypes = async () => {
    try {
      const res = await api.get('/chart-of-accounts/types', { params: getBranchParam() });
      if (res.data?.success) setAccountTypes(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch account types:', err);
    }
  };

  const fetchAccountGroups = async (typeId) => {
    try {
      const res = await api.get('/chart-of-accounts/groups', { params: { account_type_id: typeId, ...getBranchParam() } });
      if (res.data?.success) setAccountGroups(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch account groups:', err);
    }
  };

  const fetchParentOptions = async () => {
    try {
      const res = await api.get('/chart-of-accounts/parent-options', { params: getBranchParam() });
      if (res.data?.success) setParentOptions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch parent options:', err);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/currencies/active-list', { params: getBranchParam() });
      if (res.data?.success) setCurrencies(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Auto-detect nature when account type changes
  useEffect(() => {
    if (form.account_type_id && accountTypes.length > 0) {
      const selectedType = accountTypes.find(t => t.id == form.account_type_id);
      if (selectedType) {
        const isDebit = ['asset', 'expense'].includes(selectedType.type);
        setForm(prev => ({ ...prev, nature: isDebit ? 'debit' : 'credit' }));
      }
    }
  }, [form.account_type_id, accountTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = { ...form };
      // Clean empty optional fields
      if (!payload.account_group_id) delete payload.account_group_id;
      if (!payload.parent_id) delete payload.parent_id;
      if (!payload.currency_id) delete payload.currency_id;
      if (!payload.tag) delete payload.tag;
      if (!payload.description) delete payload.description;

      const payload2 = { ...payload, ...getBranchParam() };
      const res = await api.post('/chart-of-accounts', payload2);

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Account Created',
          text: `Account "${form.code} - ${form.name}" has been created successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('/chart-of-accounts');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to create account', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Group account types by internal type for the dropdown
  const groupedTypes = accountTypes.reduce((acc, type) => {
    const group = type.type.charAt(0).toUpperCase() + type.type.slice(1);
    if (!acc[group]) acc[group] = [];
    acc[group].push(type);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/chart-of-accounts" className="hover:text-[#007c89]">Chart of Accounts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Account</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Create New Account</h1>
        <p className="text-sm text-gray-500 mt-1">Add a new account to your chart of accounts</p>
      </div>

      {/* Branch Selector */}
      {needsBranchSelector && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {branches.length > 0 ? (
            <>
              <label className="text-sm font-medium text-yellow-800">Branch:</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 bg-white"
              >
                <option value="">-- Select --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-yellow-800">No branches found.</p>
              <p className="text-xs text-yellow-700">You must create a branch first before managing Chart of Accounts.</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Main Info Card ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleInputChange}
                    placeholder="e.g. 1010"
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] font-mono ${errors.code ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code[0]}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Cash on Hand"
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="account_type_id"
                    value={form.account_type_id}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.account_type_id ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  >
                    <option value="">Select Account Type</option>
                    {Object.entries(groupedTypes).map(([group, types]) => (
                      <optgroup key={group} label={`── ${group} ──`}>
                        {types.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.account_type_id && <p className="text-xs text-red-500 mt-1">{errors.account_type_id[0]}</p>}
                </div>

                {/* Account Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Group</label>
                  <select
                    name="account_group_id"
                    value={form.account_group_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  >
                    <option value="">No Group</option>
                    {accountGroups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.code_prefix_start} - {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Parent Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
                  <select
                    name="parent_id"
                    value={form.parent_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  >
                    <option value="">No Parent (Root Account)</option>
                    {parentOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.code} - {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    name="currency_id"
                    value={form.currency_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  >
                    <option value="">Default (Base Currency)</option>
                    {currencies.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name} {c.symbol ? `(${c.symbol})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                  <input
                    type="text"
                    name="tag"
                    value={form.tag}
                    onChange={handleInputChange}
                    placeholder="e.g. Operating, Tax"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  />
                </div>

                {/* Nature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Normal Balance</label>
                  <select
                    name="nature"
                    value={form.nature}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  >
                    <option value="">Auto-detect from type</option>
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Optional description for this account..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                />
              </div>
            </div>

            {/* ─── Opening Balance Card ─────────────────── */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Opening Balance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Debit</label>
                  <input
                    type="number"
                    name="opening_debit"
                    value={form.opening_debit}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Credit</label>
                  <input
                    type="number"
                    name="opening_credit"
                    value={form.opening_credit}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Sidebar Options ────────────────────────── */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Options</h2>

              <div className="space-y-4">
                {/* Allow Reconciliation */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allow_reconciliation"
                    checked={form.allow_reconciliation}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Allow Reconciliation</span>
                    <p className="text-xs text-gray-500">Enable matching with bank statements</p>
                  </div>
                </label>

                {/* Is Active */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Active</span>
                    <p className="text-xs text-gray-500">Account can be used in transactions</p>
                  </div>
                </label>

                {/* Deprecated */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="deprecated"
                    checked={form.deprecated}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Deprecated</span>
                    <p className="text-xs text-gray-500">Mark as deprecated (no longer recommended)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Account Type Preview */}
            {form.account_type_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Selected Type Info</h3>
                {(() => {
                  const selected = accountTypes.find(t => t.id == form.account_type_id);
                  if (!selected) return null;
                  return (
                    <div className="text-xs text-blue-700 space-y-1">
                      <p><strong>Type:</strong> {selected.name}</p>
                      <p><strong>Category:</strong> {selected.type}</p>
                      <p><strong>Group:</strong> {selected.internal_group === 'balance_sheet' ? 'Balance Sheet' : selected.internal_group === 'profit_loss' ? 'Profit & Loss' : 'Off-Balance'}</p>
                      <p><strong>Normal Balance:</strong> {['asset', 'expense'].includes(selected.type) ? 'Debit' : 'Credit'}</p>
                      {selected.description && <p className="mt-1 text-blue-600">{selected.description}</p>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Account
                  </>
                )}
              </button>

              <Link
                to="/chart-of-accounts"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChartOfAccountCreate;
