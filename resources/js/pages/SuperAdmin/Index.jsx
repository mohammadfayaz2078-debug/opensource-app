import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const SuperAdminIndex = () => {
  const navigate = useNavigate();
  
  const [superAdmins, setSuperAdmins] = useState({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const currentUser = useMemo(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : {};
  }, []);
  
  const fetchSuperAdmins = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page,
      language: languageFilter || ''
    };
    
    try {
      const res = await api.get('/super-admin/super-admins', { params });
      
      setSuperAdmins({
        data: res.data.data || [],
        meta: res.data.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 }
      });
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch super admins');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage, languageFilter]);
  
  const viewSuperAdmin = (id) => {
    navigate(`/super-admin/super-admins/${id}`);
  };
  
  const editSuperAdmin = (id) => {
    navigate(`/super-admin/super-admins/${id}/edit`);
  };
  
  const deleteSuperAdmin = async (id, name) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this! Delete ' + name + '?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        await api.delete(`/super-admin/super-admins/${id}`);
        Swal.fire('Deleted!', 'Super admin has been deleted successfully.', 'success');
        fetchSuperAdmins(currentPage);
      } catch (err) {
        console.error('Failed to delete super admin:', err);
        const message = err.response?.data?.message || 'Cannot delete super admin with existing companies';
        Swal.fire('Error!', message, 'error');
      }
    }
  };
  
  const changePage = (page) => {
    if (page < 1 || page > superAdmins.meta.last_page) return;
    fetchSuperAdmins(page);
  };
  
  const pageNumbers = useMemo(() => {
    const meta = superAdmins.meta;
    if (!meta) return [];
    
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, meta.current_page - Math.floor(maxVisible / 2));
    let end = Math.min(meta.last_page, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [superAdmins.meta]);
  
useEffect(() => {
  fetchSuperAdmins(1);
}, [perPage, languageFilter]);

useEffect(() => {
  const debounceTimer = setTimeout(() => {
    fetchSuperAdmins(1);
  }, 500);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);
  
  const getLanguageName = (lang) => {
    switch(lang) {
      case 'fa': return 'Dari';
      case 'ps': return 'Pashto';
      default: return 'English';
    }
  };
  
  return (
    <div className="relative bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 rounded-xl p-6 -m-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-gray-900">Super Administrators</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{superAdmins.meta.total} total</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 gap-2">
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
          
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="fa">Dari</option>
            <option value="ps">Pashto</option>
          </select>
          
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
        </div>
        <Link
          to="/super-admin/super-admins/create"
          className="inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77] transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New
        </Link>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <span className="ml-3 text-gray-700 text-sm">Loading super admins...</span>
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
      
      {/* Super Admins Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-gray-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Language</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {superAdmins.data && superAdmins.data.length > 0 ? (
                  superAdmins.data.map((admin, idx) => (
                    <tr key={admin.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {admin.id}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#007c89] to-[#005d66] flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {admin.email}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {getLanguageName(admin.language)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        {admin.id !== currentUser.id && (
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => editSuperAdmin(admin.id)}
                              className="p-1 rounded hover:bg-yellow-50 text-gray-700 hover:text-yellow-600"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteSuperAdmin(admin.id, admin.name)}
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
                    <td colSpan="6" className="px-4 py-16 text-center">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm text-gray-700">No super admins found</p>
                      <Link
                        to="/super-admin/super-admins/create"
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first super admin
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {superAdmins.meta && superAdmins.meta.total > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{superAdmins.meta.from || 0}</span> to{' '}
                  <span className="font-medium">{superAdmins.meta.to || 0}</span> of{' '}
                  <span className="font-medium">{superAdmins.meta.total || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changePage(superAdmins.meta.current_page - 1)}
                    disabled={!superAdmins.meta.prev_page_url}
                    className="px-2.5 py-1 text-sm border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    Previous
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-2.5 py-1 text-sm border rounded-md transition-colors ${
                        page === superAdmins.meta.current_page
                          ? 'bg-[#007c89] text-white border-[#007c89]'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => changePage(superAdmins.meta.current_page + 1)}
                    disabled={!superAdmins.meta.next_page_url}
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
    </div>
  );
};

export default SuperAdminIndex;
