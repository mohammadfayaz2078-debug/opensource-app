import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Store,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Users,
  Package
} from 'lucide-react';

const BranchCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  
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
        Swal.fire('Error', t('branch.error_image'), 'error');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('Error', t('branch.error_size'), 'error');
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
      
      const response = await api.post('/branches', formData, {
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
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        
        navigate('../branches');
      }
    } catch (err) {
      if (err.response?.status === 422) {
        const validationErrors = err.response.data.errors;
        setErrors(validationErrors);
        Swal.fire('Error', t('branch.error_form'), 'error');
      } else {
        setError(err.response?.data?.message || t('branch.create_failed'));
      }
    } finally {
      setLoading(false);
    }
  };
  
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
                <h1 className="text-lg font-semibold text-gray-800">{t('branch.create_title')}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{t('branch.create_subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          {/* Main Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            {/* Basic Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('branch.basic_info')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('branch.name')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="branch_name"
                      value={form.branch_name}
                      onChange={handleInputChange}
                      type="text"
                      required
                      placeholder={t('branch.name_placeholder')}
                      className={`w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border ${errors.branch_name ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.branch_name && (
                    <p className="text-xs text-red-500 mt-1">{errors.branch_name[0]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('branch.slogan')}
                  </label>
                  <input
                    name="branch_slogan"
                    value={form.branch_slogan}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t('branch.slogan_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                <MapPin className="w-4 h-4 inline mr-1 text-gray-400" />
                {t('branch.location')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('branch.province')}</label>
                  <input
                    name="branch_province"
                    value={form.branch_province}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t('branch.province_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('branch.district')}</label>
                  <input
                    name="branch_district"
                    value={form.branch_district}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t('branch.district_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('branch.village')}</label>
                  <input
                    name="branch_village"
                    value={form.branch_village}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t('branch.village_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('branch.country')}</label>
                  <input
                    name="branch_country"
                    value={form.branch_country}
                    onChange={handleInputChange}
                    type="text"
                    placeholder={t('branch.country_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('branch.street')}</label>
                <textarea
                  name="branch_street_address"
                  value={form.branch_street_address}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder={t('branch.street_placeholder')}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('branch.contact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {t('branch.phone')}
                  </label>
                  <input
                    name="branch_phone"
                    value={form.branch_phone}
                    onChange={handleInputChange}
                    type="tel"
                    placeholder={t('branch.phone_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {t('branch.email')}
                  </label>
                  <input
                    name="branch_email"
                    value={form.branch_email}
                    onChange={handleInputChange}
                    type="email"
                    placeholder={t('branch.email_placeholder')}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Globe className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {t('branch.website')}
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

            {/* Capacity Settings - New Section */}
            <div className="mb-4 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 inline mr-1 text-gray-400" />
                {t('branch.capacity')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Users className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {t('branch.allowed_users')}
                  </label>
                  <input
                    name="allowed_user_count"
                    value={form.allowed_user_count}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    max="999"
                    placeholder={t('branch.max_users_placeholder')}
                    className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.allowed_user_count ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('branch.max_users_hint')}</p>
                  {errors.allowed_user_count && (
                    <p className="text-xs text-red-500 mt-1">{errors.allowed_user_count[0]}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Package className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    {t('branch.allowed_products')}
                  </label>
                  <input
                    name="allowed_product_publish_count"
                    value={form.allowed_product_publish_count}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    max="99999"
                    placeholder={t('branch.max_products_placeholder')}
                    className={`w-full px-3 py-1.5 text-sm bg-gray-50 border ${errors.allowed_product_publish_count ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('branch.max_products_hint')}</p>
                  {errors.allowed_product_publish_count && (
                    <p className="text-xs text-red-500 mt-1">{errors.allowed_product_publish_count[0]}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t('branch.logo')}</h3>
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
                      {t('branch.upload_logo')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{t('branch.logo_hint')}</p>
                  </div>
                </div>
                
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
                <h3 className="text-sm font-medium text-gray-700">{t('branch.active_status')}</h3>
                <p className="text-xs text-gray-400">{t('branch.active_status_hint')}</p>
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
              {t('branch.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('branch.creating')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('branch.create_btn')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchCreate;