import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function WarehouseTowerCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    type: 'warehouse',
    street_address: '',
    village: '',
    district: '',
    province: '',
    country: 'Afghanistan',
    gps_lat: '',
    gps_lng: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/warehouse-towers', form);
      navigate('/warehouse-towers');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create location.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/warehouse-towers')} className="hover:text-[#007c89]">Locations</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">New Location</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Add Warehouse/Tower</h1>
        <p className="text-sm text-gray-500 mt-1">Register a new warehouse or telecommunication tower location</p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                      placeholder="e.g., Central Warehouse, Tower A-1"
                      autoFocus
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Type *
                    </label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className={inputClass('type')}
                    >
                      <option value="warehouse">Warehouse</option>
                      <option value="tower">Telecommunication Tower</option>
                    </select>
                    {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Address Information</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Street Address
                    </label>
                    <textarea
                      name="street_address"
                      value={form.street_address}
                      onChange={handleChange}
                      rows="2"
                      className={inputClass('street_address')}
                      placeholder="Street name, building number, etc."
                    />
                    {errors.street_address && <p className="text-red-500 text-xs mt-1">{errors.street_address[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Village
                    </label>
                    <input
                      name="village"
                      value={form.village}
                      onChange={handleChange}
                      className={inputClass('village')}
                      placeholder="Village name"
                    />
                    {errors.village && <p className="text-red-500 text-xs mt-1">{errors.village[0]}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        District
                      </label>
                      <input
                        name="district"
                        value={form.district}
                        onChange={handleChange}
                        className={inputClass('district')}
                        placeholder="District name"
                      />
                      {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district[0]}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Province
                      </label>
                      <input
                        name="province"
                        value={form.province}
                        onChange={handleChange}
                        className={inputClass('province')}
                        placeholder="Province name"
                      />
                      {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province[0]}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Country
                    </label>
                    <input
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className={inputClass('country')}
                    />
                    {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country[0]}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Coordinates */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">GPS Coordinates</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Latitude
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
                    {errors.gps_lat && <p className="text-red-500 text-xs mt-1">{errors.gps_lat[0]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Longitude
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
                    {errors.gps_lng && <p className="text-red-500 text-xs mt-1">{errors.gps_lng[0]}</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  You can get coordinates from Google Maps by right-clicking on a location and selecting "What's here?"
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Location will be available for inventory and asset management</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
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
                    Create Location
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/warehouse-towers')}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}