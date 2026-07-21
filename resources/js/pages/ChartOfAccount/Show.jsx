import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const ChartOfAccountShow = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyIdFromAccount, setCompanyIdFromAccount] = useState('');

  const getCompanyParam = () => {
    if (isSuperAdmin && companyIdFromAccount) return { company_id: companyIdFromAccount };
    return {};
  };

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/chart-of-accounts/${id}`);
      if (res.data?.success) {
        setAccount(res.data.data);
        if (isSuperAdmin && res.data.data?.company_id) {
          setCompanyIdFromAccount(String(res.data.data.company_id));
        }
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to load account', 'error');
      navigate('/chart-of-accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: `Are you sure you want to delete "${account.code} - ${account.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/chart-of-accounts/${id}`, { params: getCompanyParam() });
        Swal.fire('Deleted!', 'Account has been deleted.', 'success');
        navigate('/chart-of-accounts');
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Failed to delete account', 'error');
      }
    }
  };

  const handleToggleActive = async () => {
    try {
      await api.post(`/chart-of-accounts/${id}/toggle-active`, getCompanyParam());
      fetchAccount();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to toggle status', 'error');
    }
  };

  const handleToggleDeprecated = async () => {
    try {
      await api.post(`/chart-of-accounts/${id}/toggle-deprecated`, getCompanyParam());
      fetchAccount();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to toggle deprecated', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading account...</span>
      </div>
    );
  }

  if (!account) return null;

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700 border-blue-200',
    liability: 'bg-orange-100 text-orange-700 border-orange-200',
    equity: 'bg-purple-100 text-purple-700 border-purple-200',
    income: 'bg-green-100 text-green-700 border-green-200',
    expense: 'bg-red-100 text-red-700 border-red-200',
  };

  const typeColor = typeColors[account.account_type?.type] || 'bg-gray-100 text-gray-700 border-gray-200';

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/chart-of-accounts" className="hover:text-[#007c89]">Chart of Accounts</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{account.code} - {account.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <span className="font-mono">{account.code}</span>
              <span>—</span>
              <span>{account.name}</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${typeColor}`}>
                {account.account_type?.name}
              </span>
              {account.is_active ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">Inactive</span>
              )}
              {account.deprecated && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Deprecated</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/chart-of-accounts/${id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Main Details ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Account Details</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Code</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono font-semibold">{account.code}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                      {account.account_type?.name}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{account.account_type?.type || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Internal Group</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.account_type?.internal_group === 'balance_sheet' ? 'Balance Sheet' :
                     account.account_type?.internal_group === 'profit_loss' ? 'Profit & Loss' : 'Off-Balance Sheet'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Normal Balance</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{account.nature}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Group</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.account_group ? `${account.account_group.code_prefix_start} - ${account.account_group.name}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Parent Account</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.parent ? (
                      <Link to={`/chart-of-accounts/${account.parent.id}/show`} className="text-[#007c89] hover:underline">
                        {account.parent.code} - {account.parent.name}
                      </Link>
                    ) : '— (Root)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Currency</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {account.currency
                      ? `${account.currency.code} - ${account.currency.name}${account.currency.symbol ? ` (${account.currency.symbol})` : ''}`
                      : 'Default (Base Currency)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tag</dt>
                  <dd className="mt-1 text-sm text-gray-900">{account.tag || '—'}</dd>
                </div>
              </dl>

              {account.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</dt>
                  <dd className="mt-1 text-sm text-gray-700">{account.description}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Balance Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Balance Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Opening Debit</p>
                  <p className="text-xl font-bold text-blue-700 mt-1 font-mono">{formatCurrency(account.opening_debit)}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                  <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Opening Credit</p>
                  <p className="text-xl font-bold text-red-700 mt-1 font-mono">{formatCurrency(account.opening_credit)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Current Balance</p>
                  <p className="text-xl font-bold text-gray-800 mt-1 font-mono">{formatCurrency(account.current_balance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Child Accounts */}
          {account.children && account.children.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Child Accounts <span className="text-sm font-normal text-gray-500">({account.children.length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.children.map(child => {
                      const childTypeColor = typeColors[child.account_type?.type] || 'bg-gray-100 text-gray-700';
                      return (
                        <tr key={child.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-700">{child.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{child.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${childTypeColor}`}>
                              {child.account_type?.name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {child.is_active ? (
                              <span className="text-xs text-green-600 font-medium">Active</span>
                            ) : (
                              <span className="text-xs text-gray-500">Inactive</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/chart-of-accounts/${child.id}/show`} className="text-[#007c89] hover:underline text-sm">
                              View
                            </Link>
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

        {/* ─── Sidebar ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Status & Flags */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Status & Flags</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <button
                  onClick={handleToggleActive}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${account.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${account.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Deprecated</span>
                <button
                  onClick={handleToggleDeprecated}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${account.deprecated ? 'bg-yellow-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${account.deprecated ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Reconciliation</span>
                <span className={`text-sm font-medium ${account.allow_reconciliation ? 'text-green-600' : 'text-gray-400'}`}>
                  {account.allow_reconciliation ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Level</span>
                <span className="text-sm font-medium text-gray-700">{account.level}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">{account.created_at ? new Date(account.created_at).toLocaleDateString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">{account.updated_at ? new Date(account.updated_at).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/chart-of-accounts/create"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create New Account
              </Link>
              <Link
                to="/chart-of-accounts"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartOfAccountShow;
