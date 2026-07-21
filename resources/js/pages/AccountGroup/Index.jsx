import React, { useState, useEffect, useCallback } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const AccountGroupIndex = () => {
  const { t } = useTranslation();
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';

  // State
  const [groups, setGroups] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expanded, setExpanded] = useState({});
  const isCompanyAdmin = userType === 'company_admin';
  const needsBranchSelector = isSuperAdmin || isCompanyAdmin;
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code_prefix_start: '',
    code_prefix_end: '',
    account_type_id: '',
    parent_id: '',
  });
  const [errors, setErrors] = useState({});

  // Branch param helper
  const getBranchParam = () => {
    if (needsBranchSelector && selectedBranchId) return { branch_id: selectedBranchId };
    return {};
  };

  // ─── Fetch Data ─────────────────────────────────────────────

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

  const fetchGroups = useCallback(async () => {
    if (needsBranchSelector && !selectedBranchId) return;
    setLoading(true);
    try {
      const params = { ...getBranchParam() };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter) params.account_type_id = typeFilter;

      const res = await api.get('/account-groups/tree', { params });
      if (res.data?.success) {
        let data = res.data.data || [];
        // Client-side search for tree mode
        if (searchQuery) {
          data = filterTree(data, searchQuery.toLowerCase());
        }
        // Client-side type filter for tree mode
        if (typeFilter) {
          data = filterTreeByType(data, parseInt(typeFilter));
        }
        setGroups(data);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, selectedBranchId]);

  const fetchAccountTypes = async () => {
    try {
      const res = await api.get('/chart-of-accounts/types', { params: getBranchParam() });
      if (res.data?.success) setAccountTypes(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch account types:', err);
    }
  };

  const fetchParentOptions = async (excludeId = null) => {
    if (needsBranchSelector && !selectedBranchId) return;
    try {
      const params = { ...getBranchParam() };
      const res = await api.get('/account-groups', { params });
      if (res.data?.success) {
        let opts = res.data.data || [];
        if (excludeId) {
          opts = opts.filter(g => g.id !== excludeId);
        }
        setParentOptions(opts);
      }
    } catch (err) {
      console.error('Failed to fetch parent options:', err);
    }
  };

  // ─── Tree Helpers ───────────────────────────────────────────

  const filterTree = (nodes, query) => {
    return nodes.reduce((acc, node) => {
      const matches = node.name.toLowerCase().includes(query) ||
        (node.code_prefix_start && node.code_prefix_start.toLowerCase().includes(query));
      const filteredChildren = node.children_recursive ? filterTree(node.children_recursive, query) : [];
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...node, children_recursive: filteredChildren.length > 0 ? filteredChildren : node.children_recursive });
      }
      return acc;
    }, []);
  };

  const filterTreeByType = (nodes, typeId) => {
    return nodes.reduce((acc, node) => {
      const matches = node.account_type_id === typeId;
      const filteredChildren = node.children_recursive ? filterTreeByType(node.children_recursive, typeId) : [];
      if (matches || filteredChildren.length > 0) {
        acc.push({ ...node, children_recursive: filteredChildren.length > 0 ? filteredChildren : node.children_recursive });
      }
      return acc;
    }, []);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    walk(groups);
    setExpanded(allIds);
  };

  const collapseAll = () => setExpanded({});

  const countAllGroups = (nodes) => {
    let count = 0;
    nodes.forEach(n => {
      count++;
      if (n.children_recursive) count += countAllGroups(n.children_recursive);
    });
    return count;
  };

  // ─── Modal Handlers ─────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedGroup(null);
    setForm({ name: '', code_prefix_start: '', code_prefix_end: '', account_type_id: '', parent_id: '' });
    setErrors({});
    fetchParentOptions();
    setIsModalOpen(true);
  };

  const openEditModal = (group) => {
    setIsEditing(true);
    setSelectedGroup(group);
    setForm({
      name: group.name || '',
      code_prefix_start: group.code_prefix_start || '',
      code_prefix_end: group.code_prefix_end || '',
      account_type_id: group.account_type_id || '',
      parent_id: group.parent_id || '',
    });
    setErrors({});
    fetchParentOptions(group.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // ─── CRUD Operations ───────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload = { ...form, ...getBranchParam() };
      if (!payload.code_prefix_end) delete payload.code_prefix_end;
      if (!payload.parent_id) delete payload.parent_id;

      let res;
      if (isEditing && selectedGroup) {
        res = await api.put(`/account-groups/${selectedGroup.id}`, payload);
      } else {
        res = await api.post('/account-groups', payload);
      }

      if (res.data?.success) {
        Swal.fire({
          icon: 'success',
          title: isEditing ? 'Group Updated' : 'Group Created',
          text: res.data.message,
          timer: 2000,
          showConfirmButton: false,
        });
        closeModal();
        fetchGroups();
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          Swal.fire('Validation Error', err.response.data.message, 'warning');
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group) => {
    const result = await Swal.fire({
      title: 'Delete Group?',
      html: `Are you sure you want to delete <strong>"${group.name}"</strong>?<br><small class="text-gray-500">Code range: ${group.code_prefix_start}${group.code_prefix_end ? ' - ' + group.code_prefix_end : ''}</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/account-groups/${group.id}`, { params: getBranchParam() });
        if (res.data?.success) {
          Swal.fire({ icon: 'success', title: 'Deleted!', text: res.data.message, timer: 2000, showConfirmButton: false });
          fetchGroups();
        }
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete group', 'error');
      }
    }
  };

  // ─── Side Panel (View Group Details) ────────────────────────

  const [detailGroup, setDetailGroup] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const viewGroupDetails = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/account-groups/${id}`, { params: getBranchParam() });
      if (res.data?.success) setDetailGroup(res.data.data);
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setDetailGroup(null);

  // ─── Effects ────────────────────────────────────────────────

  useEffect(() => {
    fetchBranches();
  }, []); 

  useEffect(() => {
    fetchAccountTypes();
    const timer = setTimeout(() => { fetchGroups(); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, selectedBranchId]);

  // ─── Type color mapping ────────────────────────────────────

  const typeColors = {
    asset: 'bg-blue-100 text-blue-700',
    liability: 'bg-orange-100 text-orange-700',
    equity: 'bg-purple-100 text-purple-700',
    income: 'bg-green-100 text-green-700',
    expense: 'bg-red-100 text-red-700',
  };

  // Group account types by internal type for dropdown
  const groupedTypes = accountTypes.reduce((acc, type) => {
    const group = type.type.charAt(0).toUpperCase() + type.type.slice(1);
    if (!acc[group]) acc[group] = [];
    acc[group].push(type);
    return acc;
  }, {});

  // ─── Tree Row Component ────────────────────────────────────

  const GroupTreeRow = ({ group, level = 0 }) => {
    const hasChildren = group.children_recursive && group.children_recursive.length > 0;
    const isExpanded = expanded[group.id];
    const indent = level * 28;
    const typeColor = typeColors[group.account_type?.type] || 'bg-gray-100 text-gray-700';

    return (
      <>
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
          {/* Name with tree indent */}
          <td className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(group.id)} className="mr-2 p-0.5 rounded hover:bg-gray-200 transition-colors">
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <span className="mr-2 w-5" />
              )}
              <span className="text-sm font-medium text-gray-900">{group.name}</span>
            </div>
          </td>

          {/* Code Range */}
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="font-mono text-sm text-gray-700">
              {group.code_prefix_start}
              {group.code_prefix_end && <span className="text-gray-400"> — </span>}
              {group.code_prefix_end && group.code_prefix_end}
            </span>
          </td>

          {/* Account Type */}
          <td className="px-4 py-3 whitespace-nowrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
              {group.account_type?.name || '-'}
            </span>
          </td>

          {/* Category */}
          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
            {group.account_type?.type || '-'}
          </td>

          {/* Actions */}
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => viewGroupDetails(group.id)} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="View Details">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button onClick={() => openEditModal(group)} className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600" title="Edit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(group)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>

        {/* Children */}
        {hasChildren && isExpanded && group.children_recursive.map(child => (
          <GroupTreeRow key={child.id} group={child} level={level + 1} />
        ))}
      </>
    );
  };

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className={`flex-1 ${detailGroup ? 'max-w-[calc(100%-380px)]' : ''}`}>
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Account Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Organize your chart of accounts into logical groups by code range</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Groups</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{countAllGroups(groups)}</p>
          </div>
          {['asset', 'liability', 'income', 'expense'].map(type => {
            const count = groups.reduce((acc, g) => {
              const c = g.account_type?.type === type ? 1 : 0;
              return acc + c;
            }, 0);
            const colors = { asset: 'text-blue-600', liability: 'text-orange-600', income: 'text-green-600', expense: 'text-red-600' };
            return (
              <div key={type} className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{type}</p>
                <p className={`text-xl font-bold mt-1 ${colors[type]}`}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* Branch Selector */}
        {needsBranchSelector && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
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
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type filter */}
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]">
                <option value="">All Types</option>
                {accountTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>

              {/* Expand/Collapse */}
              <div className="flex items-center gap-1">
                <button onClick={expandAll} className="px-2 py-2 text-gray-600 hover:text-[#007c89] hover:bg-gray-50 rounded" title="Expand All">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button onClick={collapseAll} className="px-2 py-2 text-gray-600 hover:text-[#007c89] hover:bg-gray-50 rounded" title="Collapse All">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16l-4-4m0 0l4-4m-4 4H4m16 0H10m-6 4l4-4m0 0L4 8m4 4H4" />
                  </svg>
                </button>
              </div>

              {/* Create button */}
              <button onClick={openCreateModal} className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                New Group
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-600">Loading groups...</span>
          </div>
        )}

        {/* Tree Table */}
        {!loading && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code Range</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <p className="text-sm">No account groups found. Create your first group to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    groups.map(group => (
                      <GroupTreeRow key={group.id} group={group} level={0} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Side Panel ─────────────────────────────────── */}
      {detailGroup && (
        <div className="w-[360px] flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-4">
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Group Details</h3>
              <button onClick={closeDetail} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#007c89] border-t-transparent"></div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Group Info */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{detailGroup.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Code Range</p>
                  <p className="text-sm font-mono font-medium text-gray-900 mt-0.5">
                    {detailGroup.code_prefix_start}
                    {detailGroup.code_prefix_end && ` — ${detailGroup.code_prefix_end}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Account Type</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-0.5 ${typeColors[detailGroup.account_type?.type] || 'bg-gray-100 text-gray-700'}`}>
                    {detailGroup.account_type?.name || '-'}
                  </span>
                </div>
                {detailGroup.parent && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Parent Group</p>
                    <p className="text-sm text-gray-900 mt-0.5">{detailGroup.parent.code_prefix_start} — {detailGroup.parent.name}</p>
                  </div>
                )}
                {detailGroup.children && detailGroup.children.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sub-Groups ({detailGroup.children.length})</p>
                    <div className="space-y-1">
                      {detailGroup.children.map(child => (
                        <div key={child.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5">
                          <span className="text-sm text-gray-700">{child.name}</span>
                          <span className="text-xs font-mono text-gray-500">{child.code_prefix_start}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accounts in this group */}
                {detailGroup.accounts && detailGroup.accounts.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Accounts ({detailGroup.accounts.length})</p>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {detailGroup.accounts.map(acct => (
                        <div key={acct.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-1.5">
                          <div>
                            <span className="font-mono text-xs font-semibold text-blue-700">{acct.code}</span>
                            <span className="text-xs text-blue-600 ml-2">{acct.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!detailGroup.accounts || detailGroup.accounts.length === 0) && (!detailGroup.children || detailGroup.children.length === 0) && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No accounts or sub-groups assigned yet.
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex gap-2">
                  <button onClick={() => openEditModal(detailGroup)} className="flex-1 px-3 py-2 bg-[#007c89] text-white text-sm rounded-md hover:bg-[#006d77] transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(detailGroup)} className="px-3 py-2 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 z-10">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Account Group' : 'Create Account Group'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Current Assets"
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
                </div>

                {/* Code Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code Prefix Start <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="code_prefix_start"
                      value={form.code_prefix_start}
                      onChange={handleInputChange}
                      placeholder="e.g. 1000"
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] font-mono ${errors.code_prefix_start ? 'border-red-500' : 'border-gray-300'}`}
                      required
                    />
                    {errors.code_prefix_start && <p className="text-xs text-red-500 mt-1">{errors.code_prefix_start[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code Prefix End</label>
                    <input
                      type="text"
                      name="code_prefix_end"
                      value={form.code_prefix_end}
                      onChange={handleInputChange}
                      placeholder="e.g. 1499"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] font-mono"
                    />
                  </div>
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

                {/* Parent Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Group</label>
                  <select
                    name="parent_id"
                    value={form.parent_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
                  >
                    <option value="">No Parent (Root Group)</option>
                    {parentOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.code_prefix_start} — {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
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
                    isEditing ? 'Update Group' : 'Create Group'
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

export default AccountGroupIndex;
