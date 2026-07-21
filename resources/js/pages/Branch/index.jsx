import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import BranchUsersModal from '../../components/BranchUsersModal';

const BranchIndex = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCompanyAdmin = location.pathname.startsWith('/company-admin');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  
  // State
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [provinces, setProvinces] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
    prev_page_url: null,
    next_page_url: null
  });
  
  // Helper Functions
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };


  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return `/storage/${logoPath}`;
  };
  
  // Fetch branches
  const fetchBranches = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page,
      is_active: statusFilter || '',
      branch_province: provinceFilter || ''
    };
    
    try {
      const res = await api.get('/branches', { params });
      
      let branchesData = [];
      let paginationData = {};
      
      // Handle different response structures
      if (res.data && res.data.data) {
        // Check if data has nested data property (paginated response)
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          branchesData = res.data.data.data;
          paginationData = {
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
        // If data is directly the array
        else if (Array.isArray(res.data.data)) {
          branchesData = res.data.data;
          paginationData = res.data.meta || {
            current_page: page,
            last_page: 1,
            per_page: perPage,
            total: branchesData.length,
            from: branchesData.length > 0 ? 1 : 0,
            to: branchesData.length
          };
        }
        // If response has meta directly
        else if (res.data.meta) {
          branchesData = res.data.data;
          paginationData = res.data.meta;
        }
      } else if (Array.isArray(res.data)) {
        branchesData = res.data;
      }
      
      setBranches(branchesData);
      setPagination(paginationData);
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage, statusFilter, provinceFilter]);
  
  // Fetch provinces for filter
  const fetchProvinces = async () => {
    try {
      const res = await api.get('/branches/provinces');
      let provincesData = [];
      if (res.data && res.data.data) {
        if (Array.isArray(res.data.data)) {
          provincesData = res.data.data;
        } else if (Array.isArray(res.data)) {
          provincesData = res.data;
        }
      } else if (Array.isArray(res.data)) {
        provincesData = res.data;
      }
      setProvinces(provincesData);
    } catch (err) {
      console.error('Failed to fetch provinces:', err);
    }
  };
  
  // Open branch users modal (company admin only)
  const openBranchUsers = (branch) => {
    if (!branch.is_active) {
      Swal.fire('Warning', 'Cannot login to an inactive branch.', 'warning');
      return;
    }
    setSelectedBranch(branch);
    setUsersModalOpen(true);
  };

  const closeBranchUsersModal = () => {
    setUsersModalOpen(false);
    setSelectedBranch(null);
  };

  // View branch
  const viewBranch = (id) => {
    navigate(`${id}/show`);
  };
  
  // Edit branch
  const editBranch = (id) => {
    navigate(`${id}/edit`);
  };
  
  // Delete branch
  const deleteBranch = async (id, branchName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You won't be able to revert this! Delete ${branchName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.delete(`/branches/${id}`);
        Swal.fire('Deleted!', 'Branch has been deleted successfully.', 'success');
        fetchBranches(currentPage);
      } catch (err) {
        console.error('Failed to delete branch:', err);
        const message = err.response?.data?.message || 'Cannot delete branch with existing users';
        Swal.fire('Error!', message, 'error');
      }
    }
  };
  
  // Toggle branch status
  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/branches/${id}/toggle-status`);
      Swal.fire('Success!', `Branch ${res.data.data?.is_active ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchBranches(currentPage);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      Swal.fire('Error!', err.response?.data?.message || 'Failed to update branch status', 'error');
    }
  };
  
  // Pagination
  const changePage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchBranches(page);
  };
  
  // Page Numbers
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
  
  // Search debounce
// Single useEffect for initial load only
useEffect(() => {
  fetchProvinces();
  fetchBranches(1);
}, []);

// Search debounce only
useEffect(() => {
  const debounceTimer = setTimeout(() => {
    fetchBranches(1);
  }, 500);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);
  
  return (
    <div className="">
      {/* Header */}
      {/* <div className="mb-3">
        <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all branches in the system</p>
      </div> */}
      
      {/* Toolbar */}
      <div className="bg-white border border-gray-200 shadow-sm">
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
              placeholder="Search branches by name, province, district, or phone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            >
              <option value="">All Provinces</option>
              {provinces.map((province) => (
                <option key={province} value={province}>{province}</option>
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
              New Branch
            </Link>
          </div>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading branches...</span>
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
      
      {/* Branches Table */}
      {!loading && !error && (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches && branches.length > 0 ? (
                  branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                      {/* Branch Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                            {branch.branch_logo_url ? (
                              <img
                                src={getLogoUrl(branch.branch_logo_url)}
                                alt={branch.branch_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{branch.branch_name}</div>
                            {branch.branch_slogan && (
                              <div className="text-xs text-gray-500">{branch.branch_slogan}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{branch.branch_province || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {branch.branch_district && `${branch.branch_district}`}
                          {branch.branch_district && branch.branch_village && ', '}
                          {branch.branch_village}
                        </div>
                        <div className="text-xs text-gray-400">{branch.branch_country || 'Afghanistan'}</div>
                      </td>
                      
                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{branch.branch_phone || '-'}</div>
                        <div className="text-xs text-gray-500">{branch.branch_email || '-'}</div>
                        {branch.branch_website && (
                          <div className="text-xs text-blue-600 truncate max-w-[150px]">
                            {branch.branch_website}
                          </div>
                        )}
                      </td>
                      
                      {/* Stats */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">{branch.users_count || 0}</div>
                            <div className="text-xs text-gray-500">Users</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(branch.id, branch.is_active)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            branch.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          } transition-colors`}
                        >
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      
                      {/* Created */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(branch.created_at)}</div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isCompanyAdmin && (
                          <button
                            onClick={() => openBranchUsers(branch)}
                            disabled={!branch.is_active}
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md mr-3 transition-colors ${
                              !branch.is_active
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#007c89] text-white hover:bg-[#006d77]'
                            }`}
                            title={!branch.is_active ? 'Branch is inactive' : 'View users and login as a branch user'}
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Login
                          </button>
                        )}
                        <button
                          onClick={() => viewBranch(branch.id)}
                          className="text-[#007c89] hover:text-[#006d77] mr-3"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => editBranch(branch.id)}
                          className="text-amber-600 hover:text-amber-700 mr-3"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteBranch(branch.id, branch.branch_name)}
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
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No branches found</p>
                      <Link
                        to="create"
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first branch
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{pagination.from || 0}</span> to{' '}
                  <span className="font-medium">{pagination.to || 0}</span> of{' '}
                  <span className="font-medium">{pagination.total || 0}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changePage(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        page === pagination.current_page
                          ? 'bg-[#007c89] text-white border-[#007c89]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
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
      {/* Branch Users Modal */}
      <BranchUsersModal
        branch={selectedBranch}
        isOpen={usersModalOpen}
        onClose={closeBranchUsersModal}
      />
    </div>
  );
};

export default BranchIndex;