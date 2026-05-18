import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const CompanyIndex = () => {
  const navigate = useNavigate();
  
  // State
  const [companies, setCompanies] = useState({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Helper Functions
  const getLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return `/storage/${logoPath}`;
  };
  
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };
  
  // Fetch companies
  const fetchCompanies = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page,
      is_active: statusFilter || ''
    };
    
    try {
      const res = await api.get('/super-admin/companies', { params });
      
      setCompanies({
        data: res.data.data || [],
        meta: res.data.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 }
      });
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage, statusFilter]);
  
  // View company
  const viewCompany = (id) => {
    navigate(`/super-admin/companies/${id}/show`);
  };
  
  // Edit company
  const editCompany = (id) => {
    navigate(`/super-admin/companies/edit/${id}`);
  };
  
  // Login as company (WHM-style impersonation)
  const loginAsCompany = async (company) => {
    try {
      const res = await api.post(`/super-admin/companies/${company.id}/impersonate`);
      if (res.data?.success) {
        localStorage.setItem('sa_token', localStorage.getItem('api_token'));
        localStorage.setItem('sa_user', localStorage.getItem('user'));
        localStorage.setItem('sa_user_type', localStorage.getItem('user_type'));

        localStorage.setItem('api_token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('user_type', res.data.user_type);
        if (res.data.permissions) {
          localStorage.setItem('permissions', JSON.stringify(res.data.permissions));
        }
        localStorage.setItem('impersonating', 'true');

        window.location.href = '/dashboard';
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to login as company', 'error');
    }
  };

  // Delete company
  const deleteCompany = async (id, companyName) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You won't be able to revert this! Delete ${companyName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.delete(`/super-admin/companies/${id}`);
        Swal.fire('Deleted!', 'Company has been deleted successfully.', 'success');
        fetchCompanies(currentPage);
      } catch (err) {
        console.error('Failed to delete company:', err);
        const message = err.response?.data?.message || 'Cannot delete company with existing branches or users';
        Swal.fire('Error!', message, 'error');
      }
    }
  };
  
  // Pagination
  const changePage = (page) => {
    if (page < 1 || page > companies.meta.last_page) return;
    fetchCompanies(page);
  };
  
  // Page Numbers
  const pageNumbers = useMemo(() => {
    const meta = companies.meta;
    if (!meta) return [];
    
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, meta.current_page - Math.floor(maxVisible / 2));
    let end = Math.min(meta.last_page, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [companies.meta]);
  
// Combined search and filter changes
useEffect(() => {
  const debounceTimer = setTimeout(() => {
    fetchCompanies(1);
  }, 500);
  
  return () => clearTimeout(debounceTimer);
}, [searchQuery, perPage, statusFilter]);

// Initial mount handled by the same effect
  
  return (
    <div className="">
      {/* Header */}
      {/* <div className="mb-3">
        <h1 className="text-2xl font-semibold text-gray-900">Companies</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all companies in the system</p>
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
              placeholder="Search companies by name, email, or manager..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89]"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3">
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
              to="/super-admin/companies/create"
              className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Company
            </Link>
          </div>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading companies...</span>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Companies Table */}
      {!loading && !error && (
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
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
                {companies.data && companies.data.length > 0 ? (
                  companies.data.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      {/* Company Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                            {company.logo ? (
                              <img
                                src={getLogoUrl(company.logo)}
                                alt={company.company_name}
                                className="h-8 w-8 object-cover rounded"
                              />
                            ) : (
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{company.company_name}</div>
                            <div className="text-xs text-gray-500">{company.company_email}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Manager */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{company.manager_name}</div>
                        <div className="text-xs text-gray-500">{company.manager_phone || '-'}</div>
                      </td>
                      
                      {/* Contact */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{company.company_phone || '-'}</div>
                        <div className="text-xs text-gray-500">{company.city || '-'}</div>
                      </td>
                      
                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {company.company_address || '-'}
                        </div>
                      </td>
                      
                      {/* Stats */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">{company.branches_count || 0}</div>
                            <div className="text-xs text-gray-500">Branches</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900">{company.users_count || 0}</div>
                            <div className="text-xs text-gray-500">Users</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          company.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {/* Login as Company */}
                          <button
                            onClick={() => loginAsCompany(company)}
                            disabled={!company.is_active}
                            className="inline-flex items-center px-2.5 py-1.5 bg-[#007c89] text-white text-xs font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Login as this company"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Login
                          </button>
                          <button
                            onClick={() => viewCompany(company.id)}
                            className="text-[#007c89] hover:text-[#006d77]"
                            title="View"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => editCompany(company.id)}
                            className="text-amber-600 hover:text-amber-700"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCompany(company.id, company.company_name)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No companies found</p>
                      <Link
                        to="/super-admin/companies/create"
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first company
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {companies.meta && companies.meta.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{companies.meta.from || 0}</span> to{' '}
                  <span className="font-medium">{companies.meta.to || 0}</span> of{' '}
                  <span className="font-medium">{companies.meta.total || 0}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changePage(companies.meta.current_page - 1)}
                    disabled={!companies.meta.prev_page_url}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        page === companies.meta.current_page
                          ? 'bg-[#007c89] text-white border-[#007c89]'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(companies.meta.current_page + 1)}
                    disabled={!companies.meta.next_page_url}
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

export default CompanyIndex;