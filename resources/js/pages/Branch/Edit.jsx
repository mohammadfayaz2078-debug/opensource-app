import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Building2,
  AlertCircle,
  Image as ImageIcon,
  Users,
  Package
} from 'lucide-react';

const BranchEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [existingLogo, setExistingLogo] = useState('');
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [currentProductCount, setCurrentProductCount] = useState(0);
  
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
    is_active: true,
    allowed_user_count: 1,
    allowed_product_publish_count: 10
  });
  
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire('Error', 'Please upload a valid image file (JPEG, PNG, JPG, GIF, WEBP)', 'error');
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
      
      // Get current user and product counts from statistics
      const stats = response.data.statistics || {};
      setCurrentUserCount(stats.user_count || 0);
      setCurrentProductCount(stats.public_product_count || 0);
      
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
        is_active: branch.is_active === 1 || branch.is_active === true,
        allowed_user_count: branch.allowed_user_count || 1,
        allowed_product_publish_count: branch.allowed_product_publish_count || 10
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
      formData.append('allowed_user_count', form.allowed_user_count);
      formData.append('allowed_product_publish_count', form.allowed_product_publish_count);
      formData.append('_method', 'PUT');
      
      const response = await api.post(`/branches/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.message) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: response.data.message,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        navigate('../branches');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        
        // Set errors for form fields
        setErrors(validationErrors);
        
        // Check if there's a capacity error
        if (validationErrors.allowed_user_count) {
          const errorMessage = validationErrors.allowed_user_count[0];
          
          Swal.fire({
            icon: 'error',
            title: 'Cannot Reduce User Limit',
            html: `
              <div class="text-left">
                <p class="mb-2">${errorMessage}</p>
                <div class="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Current Users:</strong> ${currentUserCount}</p>
                  <p><strong>Current Limit:</strong> ${form.allowed_user_count}</p>
                  <p><strong>New Limit Attempted:</strong> ${form.allowed_user_count}</p>
                  <p class="mt-2 text-red-600">⚠️ Cannot reduce limit below current user count!</p>
                </div>
              </div>
            `,
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'OK'
          });
        } else if (validationErrors.allowed_product_publish_count) {
          const errorMessage = validationErrors.allowed_product_publish_count[0];
          
          Swal.fire({
            icon: 'error',
            title: 'Cannot Reduce Product Limit',
            html: `
              <div class="text-left">
                <p class="mb-2">${errorMessage}</p>
                <div class="bg-gray-50 p-3 rounded-lg">
                  <p><strong>Current Products:</strong> ${currentProductCount}</p>
                  <p><strong>Current Limit:</strong> ${form.allowed_product_publish_count}</p>
                  <p><strong>New Limit Attempted:</strong> ${form.allowed_product_publish_count}</p>
                  <p class="mt-2 text-red-600">⚠️ Cannot reduce limit below current product count!</p>
                </div>
              </div>
            `,
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'OK'
          });
        } else {
          // Generic validation error
          const errorMessages = Object.values(validationErrors).flat();
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            html: errorMessages.map(msg => `<p class="text-left">• ${msg}</p>`).join(''),
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'OK'
          });
        }
      } else {
        setError(err.response?.data?.message || 'Failed to update branch');
        Swal.fire('Error', err.response?.data?.message || 'Failed to update branch', 'error');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-sm text-gray-600">Loading branch data...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('../branches')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">Edit Branch</h1>
                <p className="text-xs text-gray-400 mt-0.5">Update branch information</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                form.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Current Usage Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current Users</p>
                  <p className="text-lg font-semibold text-gray-900">{currentUserCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Limit</p>
                  <p className="text-lg font-semibold text-gray-900">{form.allowed_user_count}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      currentUserCount >= form.allowed_user_count ? 'bg-red-500' : 
                      currentUserCount > form.allowed_user_count * 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min((currentUserCount / form.allowed_user_count) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current Products</p>
                  <p className="text-lg font-semibold text-gray-900">{currentProductCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Limit</p>
                  <p className="text-lg font-semibold text-gray-900">{form.allowed_product_publish_count}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      currentProductCount >= form.allowed_product_publish_count ? 'bg-red-500' : 
                      currentProductCount > form.allowed_product_publish_count * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((currentProductCount / form.allowed_product_publish_count) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          {/* Main Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            {/* Basic Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="branch_name"
                      value={form.branch_name}
                      onChange={handleInputChange}
                      type="text"
                      required
                      placeholder="Enter branch name"
                      className={`w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border ${errors.branch_name ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.branch_name && (
                    <p className="text-xs text-red-500 mt-1">{errors.branch_name[0]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slogan</label>
                  <input
                    name="branch_slogan"
                    value={form.branch_slogan}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Branch slogan"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
                Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Province</label>
                  <input
                    name="branch_province"
                    value={form.branch_province}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Enter province"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
                  <input
                    name="branch_district"
                    value={form.branch_district}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Enter district"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Village</label>
                  <input
                    name="branch_village"
                    value={form.branch_village}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Enter village"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <input
                    name="branch_country"
                    value={form.branch_country}
                    onChange={handleInputChange}
                    type="text"
                    placeholder="Enter country"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
                <textarea
                  name="branch_street_address"
                  value={form.branch_street_address}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Enter street address"
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Phone
                  </label>
                  <input
                    name="branch_phone"
                    value={form.branch_phone}
                    onChange={handleInputChange}
                    type="tel"
                    placeholder="Enter phone number"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Email
                  </label>
                  <input
                    name="branch_email"
                    value={form.branch_email}
                    onChange={handleInputChange}
                    type="email"
                    placeholder="Enter email address"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Globe className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Website
                  </label>
                  <input
                    name="branch_website"
                    value={form.branch_website}
                    onChange={handleInputChange}
                    type="url"
                    placeholder="https://example.com"
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Capacity Settings */}
            <div className="mb-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 inline mr-1 text-gray-400" />
                Capacity Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Allowed Users
                  </label>
                  <input
                    name="allowed_user_count"
                    value={form.allowed_user_count}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    max="999"
                    placeholder="Max users allowed"
                    className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.allowed_user_count ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Current users: {currentUserCount} • Cannot be less than current users
                  </p>
                  {errors.allowed_user_count && (
                    <p className="text-xs text-red-500 mt-1">{errors.allowed_user_count[0]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Package className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Allowed Product Publish
                  </label>
                  <input
                    name="allowed_product_publish_count"
                    value={form.allowed_product_publish_count}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    max="99999"
                    placeholder="Max products allowed"
                    className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.allowed_product_publish_count ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Current products: {currentProductCount} • Cannot be less than current products
                  </p>
                  {errors.allowed_product_publish_count && (
                    <p className="text-xs text-red-500 mt-1">{errors.allowed_product_publish_count[0]}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Branch Logo</h3>
              <div className="flex items-center gap-4">
                <div
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  onClick={triggerFileInput}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 group-hover:text-blue-600 transition-colors">
                      Click to upload new logo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WEBP • Max 2MB</p>
                  </div>
                </div>
                
                {/* Existing Logo */}
                {existingLogo && !logoPreview && (
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={`/storage/${existingLogo}`}
                        alt="Current logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">Current logo</p>
                  </div>
                )}
                
                {/* Logo Preview */}
                {logoPreview && (
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs text-blue-500 mt-1 text-center">New logo</p>
                  </div>
                )}
              </div>
              {errors.branch_logo_url && (
                <p className="text-xs text-red-500 mt-1">{errors.branch_logo_url[0]}</p>
              )}
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Active Status</h3>
                <p className="text-xs text-gray-400">Enable or disable this branch</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate('../branches')}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Branch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchEdit;