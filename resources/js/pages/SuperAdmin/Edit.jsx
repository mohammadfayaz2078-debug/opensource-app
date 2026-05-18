// pages/SuperAdmin/Edit.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const SuperAdminEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({
      ...prev,
      password: password,
      password_confirmation: password
    }));
  };
  
  const fetchSuperAdmin = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/super-admin/super-admins/${id}`);
      
      if (response.data.success) {
        const admin = response.data.data;
        setForm({
          name: admin.name || '',
          email: admin.email || '',
          password: '',
          password_confirmation: ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch super admin:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load super admin data';
      setError(errorMsg);
      Swal.fire('Error', errorMsg, 'error');
      navigate('/super-admin/super-admins');
    } finally {
      setLoading(false);
    }
  };
  
  const submit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setError('');
    setSaving(true);
    
    try {
      const data = {
        name: form.name,
        email: form.email
      };
      
      if (form.password) {
        data.password = form.password;
        data.password_confirmation = form.password_confirmation;
      }
      
      const response = await api.put(`/super-admin/super-admins/${id}`, data);
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Super admin updated successfully',
          timer: 2000,
          showConfirmButton: false
        });
        
        navigate('/super-admin/super-admins');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to update super admin';
        setError(errorMsg);
        Swal.fire('Error', errorMsg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };
  
  useEffect(() => {
    fetchSuperAdmin();
  }, [id]);
  
  if (loading) {
    return (
      <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <p className="mt-3 text-sm text-gray-600">Loading super admin data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Edit Super Admin</h1>
          <Link
            to="/super-admin/super-admins"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
        
        <form onSubmit={submit} className="p-6">
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleInputChange}
                type="text"
                required
                placeholder="Enter full name"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.name ? 'border-red-500' : ''
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleInputChange}
                type="email"
                required
                placeholder="Enter email address"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
              )}
            </div>
            
            {/* Password (Optional on edit) */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Password
                <span className="text-gray-400 text-xs font-normal ml-2">(leave blank to keep current)</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  value={form.password}
                  onChange={handleInputChange}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent pr-24 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={generatePassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
                >
                  Generate
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password[0]}</p>
              )}
            </div>
            
            {/* Confirm Password */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleInputChange}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#007c89] text-white px-4 py-2 rounded-md hover:bg-[#006d77] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {saving && (
                <svg className="inline animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              {saving ? 'Updating...' : 'Update Super Admin'}
            </button>
            
            <Link
              to="/super-admin/super-admins"
              className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-center text-sm font-medium"
            >
              Cancel
            </Link>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SuperAdminEdit;