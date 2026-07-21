import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const RoleEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Detect user context
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userType = localStorage.getItem('user_type');
  const isBranchUser = userType === 'user' && user.branch_id;

  // State
  const [modules, setModules] = useState({});
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [branches, setBranches] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  // Form state
  const [form, setForm] = useState({
    role_name: '',
    branch_id: '',
    permissions: {}
  });

  // Helper functions
  const formatModuleName = (module) => {
    return module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPermissionName = (permission) => {
    return permission.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const clearError = (field) => {
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // Fetch modules
  const fetchModules = useCallback(async () => {
    setLoadingModules(true);
    setErrorMessage('');
    try {
      const res = await api.get('/roles/modules');
      if (res.data && res.data.success && res.data.modules) {
        setModules(res.data.modules);
      } else {
        setErrorMessage(res.data?.message || 'Failed to load permission modules');
        setModules({});
      }
    } catch (err) {
      console.error('Error fetching modules', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load modules');
      setModules({});
    } finally {
      setLoadingModules(false);
    }
  }, []);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await api.get('/branches');
      
      let branchesData = [];
      if (response.data && response.data.data) {
        if (response.data.data.data && Array.isArray(response.data.data.data)) {
          branchesData = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          branchesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          branchesData = response.data;
        }
      } else if (Array.isArray(response.data)) {
        branchesData = response.data;
      }
      
      setBranches(branchesData);
    } catch (err) {
      console.error('Failed to fetch branches', err);
      setBranches([]);
      setErrorMessage('Failed to load branches. Please refresh the page.');
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  // Fetch role data
  const fetchRole = useCallback(async () => {
    setLoadingRole(true);
    try {
      const response = await api.get(`/roles/${id}`);
      
      let roleData = null;
      if (response.data && response.data.data) {
        roleData = response.data.data;
      } else if (response.data) {
        roleData = response.data;
      }
      
      if (roleData) {
        setForm({
          role_name: roleData.role_name || '',
          branch_id: roleData.branch_id || '',
          permissions: roleData.permissions || {}
        });
      }
    } catch (err) {
      console.error('Failed to fetch role', err);
      const message = err.response?.data?.message || 'Failed to load role data';
      setErrorMessage(message);
      Swal.fire('Error', message, 'error');
      setTimeout(() => {
        navigate('../roles');
      }, 2000);
    } finally {
      setLoadingRole(false);
    }
  }, [id, navigate]);

  // Initialize collapsed state and ensure all permissions have values
  useEffect(() => {
    if (Object.keys(modules).length > 0 && Object.keys(form.permissions).length > 0) {
      // Ensure all modules and permissions exist in form.permissions
      const updatedPermissions = { ...form.permissions };
      let hasChanges = false;
      
      Object.keys(modules).forEach(module => {
        if (!updatedPermissions[module]) {
          updatedPermissions[module] = {};
          hasChanges = true;
        }
        Object.keys(modules[module]).forEach(permission => {
          if (typeof updatedPermissions[module][permission] === 'undefined') {
            updatedPermissions[module][permission] = false;
            hasChanges = true;
          }
        });
      });
      
      if (hasChanges) {
        setForm(prev => ({ ...prev, permissions: updatedPermissions }));
      }
      
      // Initialize collapsed state
      const newCollapsed = {};
      Object.keys(modules).forEach(module => {
        newCollapsed[module] = false;
      });
      setCollapsed(newCollapsed);
    } else if (Object.keys(modules).length > 0 && Object.keys(form.permissions).length === 0) {
      // No permissions loaded yet, initialize with false
      const newPermissions = {};
      Object.keys(modules).forEach(module => {
        newPermissions[module] = {};
        Object.keys(modules[module]).forEach(permission => {
          newPermissions[module][permission] = false;
        });
      });
      setForm(prev => ({ ...prev, permissions: newPermissions }));
      
      const newCollapsed = {};
      Object.keys(modules).forEach(module => {
        newCollapsed[module] = false;
      });
      setCollapsed(newCollapsed);
    }
  }, [modules, form.permissions]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      await fetchModules();
      await fetchBranches();
      await fetchRole();
    };
    loadData();
  }, [fetchModules, fetchBranches, fetchRole]);

  // Permission toggle functions
  const toggleModule = (module, checked) => {
    const newPermissions = { ...form.permissions };
    if (!newPermissions[module]) newPermissions[module] = {};
    Object.keys(modules[module]).forEach(permission => {
      newPermissions[module][permission] = checked;
    });
    setForm(prev => ({ ...prev, permissions: newPermissions }));
  };

  const isModuleSelected = (module) => {
    if (!form.permissions[module]) return false;
    return Object.keys(modules[module]).every(p => !!form.permissions[module][p]);
  };

  const selectAllPermissions = () => {
    const newPermissions = { ...form.permissions };
    Object.keys(modules).forEach(module => {
      if (!newPermissions[module]) newPermissions[module] = {};
      Object.keys(modules[module]).forEach(permission => {
        newPermissions[module][permission] = true;
      });
    });
    setForm(prev => ({ ...prev, permissions: newPermissions }));
  };

  const deselectAllPermissions = () => {
    const newPermissions = { ...form.permissions };
    Object.keys(modules).forEach(module => {
      if (!newPermissions[module]) newPermissions[module] = {};
      Object.keys(modules[module]).forEach(permission => {
        newPermissions[module][permission] = false;
      });
    });
    setForm(prev => ({ ...prev, permissions: newPermissions }));
  };

  const toggleCollapse = (module) => {
    setCollapsed(prev => ({ ...prev, [module]: !prev[module] }));
  };

  const resetForm = () => {
    fetchRole(); // Reload original role data
    setFormErrors({});
    setErrorMessage('');
  };

  // Update role
  const updateRole = async (e) => {
    e.preventDefault();
    
    if (!form.role_name.trim()) {
      setFormErrors({ role_name: ['Role name is required'] });
      return;
    }

    if (!form.branch_id && !isBranchUser) {
      setFormErrors({ branch_id: ['Please select a branch for this role'] });
      return;
    }

    if (!Object.keys(modules).length) {
      setErrorMessage('Cannot update role: No permission modules available');
      return;
    }

    setProcessing(true);
    setFormErrors({});
    setErrorMessage('');

    try {
      const payload = {
        role_name: form.role_name,
        permissions: form.permissions,
        branch_id: form.branch_id
      };
      
      const res = await api.put(`/roles/${id}`, payload);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `Role "${res.data.data?.role_name || form.role_name}" updated successfully!`,
        timer: 2000,
        showConfirmButton: false
      });

      // Redirect after success
      setTimeout(() => {
        navigate('../roles');
      }, 1500);
    } catch (err) {
      console.error('Error updating role', err);
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
        Swal.fire('Validation Error', 'Please check the form for errors', 'error');
      } else {
        const message = err.response?.data?.message || 'Failed to update role. Please try again.';
        setErrorMessage(message);
        Swal.fire('Error', message, 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loadingRole || loadingModules) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-2 border-b-2 border-[#007c89]"></div>
          <p className="mt-4 text-gray-600">Loading role data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center mb-2 sm:mb-3">
          <Link to="../roles" className="text-[#007c89] hover:text-[#006d77] mr-2 sm:mr-3 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 truncate">
            Edit Role
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Edit role and configure its permissions
        </p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mb-3 sm:mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs sm:text-sm text-red-700">
              <div className="break-words">{errorMessage}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow overflow-hidden">
        <form onSubmit={updateRole} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Name + controls */}
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.role_name}
                onChange={(e) => {
                  setForm({ ...form, role_name: e.target.value });
                  clearError('role_name');
                }}
                type="text"
                required
                placeholder="Enter role name (e.g., Manager, Supervisor, Staff)"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#007c89] focus:border-[#007c89] ${
                  formErrors.role_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {formErrors.role_name && (
                <p className="text-xs text-red-600 mt-1">
                  {formErrors.role_name[0]}
                </p>
              )}
            </div>

            {/* Control buttons */}
            <div className="flex items-end">
              <div className="flex gap-1.5 w-full md:w-auto justify-start md:justify-end">
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="text-xs px-2 py-2 rounded bg-[#007c89] text-white hover:bg-[#006d77] flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  All
                </button>
                <button
                  type="button"
                  onClick={deselectAllPermissions}
                  className="text-xs px-2 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  None
                </button>
              </div>
            </div>
          </div>

          {/* Branch selection - Only show for company admin / super admin */}
          {!isBranchUser ? (
            <div className="border rounded-lg bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch <span className="text-red-500">*</span>
              </label>
              
              {loadingBranches ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Loading branches...
                </div>
              ) : !branches || branches.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                  No branches available. Please create a branch first.
                  <Link to="../branches/create" className="ml-2 text-[#007c89] hover:underline">
                    Create Branch
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={form.branch_id}
                    onChange={(e) => {
                      setForm({ ...form, branch_id: e.target.value });
                      clearError('branch_id');
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#007c89] focus:border-[#007c89] bg-white ${
                      formErrors.branch_id ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select a branch</option>
                    {Array.isArray(branches) && branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name} - {branch.branch_province || branch.city}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    The role is assigned to the selected branch
                  </p>
                </>
              )}
              
              {formErrors.branch_id && (
                <p className="text-xs text-red-600 mt-1">
                  {formErrors.branch_id[0]}
                </p>
              )}
            </div>
          ) : (
            <div className="border rounded-lg bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <p className="text-sm text-gray-900">{user.branch?.branch_name || 'Your Branch'}</p>
            </div>
          )}

          {/* Modules area */}
          <div className="border rounded-lg bg-gray-50 p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
              <div className="text-sm text-gray-700">
                Permissions ({Object.keys(modules).length} Modules)
              </div>
              <div className="text-xs text-gray-500 hidden sm:block">
                Click chevron to expand/collapse
              </div>
            </div>

            {/* Modules grid */}
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[60vh] sm:max-h-[56vh] overflow-auto p-1 sm:p-2">
              {Object.entries(modules).map(([module, modulePermissions]) => (
                <div key={module} className="border rounded-lg bg-white p-2 sm:p-3 shadow-sm">
                  {/* Module header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium capitalize truncate">
                        {formatModuleName(module)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {Object.keys(modulePermissions).length} permission(s)
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
                      {/* Module toggle */}
                      <input
                        type="checkbox"
                        id={`module-${module}`}
                        checked={isModuleSelected(module)}
                        onChange={(e) => toggleModule(module, e.target.checked)}
                        className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#007c89] focus:ring-[#007c89]"
                      />
                      {/* Collapse toggle */}
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 p-1"
                        onClick={() => toggleCollapse(module)}
                      >
                        <svg className={`w-4 h-4 transition-transform ${collapsed[module] ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Permissions grid */}
                  {!collapsed[module] && (
                    <div className="space-y-2 mt-2">
                      {Object.entries(modulePermissions).map(([permission, defaultValue]) => (
                        <div key={permission} className="flex items-center justify-between">
                          <label
                            htmlFor={`${module}-${permission}`}
                            className="pr-2 text-xs sm:text-sm text-gray-700 min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="block truncate">
                              {formatPermissionName(permission)}
                            </span>
                          </label>

                          {/* Toggle switch */}
                          <div className="relative inline-block w-10 sm:w-12 align-middle select-none flex-shrink-0">
                            <input
                              type="checkbox"
                              id={`${module}-${permission}`}
                              checked={form.permissions[module]?.[permission] || false}
                              onChange={(e) => {
                                const newPermissions = { ...form.permissions };
                                if (!newPermissions[module]) newPermissions[module] = {};
                                newPermissions[module][permission] = e.target.checked;
                                setForm(prev => ({ ...prev, permissions: newPermissions }));
                              }}
                              className="sr-only"
                            />
                            <div
                              className={`block h-5 sm:h-6 rounded-full cursor-pointer transition-colors duration-200 ${
                                form.permissions[module]?.[permission] ? 'bg-[#007c89]' : 'bg-gray-300'
                              }`}
                              onClick={() => {
                                const newPermissions = { ...form.permissions };
                                if (!newPermissions[module]) newPermissions[module] = {};
                                newPermissions[module][permission] = !form.permissions[module]?.[permission];
                                setForm(prev => ({ ...prev, permissions: newPermissions }));
                              }}
                            >
                              <div
                                className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-transform duration-200 ${
                                  form.permissions[module]?.[permission] ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                                }`}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collapsed summary */}
                  {collapsed[module] && (
                    <div className="mt-2">
                      {Object.values(form.permissions[module] || {}).some(v => v === true) ? (
                        <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                          <div className="font-medium mb-1">Selected:</div>
                          <div className="truncate">
                            {Object.keys(form.permissions[module] || {}).filter(k => form.permissions[module]?.[k]).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">
                          No permissions selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t gap-3">
            {/* Cancel button */}
            <Link
              to="../roles"
              className="px-3 sm:px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50 text-center"
            >
              Cancel
            </Link>

            {/* Action buttons */}
            <div className="flex flex-row items-stretch xs:items-center gap-2">
              {/* Reset button */}
              <button
                type="button"
                onClick={resetForm}
                className="px-3 sm:px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-50 order-2 xs:order-1"
              >
                Reset
              </button>

              {/* Submit button */}
              <button
                type="submit"
                disabled={processing || Object.keys(modules).length === 0 || !branches || branches.length === 0}
                className={`px-3 sm:px-4 py-2 text-white rounded text-sm flex items-center justify-center order-1 xs:order-2 ${
                  processing || Object.keys(modules).length === 0 || !branches || branches.length === 0
                    ? 'opacity-50 cursor-not-allowed bg-gray-400'
                    : 'bg-[#007c89] hover:bg-[#006d77]'
                }`}
              >
                {processing && (
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                )}
                {processing ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleEdit;