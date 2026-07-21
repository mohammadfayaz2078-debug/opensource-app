import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const ChartOfAccountEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [accountTypes, setAccountTypes] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [errors, setErrors] = useState({});
  const [branchIdFromAccount, setBranchIdFromAccount] = useState('');

  const getBranchParam = () => {
    if (branchIdFromAccount) return { branch_id: branchIdFromAccount };
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

  // Fetch account data & dropdown options
  useEffect(() => {
    const fetchAll = async () => {
      setFetching(true);
      try {
        // First fetch the account to get branch_id
        const accountRes = await api.get(`/chart-of-accounts/${id}`);
        const acctData = accountRes.data?.data;
        const bid = acctData?.branch_id || '';
        setBranchIdFromAccount(String(bid));

        const [typesRes, parentsRes, currenciesRes] = await Promise.all([
          api.get('/chart-of-accounts/types', { params: bid ? { branch_id: bid } : {} }),
          api.get('/chart-of-accounts/parent-options', { params: { exclude_id: id, ...(bid ? { branch_id: bid } : {}) } }),
          api.get('/currencies/active-list', { params: bid ? { branch_id: bid } : {} }),
        ]);

        if (typesRes.data?.success) setAccountTypes(typesRes.data.data || []);
        if (parentsRes.data?.success) setParentOptions(parentsRes.data.data || []);
        if (currenciesRes.data?.success) setCurrencies(currenciesRes.data.data || []);

        if (acctData) {
          const acct = acctData;
          setForm({
            code: acct.code || '',
            name: acct.name || '',
            account_type_id: acct.account_type_id || '',
            account_group_id: acct.account_group_id || '',
            parent_id: acct.parent_id || '',
            currency_id: acct.currency_id || '',
            allow_reconciliation: acct.allow_reconciliation || false,
            deprecated: acct.deprecated || false,
            is_active: acct.is_active !== undefined ? acct.is_active : true,
            description: acct.description || '',
            tag: acct.tag || '',
            opening_debit: acct.opening_debit || '0.00',
            opening_credit: acct.opening_credit || '0.00',
            nature: acct.nature || '',
          });

          // Fetch groups for the account's type
          if (acct.account_type_id) {
            const groupsRes = await api.get('/chart-of-accounts/groups', { params: { account_type_id: acct.account_type_id, ...(bid ? { branch_id: bid } : {}) } });
            if (groupsRes.data?.success) setAccountGroups(groupsRes.data.data || []);
          }
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to load account data', 'error');
        navigate('/chart-of-accounts');
      } finally {
        setFetching(false);
      }
    };

    fetchAll();
  }, [id]);

  // Fetch groups when type changes
  useEffect(() => {
    if (form.account_type_id && !fetching) {
      const fetchGroups = async () => {
        try {
          const res = await api.get('/chart-of-accounts/groups', { params: { account_type_id: form.account_type_id, ...getBranchParam() } });
          if (res.data?.success) setAccountGroups(res.data.data || []);
        } catch (err) {
          console.error('Failed to fetch groups:', err);
        }
      };
      fetchGroups();
    }
  }, [form.account_type_id]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = { ...form };
      if (!payload.account_group_id) payload.account_group_id = null;
      if (!payload.parent_id) payload.parent_id = null;
      if (!payload.currency_id) payload.currency_id = null;
      if (!payload.tag) payload.tag = null;
      if (!payload.description) payload.description = null;

      const res = await api.put(`/chart-of-accounts/${id}`, { ...payload, ...getBranchParam() });

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: 'Account Updated',
          text: `Account "${form.code} - ${form.name}" has been updated.`,
          timer: 2000,
          showConfirmButton: false,
        });
        navigate('/chart-of-accounts');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message) {
          Swal.fire('Validation Error', err.response.data.message, 'warning');
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to update account', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Group account types
  const groupedTypes = accountTypes.reduce((acc, type) => {
    const group = type.type.charAt(0).toUpperCase() + type.type.slice(1);
    if (!acc[group]) acc[group] = [];
    acc[group].push(type);
    return acc;
  }, {});

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading account...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/chart-of-accounts" className="hover:text-[#007c89]">Chart of Accounts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">Edit Account</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Account</h1>
        <p className="text-sm text-gray-500 mt-1">Update account <span className="font-mono font-semibold">{form.code}</span> — {form.name}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Main Info ──────────────────────────────── */}
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                />
              </div>
            </div>

            {/* Opening Balance */}
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
                    <p className="text-xs text-gray-500">Mark as deprecated</p>
                  </div>
                </label>
              </div>
            </div>

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
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
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

export default ChartOfAccountEdit;
