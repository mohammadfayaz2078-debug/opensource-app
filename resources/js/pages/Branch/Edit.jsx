import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';

const BranchEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [existingLogo, setExistingLogo] = useState('');
  
  const [form, setForm] = useState({
    branch_name: '',
    branch_slogan: '',
    branch_street_address: '',
    branch_village: '',
    branch_district: '',
    branch_province: '',
    branch_country: 'Afghanistan',
    branch_phone: '',
    branch_email: '',
    branch_website: '',
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
  
  const fetchBranch = async () => {
    setFetching(true);
    try {
      const response = await api.get(`/branches/${id}`);
      const branch = response.data.data || response.data.branch;
      
      setForm({
        branch_name: branch.branch_name || '',
        branch_slogan: branch.branch_slogan || '',
        branch_street_address: branch.branch_street_address || '',
        branch_village: branch.branch_village || '',
        branch_district: branch.branch_district || '',
        branch_province: branch.branch_province || '',
        branch_country: branch.branch_country || 'Afghanistan',
        branch_phone: branch.branch_phone || '',
        branch_email: branch.branch_email || '',
        branch_website: branch.branch_website || '',
        logo: null,
        is_active: branch.is_active === 1 || branch.is_active === true
      });
      
      if (branch.branch_logo_url) {
        setExistingLogo(branch.branch_logo_url);
      }
    } catch (err) {
      console.error('Error fetching branch:', err);
      setError(err.response?.data?.message || 'Failed to fetch branch data');
    } finally {
      setFetching(false);
    }
  };
  
  const submit = async (e) => {
    e.preventDefault();
    
    setErrors({});
    setError('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('branch_name', form.branch_name);
      if (form.branch_slogan) formData.append('branch_slogan', form.branch_slogan);
      if (form.branch_street_address) formData.append('branch_street_address', form.branch_street_address);
      if (form.branch_village) formData.append('branch_village', form.branch_village);
      if (form.branch_district) formData.append('branch_district', form.branch_district);
      if (form.branch_province) formData.append('branch_province', form.branch_province);
      if (form.branch_country) formData.append('branch_country', form.branch_country);
      if (form.branch_phone) formData.append('branch_phone', form.branch_phone);
      if (form.branch_email) formData.append('branch_email', form.branch_email);
      if (form.branch_website) formData.append('branch_website', form.branch_website);
      if (form.logo) formData.append('branch_logo_url', form.logo);
      formData.append('is_active', form.is_active ? 1 : 0);
      formData.append('_method', 'PUT'); // Laravel method spoofing
      
      const response = await api.post(`/branches/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.message) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.data.message,
          timer: 2000,
          showConfirmButton: false
        });
        
        navigate('../branches');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
      } else {
        setError(err.response?.data?.message || 'Failed to update branch');
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBranch();
  }, [id]);
  
  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading branch data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Edit Branch</h1>
            <p className="text-sm text-gray-500 mt-1">Update branch information</p>
          </div>
          <Link
            to="../branches"
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
            {/* Branch Name */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                name="branch_name"
                value={form.branch_name}
                onChange={handleInputChange}
                type="text"
                required
                placeholder="Enter branch name"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_name ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_name && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_name[0]}</p>
              )}
            </div>
            
            {/* Branch Slogan */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Branch Slogan
              </label>
              <input
                name="branch_slogan"
                value={form.branch_slogan}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter branch slogan"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_slogan ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_slogan && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_slogan[0]}</p>
              )}
            </div>
            
            {/* Province */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Province
              </label>
              <input
                name="branch_province"
                value={form.branch_province}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter province"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_province ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_province && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_province[0]}</p>
              )}
            </div>
            
            {/* District */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                District
              </label>
              <input
                name="branch_district"
                value={form.branch_district}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter district"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_district ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_district && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_district[0]}</p>
              )}
            </div>
            
            {/* Village */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Village
              </label>
              <input
                name="branch_village"
                value={form.branch_village}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter village"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_village ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_village && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_village[0]}</p>
              )}
            </div>
            
            {/* Country */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                name="branch_country"
                value={form.branch_country}
                onChange={handleInputChange}
                type="text"
                placeholder="Enter country"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_country ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_country && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_country[0]}</p>
              )}
            </div>
            
            {/* Phone */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                name="branch_phone"
                value={form.branch_phone}
                onChange={handleInputChange}
                type="tel"
                placeholder="Enter phone number"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_phone ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_phone && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_phone[0]}</p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                name="branch_email"
                value={form.branch_email}
                onChange={handleInputChange}
                type="email"
                placeholder="Enter email address"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_email ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_email && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_email[0]}</p>
              )}
            </div>
            
            {/* Website */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                name="branch_website"
                value={form.branch_website}
                onChange={handleInputChange}
                type="url"
                placeholder="https://example.com"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_website ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_website && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_website[0]}</p>
              )}
            </div>
            
            {/* Street Address (Full Width) */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Street Address
              </label>
              <textarea
                name="branch_street_address"
                value={form.branch_street_address}
                onChange={handleInputChange}
                rows="3"
                placeholder="Enter street address"
                className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:border-transparent ${
                  errors.branch_street_address ? 'border-red-500' : ''
                }`}
              />
              {errors.branch_street_address && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_street_address[0]}</p>
              )}
            </div>
            
            {/* Logo Upload (Full Width) */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Branch Logo
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
                    <p className="text-xs text-gray-500 mt-1">Click to upload new logo</p>
                    <p className="text-xs text-gray-400">Max size: 2MB</p>
                  </div>
                </div>
                
                {/* Existing Logo */}
                {existingLogo && !logoPreview && (
                  <div className="relative">
                    <img
                      src={`/storage/${existingLogo}`}
                      alt="Current logo"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">Current logo</p>
                  </div>
                )}
                
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
              {errors.branch_logo_url && (
                <p className="mt-1 text-xs text-red-600">{errors.branch_logo_url[0]}</p>
              )}
            </div>
            
            {/* Active Status (Full Width) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Active Status
                  </label>
                  <p className="text-xs text-gray-500">Enable or disable this branch</p>
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
              {loading ? 'Updating...' : 'Update Branch'}
            </button>
            
            <Link
              to="../branches"
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

export default BranchEdit;