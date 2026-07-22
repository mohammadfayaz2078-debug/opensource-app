import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const RoleIndex = () => {
  const navigate = useNavigate();
  const initialLoadDone = useRef(false);
  
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [userType, setUserType] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });
  
  const getUserType = useCallback(() => {
    const type = localStorage.getItem('user_type');
    setUserType(type);
    return type;
  }, []);
  
  const fetchRoles = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page
    };
    
    try {
      const res = await api.get('/roles', { params });
      
      let rolesData = [];
      let metaData = {};
      
      if (res.data && res.data.data) {
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          rolesData = res.data.data.data;
          metaData = {
            current_page: res.data.data.current_page || 1,
            last_page: res.data.data.last_page || 1,
            per_page: res.data.data.per_page || perPage,
            total: res.data.data.total || 0,
            from: res.data.data.from || 0,
            to: res.data.data.to || 0,
            prev_page_url: res.data.data.prev_page_url,
            next_page_url: res.data.data.next_page_url
          };
        } 
        else if (Array.isArray(res.data.data)) {
          rolesData = res.data.data;
          metaData = res.data.meta || {
            current_page: page,
            last_page: 1,
            per_page: perPage,
            total: rolesData.length,
            from: rolesData.length > 0 ? 1 : 0,
            to: rolesData.length
          };
        }
        else if (res.data.meta) {
          rolesData = res.data.data;
          metaData = res.data.meta;
        }
      } else if (Array.isArray(res.data)) {
        rolesData = res.data;
      }
      
      setRoles(rolesData);
      setPagination(metaData);
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage]);
  
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  
  const viewPermissions = (role) => {
    setSelectedRole(role);
    setShowPermissionsModal(true);
  };
  
  const editRole = (id) => {
    navigate(`${id}/edit`);
  };
  
  const deleteRole = async (id, roleName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You won't be able to revert this! Delete ${roleName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.delete(`/roles/${id}`);
        Swal.fire('Deleted!', 'Role has been deleted successfully.', 'success');
        fetchRoles(currentPage);
      } catch (err) {
        console.error('Failed to delete role:', err);
        const message = err.response?.data?.message || 'Cannot delete role assigned to users';
        Swal.fire('Error!', message, 'error');
      }
    }
  };
  
  const changePage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchRoles(page);
  };
  
  const pageNumbers = useMemo(() => {
    if (!pagination || !pagination.last_page) return [];
    
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.current_page - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.last_page, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [pagination]);
  
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (initialLoadDone.current) {
        fetchRoles(1);
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, fetchRoles]);
  
useEffect(() => {
  getUserType();
  fetchRoles(1);
}, []);
  
  const isSuperAdmin = false;
  
  const getRoleBadgeColor = (roleName) => {
    switch(roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'supervisor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Roles</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{pagination.total} total</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="10">10/page</option>
            <option value="25">25/page</option>
            <option value="50">50/page</option>
            <option value="100">100/page</option>
          </select>
          <Link
            to="create"
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New
          </Link>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading roles...</span>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Roles Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role Name</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Branch</th>
                  )}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Permissions</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Users</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles && roles.length > 0 ? (
                  roles.map((role, idx) => (
                    <tr key={role.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {role.id}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(role.role_name)}`}>
                            {role.role_name}
                          </span>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {role.branch ? role.branch.branch_name : 'Global'}
                        </td>
                      )}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => viewPermissions(role)}
                          className="inline-flex items-center px-2.5 py-1 text-xs bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {role.users_count || 0}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        {role.role_name?.toLowerCase() !== 'admin' && (
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => editRole(role.id)}
                              className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteRole(role.id, role.role_name)}
                              className="p-1 rounded hover:bg-red-50 text-gray-700 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-16 text-center">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm text-gray-700">No roles found</p>
                      <Link
                        to="create"
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first role
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.from || 0}</span> to{' '}
                  <span className="font-medium">{pagination.to || 0}</span> of{' '}
                  <span className="font-medium">{pagination.total || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changePage(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-2.5 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-2.5 py-1 text-sm border rounded-md transition-colors ${
                        page === pagination.current_page
                          ? 'bg-[#007c89] text-white border-[#007c89]'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="px-2.5 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Permissions Modal */}
      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-2xl bg-white">
            <div className="text-center">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Permissions for "{selectedRole.role_name}"
                </h3>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto text-left p-4 bg-gray-50 rounded-lg">
                {selectedRole.permissions && Object.keys(selectedRole.permissions).length > 0 ? (
                  Object.entries(selectedRole.permissions).map(([module, modulePerm]) => (
                    <div key={module} className="mb-4 pb-3 border-b border-gray-200 last:border-0">
                      <h4 className="font-semibold text-gray-700 mb-2 text-md capitalize">
                        {module.replace(/_/g, ' ')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(modulePerm).map(([action, hasPermission]) => (
                          <span
                            key={action}
                            className={`px-3 py-1.5 text-xs rounded-full ${
                              hasPermission 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {action}: {hasPermission ? 'Yes' : 'No'}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No specific permissions configured.
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowPermissionsModal(false)}
                className="mt-6 px-6 py-2 bg-[#007c89] text-white rounded-lg hover:bg-[#006d77] transition duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleIndex;
