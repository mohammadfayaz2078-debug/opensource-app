import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const UsersIndex = () => {
  const navigate = useNavigate();
  
  // State
  const [users, setUsers] = useState({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Fetch roles for filter
  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles?per_page=100');
      let rolesData = [];
      if (res.data && res.data.data) {
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          rolesData = res.data.data.data;
        } else if (Array.isArray(res.data.data)) {
          rolesData = res.data.data;
        }
      }
      setRoles(rolesData);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, []);
  
  // Fetch branches for filter
  const fetchBranches = useCallback(async () => {
    try {
      const res = await api.get('/branches?per_page=100');
      let branchesData = [];
      if (res.data && res.data.data) {
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          branchesData = res.data.data.data;
        } else if (Array.isArray(res.data.data)) {
          branchesData = res.data.data;
        }
      }
      setBranches(branchesData);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  }, []);
  
  // Fetch users
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page
    };
    
    if (roleFilter) {
      params.role_id = roleFilter;
    }
    
    if (branchFilter) {
      params.branch_id = branchFilter;
    }
    
    if (statusFilter) {
      params.status = statusFilter;
    }
    
    try {
      const res = await api.get('/user', { params });
      
      let usersData = [];
      let metaData = {};
      
      if (res.data && res.data.data) {
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          usersData = res.data.data.data;
          metaData = {
            current_page: res.data.data.current_page || 1,
            last_page: res.data.data.last_page || 1,
            per_page: res.data.data.per_page || perPage,
            total: res.data.data.total || 0,
            from: res.data.data.from || 0,
            to: res.data.data.to || 0
          };
        } else if (Array.isArray(res.data.data)) {
          usersData = res.data.data;
          metaData = res.data.meta || {
            current_page: page,
            last_page: 1,
            per_page: perPage,
            total: usersData.length,
            from: usersData.length > 0 ? 1 : 0,
            to: usersData.length
          };
        }
      }
      
      setUsers({
        data: usersData,
        meta: metaData
      });
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage, roleFilter, branchFilter, statusFilter]);
  
  // Edit user
  const editUser = (id) => {
    navigate(`${id}/edit`);
  };
  
  // Delete user
  const deleteUser = async (id, name) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You won't be able to revert this! Delete ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.delete(`/user/${id}`);
        Swal.fire('Deleted!', 'User has been deleted successfully.', 'success');
        fetchUsers(currentPage);
      } catch (err) {
        console.error('Failed to delete user:', err);
        const message = err.response?.data?.message || 'Cannot delete user.';
        Swal.fire('Error!', message, 'error');
      }
    }
  };
  
  // Toggle user status
  const toggleStatus = async (id, currentStatus, name) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${action} ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#007c89',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}`,
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.post(`/user/${id}/toggle-status`);
        Swal.fire('Success!', `User has been ${action}d successfully.`, 'success');
        fetchUsers(currentPage);
      } catch (err) {
        console.error('Failed to toggle status:', err);
        Swal.fire('Error!', 'Failed to update user status.', 'error');
      }
    }
  };
  
  // Pagination
  const changePage = (page) => {
    if (page < 1 || page > users.meta.last_page) return;
    fetchUsers(page);
  };
  
  // Page Numbers
  const pageNumbers = useMemo(() => {
    const meta = users.meta;
    if (!meta) return [];
    
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, meta.current_page - Math.floor(maxVisible / 2));
    let end = Math.min(meta.last_page, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [users.meta]);
  
useEffect(() => {
  // Initial load of all data
  fetchRoles();
  fetchBranches();
  fetchUsers(1);
  
  // Search debounce
  const debounceTimer = setTimeout(() => {
    if (searchQuery !== '') {
      fetchUsers(1);
    }
  }, 500);
  
  return () => clearTimeout(debounceTimer);
}, [searchQuery, perPage, roleFilter, branchFilter, statusFilter]);
  
  return (
    <div className="">
      {/* Header */}
      {/* <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all users in the system</p>
      </div> */}
      
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.role_name || role.position}
                  </option>
                ))}
              </select>
              
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name}
                  </option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              
              <Link
                to="create"
                className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                New User
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
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
      
      {/* Users Table */}
      {!loading && !error && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.data && users.data.length > 0 ? (
                  users.data.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {(user.first_name?.charAt(0) || user.name?.charAt(0) || 'U').toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {user.role?.role_name || user.position?.position || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.branch?.branch_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(user.id, user.status, `${user.first_name} ${user.last_name}`)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                            user.status
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {user.status ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => editUser(user.id)}
                          className="text-amber-600 hover:text-amber-700 mr-3"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No users found</p>
                      <Link
                        to="create"
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first user
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {users.meta && users.meta.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{users.meta.from || 0}</span> to{' '}
                  <span className="font-medium">{users.meta.to || 0}</span> of{' '}
                  <span className="font-medium">{users.meta.total || 0}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changePage(users.meta.current_page - 1)}
                    disabled={users.meta.current_page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        page === users.meta.current_page
                          ? 'bg-[#007c89] text-white border-[#007c89]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(users.meta.current_page + 1)}
                    disabled={users.meta.current_page === users.meta.last_page}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersIndex;