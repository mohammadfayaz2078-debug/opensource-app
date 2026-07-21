import React, { useState, useEffect } from 'react';
import api from '../plugins/axios';
import Swal from 'sweetalert2';

const BranchUsersModal = ({ branch, isOpen, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [impersonatingUserId, setImpersonatingUserId] = useState(null);

  useEffect(() => {
    if (isOpen && branch) {
      fetchBranchUsers();
    }
    return () => {
      setUsers([]);
      setSearch('');
    };
  }, [isOpen, branch]);

  const fetchBranchUsers = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await api.get(`/company-admin/branches/${branch.id}/users`, { params });
      if (res.data?.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch branch users:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBranchUsers();
  };

  const loginAsUser = async (user) => {
    const result = await Swal.fire({
      title: 'Confirm Impersonation',
      html: `Are you sure you want to login as <strong>${user.full_name}</strong>?<br><small class="text-gray-500">${user.email}</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#007c89',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Login as User',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setImpersonatingUserId(user.id);
    try {
      const res = await api.post(`/company-admin/impersonate/user/${user.id}`);
      if (res.data?.success) {
        // Save company admin session
        localStorage.setItem('ca_token', localStorage.getItem('api_token'));
        localStorage.setItem('ca_user', localStorage.getItem('user'));
        localStorage.setItem('ca_user_type', localStorage.getItem('user_type'));

        // Switch to impersonated user session
        localStorage.setItem('api_token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('user_type', res.data.user_type);
        if (res.data.permissions) {
          localStorage.setItem('permissions', JSON.stringify(res.data.permissions));
        }
        localStorage.setItem('impersonating_branch', 'true');

        // Redirect to user dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to impersonate user', 'error');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Branch Users
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {branch?.branch_name} — Select a user to login as
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#007c89] focus:border-transparent outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#007c89] border-t-transparent"></div>
                <span className="ml-3 text-gray-500 text-sm">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="mt-2 text-gray-500 text-sm">No users found in this branch</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-9 w-9 rounded-full bg-[#007c89]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#007c89] font-semibold text-sm">
                          {(user.first_name || '?').charAt(0).toUpperCase()}
                          {(user.last_name || '').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Info */}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role Badge */}
                      {user.role && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                          {user.role}
                        </span>
                      )}
                      {/* Status Badge */}
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {/* Login Button */}
                      <button
                        onClick={() => loginAsUser(user)}
                        disabled={!user.is_active || impersonatingUserId === user.id}
                        className="inline-flex items-center px-3 py-1.5 bg-[#007c89] text-white text-xs font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {impersonatingUserId === user.id ? (
                          <div className="inline-block animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1.5"></div>
                        ) : (
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                        )}
                        Login as User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {users.length} user{users.length !== 1 ? 's' : ''} in this branch
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchUsersModal;
