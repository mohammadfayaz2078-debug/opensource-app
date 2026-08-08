import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const UserProfile = () => {
  // State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [errors, setErrors] = useState({});
  const [authUser, setAuthUser] = useState(null);
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form data
  const [form, setForm] = useState({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  
  // Translation helper
  const { t } = useTranslation();
  
  // Check if user is admin
  const isAdmin = useMemo(() => {
    return authUser?.user?.role?.role_name === 'admin' || authUser?.user_type === 'company_admin';
  }, [authUser]);

  // Check if changing password
  const isChangingPassword = useMemo(() => {
    return !!form.new_password || !!form.current_password || !!form.new_password_confirmation;
  }, [form.new_password, form.current_password, form.new_password_confirmation]);
  
  // Check if form has changes
  const hasFormChanges = useMemo(() => {
    if (!user) return false;
    const basicInfoChanged = form.name !== user.name || form.email !== user.email;
    const passwordChanged = isChangingPassword;
    return basicInfoChanged || passwordChanged;
  }, [form, user, isChangingPassword]);
  
  // Fetch auth user
  const fetchAuthUser = async () => {
    try {
      const res = await api.get('/user-me');
      setAuthUser(res.data);
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
    }
  };
  
  // Fetch user profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      setUser(response.data.user);
      resetForm(response.data.user);
    } catch (err) {
      showErrorToast(t('profile.load_failed'));
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = (userData = user) => {
    if (userData) {
      setForm({
        name: userData.name,
        email: userData.email,
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      });
    }
    setErrors({});
  };
  
  // Validate passwords in real-time
  const validatePasswords = useCallback(() => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.current_password;
      delete newErrors.new_password;
      delete newErrors.new_password_confirmation;
      
      if (isChangingPassword) {
        if (!form.current_password && (form.new_password || form.new_password_confirmation)) {
          newErrors.current_password = [t('profile.err_current_required')];
        }
        
        if (form.new_password && form.new_password.length < 8) {
          newErrors.new_password = [t('profile.err_password_min')];
        }
        
        if (form.new_password && form.new_password_confirmation && 
            form.new_password !== form.new_password_confirmation) {
          newErrors.new_password_confirmation = [t('profile.err_passwords_mismatch')];
        }
      }
      
      return newErrors;
    });
  }, [isChangingPassword, form.current_password, form.new_password, form.new_password_confirmation]);
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = [t('profile.err_name_required')];
    }
    
    if (!form.email.trim()) {
      newErrors.email = [t('profile.err_email_required')];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = [t('profile.err_email_invalid')];
    }
    
    if (form.new_password || form.current_password || form.new_password_confirmation) {
      if (!form.current_password) {
        newErrors.current_password = ['Current password is required'];
      }
      
      if (!form.new_password) {
        newErrors.new_password = [t('profile.err_new_password_required')];
      } else if (form.new_password.length < 8) {
        newErrors.new_password = ['Password must be at least 8 characters'];
      }
      
      if (!form.new_password_confirmation) {
        newErrors.new_password_confirmation = [t('profile.err_confirm_required')];
      } else if (form.new_password !== form.new_password_confirmation) {
        newErrors.new_password_confirmation = ['Passwords do not match'];
      }
    }
    
    return newErrors;
  };
  
  // Prepare request data
  const prepareRequestData = () => {
    const data = {
      name: form.name,
      email: form.email,
    };
    
    if (form.new_password) {
      data.current_password = form.current_password;
      data.new_password = form.new_password;
      data.new_password_confirmation = form.new_password_confirmation;
    }
    
    return data;
  };
  
  // Update profile
  const updateProfile = async (e) => {
    e.preventDefault();
    
    setErrors({});
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showErrorToast(t('profile.toast_fix_errors'));
      return;
    }
    
    setSaving(true);
    
    try {
      const requestData = prepareRequestData();
      const response = await api.put('/profile', requestData);
      
      setUser(response.data.user);
      setForm(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      }));
      
      showSuccessToast(response.data.message);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        showErrorToast(err.response.data.message || t('profile.validation_failed'));
      } else if (err.response?.status === 401) {
        showErrorToast(t('profile.session_expired'));
      } else {
        showErrorToast(err.response?.data?.message || t('profile.update_failed'));
      }
    } finally {
      setSaving(false);
    }
  };
  
  // Backup download
  const handleBackupDownload = async () => {
    try {
      setBackupDownloading(true);
      
      const loadingToast = Swal.fire({
        title: t('profile.preparing_backup'),
        text: t('profile.backup_wait'),
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await api.get('/backup/download', {
        responseType: 'blob',
        headers: {
          'Accept': 'application/sql'
        }
      });
      
      Swal.close();
      
      const contentType = response.headers['content-type'];
      
      if (contentType && contentType.includes('application/json')) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            showErrorToast(errorData.message || t('profile.backup_failed'));
          } catch (e) {
            showErrorToast(t('profile.backup_failed'));
          }
        };
        reader.readAsText(response.data);
      } else {
        let filename = 'bazarnet_system_backup.sql';
        const contentDisposition = response.headers['content-disposition'];
        
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        const blob = new Blob([response.data], { type: 'application/sql' });
        downloadFile(blob, filename);
      }
    } catch (error) {
      Swal.close();
      console.error('Backup download error:', error);
      
      if (error.response && error.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            showErrorToast(errorData.message || t('profile.backup_failed'));
          } catch (e) {
            showErrorToast(t('profile.backup_download_failed'));
          }
        };
        reader.readAsText(error.response.data);
      } else {
        showErrorToast(error.response?.data?.message || t('profile.backup_download_failed'));
      }
    } finally {
      setBackupDownloading(false);
    }
  };
  
  // Download file helper
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showSuccessToast(t('profile.backup_downloaded'));
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
      title: message || t('profile.error_occurred')
    });
  };
  
  // Format date
  const formatSimpleDate = (dateString) => {
    if (!dateString) return t('profile.na');
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return t('profile.invalid_date');
    }
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Watch for password changes
  useEffect(() => {
    validatePasswords();
  }, [form.current_password, form.new_password, form.new_password_confirmation, validatePasswords]);
  
  // Initialize
  useEffect(() => {
    const init = async () => {
      await fetchAuthUser();
      await fetchProfile();
    };
    init();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }
  
  if (!user) return null;
  
  // Get initials for avatar
  const getInitials = () => {
    if (!user.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100/50 mb-6">
          <div className="relative">
            {/* Cover Image */}
            <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            {/* Profile Info */}
            <div className="px-6 pb-6">
              <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white">
                    {getInitials()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                
                {/* Name & Role */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {user.position?.position || t('profile.role_user')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {user.email}
                    </span>
                  </div>
                </div>
                
                {/* Backup Button — the backend restricts database backups to the
                    platform super admin only, so the button is only shown to them. */}
                {authUser?.user_type === 'superadmin' && (
                  <button
                    onClick={handleBackupDownload}
                    disabled={backupDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {backupDownloading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('profile.downloading')}
                      </>
                    ) : t('profile.backup_database')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{t('profile.member_since')}</p>
                <p className="text-sm font-semibold text-gray-800">{formatSimpleDate(user.created_at)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{t('profile.email_status')}</p>
                <p className="text-sm font-semibold text-gray-800">
                  {user.email_verified_at ? t('profile.verified') : t('profile.unverified')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">{t('profile.last_updated')}</p>
                <p className="text-sm font-semibold text-gray-800">{formatSimpleDate(user.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100/50">
          <form onSubmit={updateProfile} className="p-6">
            {/* Personal Information */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('profile.personal_info')}</h2>
                  <p className="text-sm text-gray-500">{t('profile.personal_info_hint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">
                    {t('profile.full_name')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      placeholder={t('profile.placeholder_name')}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name[0]}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    {t('profile.email_address')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      placeholder={t('profile.placeholder_email')}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email[0]}</p>}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="mb-8 border-t border-gray-200 pt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('profile.change_password')}</h2>
                  <p className="text-sm text-gray-500">{t('profile.change_password_hint')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label htmlFor="current_password" className="text-sm font-medium text-gray-700">
                    {t('profile.current_password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="current_password"
                      name="current_password"
                      value={form.current_password}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                        errors.current_password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      placeholder={t('profile.placeholder_current_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.current_password && <p className="text-xs text-red-500 font-medium">{errors.current_password[0]}</p>}
                </div>

                {/* New Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="new_password" className="text-sm font-medium text-gray-700">
                      {t('profile.new_password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="new_password"
                        name="new_password"
                        value={form.new_password}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                          errors.new_password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                        placeholder={t('profile.placeholder_new_password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{t('profile.min_chars')}</p>
                    {errors.new_password && <p className="text-xs text-red-500 font-medium">{errors.new_password[0]}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="new_password_confirmation" className="text-sm font-medium text-gray-700">
                      {t('profile.confirm_password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="new_password_confirmation"
                        name="new_password_confirmation"
                        value={form.new_password_confirmation}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                          errors.new_password_confirmation ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                        placeholder={t('profile.placeholder_confirm_password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.new_password_confirmation && <p className="text-xs text-red-500 font-medium">{errors.new_password_confirmation[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving || !hasFormChanges}
                className={`flex-1 inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  saving || !hasFormChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {saving && (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {!saving && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? t('profile.saving_changes') : t('profile.save_changes')}
              </button>
              
              <button
                type="button"
                onClick={() => resetForm()}
                disabled={saving}
                className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('profile.reset')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;