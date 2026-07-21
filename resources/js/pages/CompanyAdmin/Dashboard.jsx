import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import BranchUsersModal from '../../components/BranchUsersModal';

const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, users: 0 });
  const [impersonating, setImpersonating] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [usersModalOpen, setUsersModalOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/company-admin/dashboard');
      if (res.data?.success) {
        setBranches(res.data.branches || []);
        setStats({
          total: res.data.stats?.total_branches || 0,
          active: res.data.stats?.active_branches || 0,
          inactive: res.data.stats?.inactive_branches || 0,
          users: res.data.stats?.total_users || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user.manager_name || user.company_name || 'Company Admin'}
        </h1>
        <p className="text-gray-500 mt-1">
          Company Management — manage all branches from here
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Branches</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inactive</p>
              <p className="text-3xl font-bold text-gray-400 mt-1">{stats.inactive}</p>
            </div>
            <div className="bg-gray-100 rounded-full p-3">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Users</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.users}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Branches List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">All Branches</h2>
          <Link
            to="/company-admin/branches/create"
            className="inline-flex items-center px-4 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Branch
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-500">Loading branches...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="mt-3 text-gray-500">No branches yet</p>
            <Link
              to="/company-admin/branches/create"
              className="mt-3 inline-flex items-center px-4 py-2 text-sm bg-[#007c89] text-white rounded-md hover:bg-[#006d77]"
            >
              Create your first branch
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-[#007c89]/10 rounded-lg flex items-center justify-center">
                          {branch.branch_logo_url ? (
                            <img src={`/storage/${branch.branch_logo_url}`} alt="" className="h-8 w-8 object-cover rounded" />
                          ) : (
                            <span className="text-[#007c89] font-bold text-sm">
                              {(branch.branch_name || '?').charAt(0).toUpperCase()}
                            </span>
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
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{branch.branch_province || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {[branch.branch_district, branch.branch_village].filter(Boolean).join(', ') || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{branch.branch_phone || '-'}</div>
                      <div className="text-xs text-gray-500">{branch.branch_email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {branch.users_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        branch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(branch.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Login - Show Branch Users */}
                        <button
                          onClick={() => openBranchUsers(branch)}
                          disabled={!branch.is_active}
                          className="inline-flex items-center px-3 py-1.5 bg-[#007c89] text-white text-xs font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="View users and login as a branch user"
                        >
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Login
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/company-admin/branches/${branch.id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branch Users Modal */}
      <BranchUsersModal
        branch={selectedBranch}
        isOpen={usersModalOpen}
        onClose={closeBranchUsersModal}
      />
    </div>
  );
};

export default CompanyAdminDashboard;

