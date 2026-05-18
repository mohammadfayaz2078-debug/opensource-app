import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const UserCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Options state
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    role_id: '',
    branch_id: '',
    status: true,
    language: 'en'
  });
  
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
  
  // Fetch roles and branches
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const res = await api.get('/register/options');
      setRoles(res.data.roles || []);
      setBranches(res.data.branches || []);
    } catch (err) {
      console.error('Failed to fetch options:', err);
      setError('Failed to load roles and branches');
    } finally {
      setLoadingOptions(false);
    }
  };
  
  const submit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        phone: form.phone,
        role_id: form.role_id,
        branch_id: form.branch_id,
        status: form.status,
        language: form.language
      };
      
      const response = await api.post('/register', payload);
      
      if (response.data.message) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'User created successfully',
          timer: 2000,
          showConfirmButton: false
        });
        
        navigate('/users');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message || 'Failed to create user');
        Swal.fire('Error', error, 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOptions();
  }, []);
  
  return (
    <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Create New User</h1>
          <Link
            to="/users"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
        
        <form onSubmit={submit} className="p-6">
          <div className="space-y-5">
            {/* Name Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleInputChange}
                  type="text"
                  required
                  placeholder="Enter first name"
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                    errors.first_name ? 'border-red-500' : ''
                  }`}
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.first_name[0]}</p>
                )}
              </div>
              
              {/* Last Name */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleInputChange}
                  type="text"
                  required
                  placeholder="Enter last name"
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                    errors.last_name ? 'border-red-500' : ''
                  }`}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.last_name[0]}</p>
                )}
              </div>
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
            
            {/* Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleInputChange}
                type="tel"
                placeholder="Enter phone number"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.phone ? 'border-red-500' : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone[0]}</p>
              )}
            </div>
            
            {/* Password Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
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
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password_confirmation"
                    value={form.password_confirmation}
                    onChange={handleInputChange}
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm password"
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
            
            {/* Role and Branch Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  name="role_id"
                  value={form.role_id}
                  onChange={handleInputChange}
                  required
                  disabled={loadingOptions}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                    errors.role_id ? 'border-red-500' : ''
                  }`}
                >
                  <option value="" disabled>Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.role_name || role.position}
                    </option>
                  ))}
                </select>
                {errors.role_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.role_id[0]}</p>
                )}
              </div>
              
              {/* Branch */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  name="branch_id"
                  value={form.branch_id}
                  onChange={handleInputChange}
                  required
                  disabled={loadingOptions}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                    errors.branch_id ? 'border-red-500' : ''
                  }`}
                >
                  <option value="" disabled>Select a branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name} - {branch.branch_province || branch.city}
                    </option>
                  ))}
                </select>
                {errors.branch_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.branch_id[0]}</p>
                )}
              </div>
            </div>
            
            {/* Status (Full Width) */}
            <div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    User Status
                  </label>
                  <p className="text-xs text-gray-500">Enable or disable this user account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    name="status"
                    type="checkbox"
                    checked={form.status}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#007c89] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007c89]"></div>
                </label>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#007c89] text-white px-4 py-2 rounded-md hover:bg-[#006d77] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading && (
                <svg className="inline animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
              {loading ? 'Creating...' : 'Create User'}
            </button>
            
            <Link
              to="/users"
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

export default UserCreate;