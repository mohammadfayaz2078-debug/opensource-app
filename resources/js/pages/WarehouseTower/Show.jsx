import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function WarehouseTowerShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocation();
  }, [id]);

  const fetchLocation = async () => {
    try {
      const res = await api.get(`/warehouse-towers/${id}`);
      setLocation(res.data.data);
    } catch (err) {
      console.error('Failed to fetch location', err);
      navigate('/warehouse-towers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this location? This action cannot be undone.')) return;
    try {
      await api.delete(`/warehouse-towers/${id}`);
      navigate('/warehouse-towers');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'warehouse') {
      return (
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading location...</span>
      </div>
    );
  }

  if (!location) return null;

  // Google Maps URL
  const mapUrl = location.gps_lat && location.gps_lng 
    ? `https://www.openstreetmap.org/?mlat=${location.gps_lat}&mlon=${location.gps_lng}#map=15/${location.gps_lat}/${location.gps_lng}`
    : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/warehouse-towers')} className="hover:text-[#007c89]">Locations</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{location.name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {getTypeIcon(location.type)}
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{location.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {location.type === 'warehouse' ? 'Warehouse Facility' : 'Telecommunication Tower'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/warehouse-towers/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Address</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-3">
                {location.street_address && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Street Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{location.street_address}</dd>
                  </div>
                )}
                {location.village && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Village</dt>
                    <dd className="mt-1 text-sm text-gray-900">{location.village}</dd>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {location.district && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">District</dt>
                      <dd className="mt-1 text-sm text-gray-900">{location.district}</dd>
                    </div>
                  )}
                  {location.province && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase">Province</dt>
                      <dd className="mt-1 text-sm text-gray-900">{location.province}</dd>
                    </div>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Country</dt>
                  <dd className="mt-1 text-sm text-gray-900">{location.country}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* GPS Location Card */}
          {(location.gps_lat || location.gps_lng) && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">GPS Location</h2>
              </div>
              <div className="p-6">
                <dl className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {location.gps_lat && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">Latitude</dt>
                        <dd className="mt-1 font-mono text-sm text-gray-900">{location.gps_lat}</dd>
                      </div>
                    )}
                    {location.gps_lng && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 uppercase">Longitude</dt>
                        <dd className="mt-1 font-mono text-sm text-gray-900">{location.gps_lng}</dd>
                      </div>
                    )}
                  </div>
                  {mapUrl && (
                    <div className="pt-2">
                      <a 
                        href={mapUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-[#007c89] hover:underline"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View on Map
                      </a>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Type Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Type Information</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  {getTypeIcon(location.type)}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {location.type === 'warehouse' ? 'Warehouse' : 'Telecommunication Tower'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {location.type === 'warehouse' 
                    ? 'Storage and distribution facility' 
                    : 'Telecommunications infrastructure site'}
                </p>
              </div>
            </div>
          </div>

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Audit Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="text-gray-700">{location.creator?.name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(location.created_at).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(location.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}