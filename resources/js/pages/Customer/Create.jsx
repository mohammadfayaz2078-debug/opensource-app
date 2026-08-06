import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function CustomerCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    user_code: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    street_address: '',
    district: '',
    province: '',
    gps_lat: '',
    gps_lng: '',
    country: 'Afghanistan',
    note: '',
    is_active: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/customers', form);
      navigate('/customers');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || t('customer.create_failed') });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
          <button onClick={() => navigate('/customers')} className="hover:text-[#007c89]">{t('customer.breadcrumb')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{t('customer.new_customer')}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{t('customer.add_customer')}</h1>
      </div>

      {errors.general && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Customer Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('customer.info')}</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.code_field')}
                  </label>
                  <input
                    name="user_code"
                    value={form.user_code}
                    onChange={handleChange}
                    className={inputClass('user_code')}
                    placeholder={t('customer.code_placeholder')}
                  />
                  {errors.user_code && <p className="text-red-500 text-xs mt-0.5">{errors.user_code[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.first_name')} *
                  </label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className={inputClass('first_name')}
                    required
                  />
                  {errors.first_name && <p className="text-red-500 text-xs mt-0.5">{errors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.last_name')}
                  </label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className={inputClass('last_name')}
                  />
                  {errors.last_name && <p className="text-red-500 text-xs mt-0.5">{errors.last_name[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('customer.contact_info')}</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.phone_label')}
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClass('phone')}
                    placeholder="+93 XX XXX XXXX"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-0.5">{errors.phone[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.email_label')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass('email')}
                    placeholder="customer@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Address & Location */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('customer.address_location')}</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.street_address')}
                  </label>
                  <textarea
                    name="street_address"
                    value={form.street_address}
                    onChange={handleChange}
                    rows="1"
                    className={inputClass('street_address')}
                    placeholder={t('customer.street_placeholder')}
                  />
                  {errors.street_address && <p className="text-red-500 text-xs mt-0.5">{errors.street_address[0]}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('customer.district')}
                    </label>
                    <input
                      name="district"
                      value={form.district}
                      onChange={handleChange}
                      className={inputClass('district')}
                      placeholder={t('customer.district_placeholder')}
                    />
                    {errors.district && <p className="text-red-500 text-xs mt-0.5">{errors.district[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('customer.province')}
                    </label>
                    <input
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      className={inputClass('province')}
                      placeholder={t('customer.province_placeholder')}
                    />
                    {errors.province && <p className="text-red-500 text-xs mt-0.5">{errors.province[0]}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('customer.gps_lat')}
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      name="gps_lat"
                      value={form.gps_lat}
                      onChange={handleChange}
                      className={inputClass('gps_lat')}
                      placeholder="e.g., 34.5553"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {t('customer.gps_lng')}
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      name="gps_lng"
                      value={form.gps_lng}
                      onChange={handleChange}
                      className={inputClass('gps_lng')}
                      placeholder="e.g., 69.2075"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.country')}
                  </label>
                  <input
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className={inputClass('country')}
                  />
                  {errors.country && <p className="text-red-500 text-xs mt-0.5">{errors.country[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">{t('customer.additional_info')}</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    {t('customer.notes')}
                  </label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows="2"
                    className={inputClass('note')}
                    placeholder={t('customer.notes_placeholder')}
                  />
                  {errors.note && <p className="text-red-500 text-xs mt-0.5">{errors.note[0]}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="h-3.5 w-3.5 text-[#007c89] focus:ring-[#007c89] border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">
                    {t('customer.active_for_sales')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-6 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {t('customer.creating')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('customer.create_customer')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
