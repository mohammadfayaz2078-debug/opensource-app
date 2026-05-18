import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const CompanyCreate = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    email: '', // Manager email
    manager_password: '',
    manager_password_confirmation: '',
    company_phone: '',
    company_address: '',
    city: '',
    manager_name: '',
    manager_phone: '',
    logo: null,
    is_active: true
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
      manager_password: password,
      manager_password_confirmation: password
    }));
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire('Error', 'Please upload a valid image file (JPEG, PNG, JPG, GIF)', 'error');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('Error', 'File size must be less than 2MB', 'error');
        return;
      }
      
      setForm(prev => ({
        ...prev,
        logo: file
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeLogo = () => {
    setForm(prev => ({
      ...prev,
      logo: null
    }));
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const submit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('company_name', form.company_name);
      formData.append('company_email', form.company_email);
      formData.append('email', form.email); // Add manager email
      formData.append('manager_password', form.manager_password);
      formData.append('manager_password_confirmation', form.manager_password_confirmation);
      formData.append('manager_name', form.manager_name);
      if (form.manager_phone) formData.append('manager_phone', form.manager_phone);
      if (form.company_phone) formData.append('company_phone', form.company_phone);
      if (form.company_address) formData.append('company_address', form.company_address);
      if (form.city) formData.append('city', form.city);
      if (form.logo) formData.append('logo', form.logo);
      formData.append('is_active', form.is_active ? 1 : 0);
      formData.append('language', 'en'); // Always set language to English
      
      const response = await api.post('/super-admin/companies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Company created successfully',
          timer: 2000,
          showConfirmButton: false
        });
        
        navigate('/super-admin/companies');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
      } else {
        setError(err.response?.data?.message || 'Failed to create company');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Create New Company</h1>
          <Link
            to="/super-admin/companies"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
        
        <form onSubmit={submit} className="p-6">
          {/* Two Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={handleInputChange}
                type="text"
                required
                placeholder="Enter company name"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.company_name ? 'border-red-500' : ''
                }`}
              />
              {errors.company_name && (
                <p className="mt-1 text-xs text-red-600">{errors.company_name[0]}</p>
              )}
            </div>
            
            {/* Company Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Company Email <span className="text-red-500">*</span>
              </label>
              <input
                name="company_email"
                value={form.company_email}
                onChange={handleInputChange}
                type="email"
                required
                placeholder="Enter company email"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.company_email ? 'border-red-500' : ''
                }`}
              />
              {errors.company_email && (
                <p className="mt-1 text-xs text-red-600">{errors.company_email[0]}</p>
              )}
            </div>
            
            {/* Manager Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Manager Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleInputChange}
                type="email"
                required
                placeholder="Enter manager email address"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>
              )}
            </div>
            
            {/* Manager Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Manager Name <span className="text-red-500">*</span>
              </label>
              <input
                name="manager_name"
                value={form.manager_name}
                onChange={handleInputChange}
                type="text"
                required
                placeholder="Enter manager name"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.manager_name ? 'border-red-500' : ''
                }`}
              />
              {errors.manager_name && (
                <p className="mt-1 text-xs text-red-600">{errors.manager_name[0]}</p>
              )}
            </div>
            
            {/* Manager Password */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Manager Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="manager_password"
                  value={form.manager_password}
                  onChange={handleInputChange}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent pr-24 ${
                    errors.manager_password ? 'border-red-500' : ''
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
              {errors.manager_password && (
                <p className="mt-1 text-xs text-red-600">{errors.manager_password[0]}</p>
              )}
            </div>
            
            {/* Confirm Password */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="manager_password_confirmation"
                  value={form.manager_password_confirmation}
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
            
            {/* Manager Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Manager Phone
              </label>
              <input
                name="manager_phone"
                value={form.manager_phone}
                onChange={handleInputChange}
                type="tel"
                placeholder="Enter manager phone number"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.manager_phone ? 'border-red-500' : ''
                }`}
              />
              {errors.manager_phone && (
                <p className="mt-1 text-xs text-red-600">{errors.manager_phone[0]}</p>
              )}
            </div>
            
            {/* Company Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Company Phone
              </label>
              <input
                name="company_phone"
                value={form.company_phone}
                onChange={handleInputChange}
                type="tel"
                placeholder="Enter company phone number"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.company_phone ? 'border-red-500' : ''
                }`}
              />
              {errors.company_phone && (
                <p className="mt-1 text-xs text-red-600">{errors.company_phone[0]}</p>
              )}
            </div>
            
            {/* City */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                City
              </label>
              <input
                name="city"
                value={form.city}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter city name"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.city ? 'border-red-500' : ''
                }`}
              />
              {errors.city && (
                <p className="mt-1 text-xs text-red-600">{errors.city[0]}</p>
              )}
            </div>
            
            {/* Company Address (Full Width) */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Company Address
              </label>
              <textarea
                name="company_address"
                value={form.company_address}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter company address"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.company_address ? 'border-red-500' : ''
                }`}
              />
              {errors.company_address && (
                <p className="mt-1 text-xs text-red-600">{errors.company_address[0]}</p>
              )}
            </div>
            
            {/* Logo Upload (Full Width) */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Company Logo
              </label>
              <div className="flex items-center space-x-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-4 hover:border-[#007c89] transition cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-gray-500 mt-1">Click to upload logo</p>
                    <p className="text-xs text-gray-400">Max size: 2MB</p>
                  </div>
                </div>
                
                {/* Logo Preview */}
                {logoPreview && (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              {errors.logo && (
                <p className="mt-1 text-xs text-red-600">{errors.logo[0]}</p>
              )}
            </div>
            
            {/* Active Status (Full Width) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Active Status
                  </label>
                  <p className="text-xs text-gray-500">Enable or disable this company</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
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
              {loading ? 'Creating...' : 'Create Company'}
            </button>
            
            <Link
              to="/super-admin/companies"
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

export default CompanyCreate;