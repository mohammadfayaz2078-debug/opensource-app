import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function SupplierCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    supplier_code: '',
    first_name: '',
    last_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
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
      await api.post('/suppliers', form);
      navigate('/suppliers');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create supplier.' });
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
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <button onClick={() => navigate('/suppliers')} className="hover:text-[#007c89]">Suppliers</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Supplier</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Add Supplier</h1>
      </div>

      {errors.general && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Supplier Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Supplier Information</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Supplier Code
                  </label>
                  <input
                    name="supplier_code"
                    value={form.supplier_code}
                    onChange={handleChange}
                    className={inputClass('supplier_code')}
                    placeholder="Auto-generated if empty"
                  />
                  {errors.supplier_code && <p className="text-red-500 text-xs mt-0.5">{errors.supplier_code[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    First Name *
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
                    Last Name
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
              <h2 className="text-base font-medium text-gray-900">Contact Information</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Contact Person
                  </label>
                  <input
                    name="contact_person"
                    value={form.contact_person}
                    onChange={handleChange}
                    className={inputClass('contact_person')}
                    placeholder="Main point of contact"
                  />
                  {errors.contact_person && <p className="text-red-500 text-xs mt-0.5">{errors.contact_person[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Phone
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
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass('email')}
                    placeholder="supplier@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email[0]}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Address</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Street Address
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows="1"
                    className={inputClass('address')}
                    placeholder="Street, building, etc."
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-0.5">{errors.address[0]}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      City
                    </label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className={inputClass('city')}
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-0.5">{errors.city[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      Country
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
          </div>

          {/* Additional Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Additional Information</h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                    Notes
                  </label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    rows="2"
                    className={inputClass('note')}
                    placeholder="Any additional information about this supplier..."
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
                    Active (available for purchases)
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Create Supplier
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
