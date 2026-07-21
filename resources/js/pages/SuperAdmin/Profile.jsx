import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/plugins/axios';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });

  // Validation
  const validateForm = () => {
    const newErrors = {};
    
    if (form.new_password && form.new_password.length < 6) {
      newErrors.new_password = t('password_min_length', { min: 6 });
    }
    
    if (form.new_password !== form.new_password_confirmation) {
      newErrors.new_password_confirmation = t('passwords_do_not_match');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update profile
  const updateProfile = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    setErrors({});
    
    try {
      const response = await api.put('/super-admin/profile', form);
      setMessage(t('profile_updated_successfully'));
      setMessageType('success');
      
      // Update local storage
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Clear password fields
      setForm(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
      }));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors || {});
        setMessage(t('please_fix_errors'));
      } else {
        setMessage(error.response?.data?.message || t('error_updating_profile'));
      }
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel function
  const cancel = () => {
    navigate(-1);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Load user data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setForm(prev => ({
        ...prev,
        name: parsedUser.name,
        email: parsedUser.email
      }));
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t('profile_settings')}</h2>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              {t('manage_your_profile')}
            </p>
          )}
        </div>

        <form onSubmit={updateProfile} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleInputChange}
              type="text"
              required
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('enter_your_name')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('email')} <span className="text-red-500">*</span>
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleInputChange}
              type="email"
              required
              className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('enter_your_email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {t('change_password')}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({t('optional')})
              </span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('current_password')}
                </label>
                <input
                  name="current_password"
                  value={form.current_password}
                  onChange={handleInputChange}
                  type="password"
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.current_password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('enter_current_password')}
                />
                {errors.current_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_password[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('new_password')}
                </label>
                <input
                  name="new_password"
                  value={form.new_password}
                  onChange={handleInputChange}
                  type="password"
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.new_password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('enter_new_password')}
                />
                {errors.new_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {t('password_requirements')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirm_password')}
                </label>
                <input
                  name="new_password_confirmation"
                  value={form.new_password_confirmation}
                  onChange={handleInputChange}
                  type="password"
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.new_password_confirmation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('confirm_new_password')}
                />
                {errors.new_password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{errors.new_password_confirmation}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <i className="fas fa-times mr-2"></i>
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {t('saving')}
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  {t('save_changes')}
                </>
              )}
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-md flex items-start ${
              messageType === 'success' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              <i className={`fas fa-${messageType === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2 mt-0.5`}></i>
              <span>{message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile;