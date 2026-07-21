import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

// ─── Tree Row Component ──────────────────────────────────────
const AccountTreeRow = ({ account, level = 0, expanded, onToggle, onView, onEdit, onDelete, onToggleActive, onToggleDeprecated }) => {
  const hasChildren = account.children_recursive && account.children_recursive.length > 0;
  const isExpanded = expanded[account.id];
  const indent = level * 24;

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700',
    liability: 'bg-orange-100 text-orange-700',
    equity: 'bg-purple-100 text-purple-700',
    income: 'bg-green-100 text-green-700',
    expense: 'bg-red-100 text-red-700',
  };

  const typeColor = typeColors[account.account_type?.type] || 'bg-gray-100 text-gray-700';

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${account.deprecated ? 'opacity-50' : ''} ${!account.is_active ? 'bg-gray-50' : ''}`}>
        {/* Code + Name with tree indent */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
            {hasChildren ? (
              <button
                onClick={() => onToggle(account.id)}
                className="mr-2 p-0.5 rounded hover:bg-gray-200 transition-colors"
              >
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="mr-2 w-5" />
            )}
            <span className="font-mono text-sm font-semibold text-gray-700 mr-3">{account.code}</span>
            <span className="text-sm text-gray-900">{account.name}</span>
            {account.deprecated && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700">Deprecated</span>
            )}
            {!account.is_active && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-gray-200 text-gray-600">Inactive</span>
            )}
          </div>
        </td>

        {/* Account Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
            {account.account_type?.name || '-'}
          </span>
        </td>

        {/* Internal Type */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
          {account.account_type?.type || '-'}
        </td>

        {/* Nature */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
          {account.nature}
        </td>

        {/* Reconciliation */}
        <td className="px-4 py-3 whitespace-nowrap text-center">
          {account.allow_reconciliation ? (
            <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </td>

        {/* Currency */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {account.currency ? `${account.currency.code}` : '-'}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => onView(account.id)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="View">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button onClick={() => onEdit(account.id)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => onToggleActive(account.id, account.is_active)} className={`p-1.5 rounded ${account.is_active ? 'hover:bg-orange-50 text-gray-500 hover:text-orange-600' : 'hover:bg-green-50 text-gray-500 hover:text-green-600'}`} title={account.is_active ? 'Deactivate' : 'Activate'}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {account.is_active ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </button>
            <button onClick={() => onDelete(account.id, account.name)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {/* Children */}
      {hasChildren && isExpanded && account.children_recursive.map(child => (
        <AccountTreeRow
          key={child.id}
          account={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onToggleDeprecated={onToggleDeprecated}
        />
      ))}
    </>
  );
};

// ─── Main Index Component ────────────────────────────────────
const ChartOfAccountIndex = () => {
  const navigate = useNavigate();

  // Detect super admin
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';

  // State
  const [accounts, setAccounts] = useState([]);
  const [flatAccounts, setFlatAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [accountTypes, setAccountTypes] = useState([]);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'
  const [expanded, setExpanded] = useState({});
  const [perPage, setPerPage] = useState(50);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState(null);
  const isCompanyAdmin = userType === 'company_admin';
  const needsBranchSelector = isSuperAdmin || isCompanyAdmin;
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Fetch branches list
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

  // Helper: get branch_id param for API calls
  const getBranchParam = () => {
    if (needsBranchSelector && selectedBranchId) return { branch_id: selectedBranchId };
    return {};
  };

  // Fetch account types for filter dropdown
  const fetchAccountTypes = async () => {
    try {
      const res = await api.get('/chart-of-accounts/types', { params: getBranchParam() });
      if (res.data?.success) {
        setAccountTypes(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch account types:', err);
    }
  };

  // Fetch tree data
  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...getBranchParam() };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.is_active = statusFilter;

      const res = await api.get('/chart-of-accounts/tree', { params });
      if (res.data?.success) {
        let data = res.data.data || [];
        // Apply client-side search for tree mode
        if (searchQuery) {
          data = filterTree(data, searchQuery.toLowerCase());
        }
        setAccounts(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter, perPage]);

  // Fetch flat list data
  const fetchList = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        ...getBranchParam(),
        search: searchQuery,
        per_page: perPage,
        page,
      };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.is_active = statusFilter;

      const res = await api.get('/chart-of-accounts', { params });
      if (res.data?.success) {
        const pData = res.data.data;
        setFlatAccounts(pData.data || []);
        setPagination({
          current_page: pData.current_page || 1,
          last_page: pData.last_page || 1,
          total: pData.total || 0,
          from: pData.from || 0,
          to: pData.to || 0,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, statusFilter, perPage]);

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const res = await api.get('/chart-of-accounts/summary', { params: getBranchParam() });
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  // Filter tree recursively (client-side search)
  const filterTree = (nodes, query) => {
    return nodes.reduce((acc, node) => {
      const matches = node.code.toLowerCase().includes(query) || node.name.toLowerCase().includes(query);
      const filteredChildren = node.children_recursive ? filterTree(node.children_recursive, query) : [];

      if (matches || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children_recursive: filteredChildren.length > 0 ? filteredChildren : node.children_recursive,
        });
      }
      return acc;
    }, []);
  };

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all
  const expandAll = () => {
    const allIds = {};
    const walk = (nodes) => {
      nodes.forEach(n => {
        if (n.children_recursive && n.children_recursive.length > 0) {
          allIds[n.id] = true;
          walk(n.children_recursive);
        }
      });
    };
    walk(accounts);
    setExpanded(allIds);
  };

  // Collapse all
  const collapseAll = () => setExpanded({});

  // Actions
  const viewAccount = (id) => navigate(`/chart-of-accounts/${id}/show`);
  const editAccount = (id) => navigate(`/chart-of-accounts/${id}/edit`);

  const deleteAccount = async (id, name) => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/chart-of-accounts/${id}`, { params: getBranchParam() });
        Swal.fire('Deleted!', 'Account has been deleted.', 'success');
        viewMode === 'tree' ? fetchTree() : fetchList(pagination.current_page);
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Failed to delete account', 'error');
      }
    }
  };

  const toggleActive = async (id) => {
    try {
      await api.post(`/chart-of-accounts/${id}/toggle-active`, getBranchParam());
      viewMode === 'tree' ? fetchTree() : fetchList(pagination.current_page);
    } catch (err) {
      Swal.fire('Error!', err.response?.data?.message || 'Failed to toggle status', 'error');
    }
  };

  const toggleDeprecated = async (id) => {
    try {
      await api.post(`/chart-of-accounts/${id}/toggle-deprecated`, getBranchParam());
      viewMode === 'tree' ? fetchTree() : fetchList(pagination.current_page);
    } catch (err) {
      Swal.fire('Error!', err.response?.data?.message || 'Failed to toggle deprecated', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    fetchAccountTypes();
    fetchBranches();
  }, []);

  // Reload data when branch changes
  useEffect(() => {
    if (needsBranchSelector && !selectedBranchId) return;
    fetchSummary();
  }, [selectedBranchId]);

  // Fetch data based on view mode
  useEffect(() => {
    if (needsBranchSelector && !selectedBranchId) return;
    const timer = setTimeout(() => {
      if (viewMode === 'tree') {
        fetchTree();
      } else {
        fetchList(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [viewMode, searchQuery, typeFilter, statusFilter, selectedBranchId]);

  // Page numbers for list view
  const pageNumbers = useMemo(() => {
    if (!pagination.last_page) return [];
    const pages = [];
    const max = 5;
    let start = Math.max(1, pagination.current_page - Math.floor(max / 2));
    let end = Math.min(pagination.last_page, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [pagination]);

  return (
    <div>
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-2xl font-semibold text-gray-900">Chart of Accounts</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your company's account structure</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Accounts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_accounts}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.active_accounts}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Deprecated</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.deprecated_accounts}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Account Types</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{summary.by_type?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Branch Selector */}
      {needsBranchSelector && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
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
                <option value="">-- Select a branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-yellow-800">No branches found.</p>
              <p className="text-xs text-yellow-700">Create a branch first to manage Chart of Accounts.</p>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            >
              <option value="">All Types</option>
              <option value="asset">Assets</option>
              <option value="liability">Liabilities</option>
              <option value="equity">Equity</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-2 text-sm ${viewMode === 'tree' ? 'bg-[#007c89] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Tree View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-[#007c89] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="List View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>

            {viewMode === 'tree' && (
              <div className="flex items-center gap-1">
                <button onClick={expandAll} className="px-2 py-2 text-xs text-gray-600 hover:text-[#007c89] hover:bg-gray-50 rounded" title="Expand All">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button onClick={collapseAll} className="px-2 py-2 text-xs text-gray-600 hover:text-[#007c89] hover:bg-gray-50 rounded" title="Collapse All">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16l-4-4m0 0l4-4m-4 4H4m16 0H10m-6 4l4-4m0 0L4 8m4 4H4" />
                  </svg>
                </button>
              </div>
            )}

            <Link
              to="/chart-of-accounts/create"
              className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Account
            </Link>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading accounts...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ─── Tree View ─────────────────────────────────────── */}
      {!loading && !error && viewMode === 'tree' && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code / Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nature</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reconcile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">No accounts found. Create your first account to get started.</p>
                    </td>
                  </tr>
                ) : (
                  accounts.map(account => (
                    <AccountTreeRow
                      key={account.id}
                      account={account}
                      level={0}
                      expanded={expanded}
                      onToggle={toggleExpand}
                      onView={viewAccount}
                      onEdit={editAccount}
                      onDelete={deleteAccount}
                      onToggleActive={toggleActive}
                      onToggleDeprecated={toggleDeprecated}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── List View (Flat, paginated) ───────────────────── */}
      {!loading && !error && viewMode === 'list' && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nature</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reconcile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flatAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                        <p className="text-sm">No accounts found.</p>
                      </td>
                    </tr>
                  ) : (
                    flatAccounts.map(account => {
                      const typeColors = {
                        asset: 'bg-blue-100 text-blue-700',
                        liability: 'bg-orange-100 text-orange-700',
                        equity: 'bg-purple-100 text-purple-700',
                        income: 'bg-green-100 text-green-700',
                        expense: 'bg-red-100 text-red-700',
                      };
                      const typeColor = typeColors[account.account_type?.type] || 'bg-gray-100 text-gray-700';

                      return (
                        <tr key={account.id} className={`border-b border-gray-100 hover:bg-gray-50 ${account.deprecated ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-sm font-semibold text-gray-700">{account.code}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{account.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                              {account.account_type?.name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{account.account_group?.name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">{account.nature}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {account.allow_reconciliation ? (
                              <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {account.is_active ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => viewAccount(account.id)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="View">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button onClick={() => editAccount(account.id)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => deleteAccount(account.id, account.name)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-gray-600">
                Showing {pagination.from} to {pagination.to} of {pagination.total} accounts
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchList(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                {pageNumbers.map(page => (
                  <button
                    key={page}
                    onClick={() => fetchList(page)}
                    className={`px-3 py-1.5 text-sm border rounded-md ${page === pagination.current_page ? 'bg-[#007c89] text-white border-[#007c89]' : 'border-gray-300 hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => fetchList(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChartOfAccountIndex;
