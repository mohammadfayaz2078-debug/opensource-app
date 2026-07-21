import React, { useState, useEffect, useMemo } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const UserSettings = () => {
  const { t } = useTranslation();
  const [authUser, setAuthUser] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [accountTypeCount, setAccountTypeCount] = useState(0);

  // Check if authenticated user has a branch_id
  const hasBranchId = useMemo(() => {
    return !!authUser?.user?.branch_id;
  }, [authUser]);

  // Fetch auth user
  const fetchAuthUser = async () => {
    try {
      const res = await api.get('/user-me');
      setAuthUser(res.data);
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
    }
  };

  // Check if account types are already seeded for this branch
  const checkSeedStatus = async () => {
    try {
      const res = await api.get('/account-types', { params: { per_page: 1 } });
      const count = res.data?.meta?.total || res.data?.total || 0;
      setAccountTypeCount(count);
      setSeeded(count > 0);
    } catch (err) {
      console.error('Failed to check seed status:', err);
    }
  };

  // Seed default account types for the user's branch
  const handleSeedAccountTypes = async () => {
    const result = await Swal.fire({
      title: 'Seed Account Types?',
      text: 'This will add the default Odoo-style account types to your branch. Existing types will not be duplicated.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, seed them',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      setSeeding(true);

      Swal.fire({
        title: 'Seeding Account Types',
        text: 'Please wait...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await api.post('/account-types/seed');

      Swal.close();

      if (response.data.success) {
        if (response.data.already_seeded) {
          setSeeded(true);
          setAccountTypeCount(response.data.data.total_account_types);
          showInfoToast(
            response.data.message +
            ` (Total: ${response.data.data.total_account_types} account types)`
          );
        } else {
          setSeeded(true);
          setAccountTypeCount(response.data.data.total_account_types);
          showSuccessToast(
            response.data.message +
            ` (Total: ${response.data.data.total_account_types} account types)`
          );
        }
      } else {
        showErrorToast(response.data.message || 'Seeding failed');
      }
    } catch (error) {
      Swal.close();
      console.error('Seed account types error:', error);
      showErrorToast(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to seed account types'
      );
    } finally {
      setSeeding(false);
    }
  };

  // Toast notifications
  const showSuccessToast = (message) => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#10b981',
      color: '#ffffff',
      iconColor: '#ffffff',
      customClass: {
        popup: 'border-0 shadow-lg'
      }
    });

    Toast.fire({
      icon: 'success',
      title: message
    });
  };

  const showErrorToast = (message) => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: '#ef4444',
      color: '#ffffff',
      iconColor: '#ffffff',
      customClass: {
        popup: 'border-0 shadow-lg'
      }
    });

    Toast.fire({
      icon: 'error',
      title: message || 'An error occurred!'
    });
  };

  const showInfoToast = (message) => {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: '#3b82f6',
      color: '#ffffff',
      iconColor: '#ffffff',
      customClass: {
        popup: 'border-0 shadow-lg'
      }
    });

    Toast.fire({
      icon: 'info',
      title: message
    });
  };

  useEffect(() => {
    const init = async () => {
      await fetchAuthUser();
      await checkSeedStatus();
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-3 md:py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
              <p className="text-gray-500 text-sm mt-1">Manage your branch settings and data</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Branch Data Section */}
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Branch Data
                </h2>
                <p className="text-gray-500 text-sm mt-1">Seed default data for your branch</p>
              </div>

              {/* Seed Account Types — only for users with a branch_id */}
              {hasBranchId && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50/50 rounded-xl border border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800">Account Types</h3>
                        {seeded && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Already seeded
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Add default Odoo-style account types (Assets, Liabilities, Equity, Income, Expenses) to your branch. Existing types will not be duplicated.
                        {seeded && accountTypeCount > 0 && (
                          <span className="block mt-1 text-emerald-600 font-medium">
                            {accountTypeCount} account type{accountTypeCount !== 1 ? 's' : ''} already exist in your branch.
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSeedAccountTypes}
                      disabled={seeding || seeded}
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {seeding ? (
                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : seeded ? (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      )}
                      {seeding ? 'Seeding...' : seeded ? 'Already Seeded' : 'Seed Account Types'}
                    </button>
                  </div>
                </div>
              )}

              {!hasBranchId && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500">
                    No branch assigned. Account type seeding is only available for branch users.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
