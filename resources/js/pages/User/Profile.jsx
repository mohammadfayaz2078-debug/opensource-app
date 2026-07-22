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
  
  // Check if user is admin (super_admin, company_admin, or branch admin)
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
      showErrorToast('Failed to load profile');
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
          newErrors.current_password = ['Current password is required'];
        }
        
        if (form.new_password && form.new_password.length < 8) {
          newErrors.new_password = ['Password must be at least 8 characters'];
        }
        
        if (form.new_password && form.new_password_confirmation && 
            form.new_password !== form.new_password_confirmation) {
          newErrors.new_password_confirmation = ['Passwords do not match'];
        }
      }
      
      return newErrors;
    });
  }, [isChangingPassword, form.current_password, form.new_password, form.new_password_confirmation]);
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = ['Name is required'];
    }
    
    if (!form.email.trim()) {
      newErrors.email = ['Email is required'];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = ['Please enter a valid email address'];
    }
    
    if (form.new_password || form.current_password || form.new_password_confirmation) {
      if (!form.current_password) {
        newErrors.current_password = ['Current password is required'];
      }
      
      if (!form.new_password) {
        newErrors.new_password = ['New password is required'];
      } else if (form.new_password.length < 8) {
        newErrors.new_password = ['Password must be at least 8 characters'];
      }
      
      if (!form.new_password_confirmation) {
        newErrors.new_password_confirmation = ['Please confirm your new password'];
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
      showErrorToast('Please fix the form errors');
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
        showErrorToast(err.response.data.message || 'Validation failed');
      } else if (err.response?.status === 401) {
        showErrorToast('Your session has expired. Please log in again.');
      } else {
        showErrorToast(err.response?.data?.message || 'Failed to update profile');
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
        title: 'Preparing Backup',
        text: 'Please wait while we generate your database backup...',
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
            showErrorToast(errorData.message || 'Backup failed');
          } catch (e) {
            showErrorToast('Backup failed');
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
            showErrorToast(errorData.message || 'Backup failed');
          } catch (e) {
            showErrorToast('Failed to download backup');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        showErrorToast(error.response?.data?.message || 'Failed to download backup');
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
    showSuccessToast('Backup downloaded successfully!');
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
  
  // Format date
  const formatSimpleDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return 'Invalid date';
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-3 md:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent"></div>
              <p className="mt-3 text-gray-500 font-medium">{t('profile_loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-3 md:py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header with Title and Backup Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t('profile_title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('profile_subtitle')}</p>
            </div>
            
            {isAdmin && (
              <button
                onClick={handleBackupDownload}
                disabled={backupDownloading}
                className="mt-4 sm:mt-0 inline-flex items-center rounded-md bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-700 border border-gray-300 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {backupDownloading ? t('profile_downloading') : t('profile_backup')}
              </button>
            )}
          </div>
          
          {/* Profile Form */}
          <form onSubmit={updateProfile} className="p-6 space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('profile_personal_info')}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{t('profile_personal_subtitle')}</p>
              </div>
              
              {/* Role Information */}
              <div className="grid grid-cols-1 gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('profile_position')}</p>
                  <p className="text-gray-800 font-semibold">{user.position?.position || t('profile_na')}</p>
                </div>
              </div>
              
              {/* Name Input */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t('profile_full_name')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                    placeholder={t('profile_name_placeholder')}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name[0]}</p>}
              </div>
              
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('profile_email_address')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.email ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                    placeholder={t('profile_email_placeholder')}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email[0]}</p>}
              </div>
            </div>
            
            {/* Password Change Section */}
            <div className="space-y-5 pt-6 border-t border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {t('profile_change_password')}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{t('profile_password_subtitle')}</p>
              </div>
              
              {/* Current Password */}
              <div className="space-y-2">
                <label htmlFor="current_password" className="text-sm font-medium text-gray-700">
                  {t('profile_current_password')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="current_password"
                    name="current_password"
                    value={form.current_password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 ${
                      errors.current_password ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                    placeholder={t('profile_current_password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
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
              <div className="space-y-2">
                <label htmlFor="new_password" className="text-sm font-medium text-gray-700">
                  {t('profile_new_password')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="new_password"
                    name="new_password"
                    value={form.new_password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 ${
                      errors.new_password ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                    placeholder={t('profile_new_password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
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
                {errors.new_password && <p className="text-xs text-red-500 font-medium">{errors.new_password[0]}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('profile_minimum_chars')}
                </p>
              </div>
              
              {/* Confirm New Password */}
              <div className="space-y-2">
                <label htmlFor="new_password_confirmation" className="text-sm font-medium text-gray-700">
                  {t('profile_confirm_password')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="new_password_confirmation"
                    name="new_password_confirmation"
                    value={form.new_password_confirmation}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 ${
                      errors.new_password_confirmation ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                    placeholder={t('profile_confirm_password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
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
            
            {/* Account Information */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('profile_account_info')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('profile_member_since')}</p>
                  <p className="text-sm font-medium text-gray-800">{formatSimpleDate(user.created_at)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('profile_last_updated')}</p>
                  <p className="text-sm font-medium text-gray-800">{formatSimpleDate(user.updated_at)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{t('profile_email_status')}</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.email_verified_at ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-medium ${user.email_verified_at ? 'text-green-600' : 'text-red-600'}`}>
                      {user.email_verified_at ? t('profile_verified') : t('profile_unverified')}
                    </span>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Form Actions */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saving || !hasFormChanges}
                  className={`flex-1 inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    saving ? 'bg-blue-400 cursor-not-allowed' : hasFormChanges ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                  {saving ? t('profile_saving_changes') : t('profile_save_changes')}
                </button>
                
                <button
                  type="button"
                  onClick={() => resetForm()}
                  disabled={saving}
                  className={`inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
                    saving ? 'bg-gray-100 cursor-not-allowed' : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('profile_reset')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;