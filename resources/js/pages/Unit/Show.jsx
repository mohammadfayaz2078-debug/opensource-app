import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnit();
  }, [id]);

  const fetchUnit = async () => {
    try {
      const res = await api.get(`/units/${id}`);
      setUnit(res.data.data);
    } catch (err) {
      console.error('Failed to fetch unit', err);
      navigate('/units');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this unit? This action cannot be undone.')) return;
    try {
      await api.delete(`/units/${id}`);
      navigate('/units');
    } catch (err) {
      const message = err.response?.data?.message || 'Delete failed';
      alert(message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const res = await api.post(`/units/${id}/toggle-status`);
      setUnit(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      reference: <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">Reference Unit</span>,
      bigger: <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Bigger Unit</span>,
      smaller: <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">Smaller Unit</span>
    };
    return badges[type] || badges.reference;
  };

  const getTypeIcon = (type) => {
    const icons = {
      reference: '⚓',
      bigger: '⬆️',
      smaller: '⬇️'
    };
    return icons[type] || '📏';
  };

  const getTypeDescription = (type) => {
    const descriptions = {
      reference: 'This is the base unit for its category. All conversions are based on this unit.',
      bigger: 'This unit is larger than the reference unit. 1 unit = X reference units.',
      smaller: 'This unit is smaller than the reference unit. X units = 1 reference unit.'
    };
    return descriptions[type] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading unit...</span>
      </div>
    );
  }

  if (!unit) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/units')} className="hover:text-[#007c89]">Units</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{unit.name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl bg-gray-100">
              {getTypeIcon(unit.uom_type)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{unit.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Unit of Measurement</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                unit.is_active 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {unit.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => navigate(`/units/${id}/edit`)}
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
          {/* Unit Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Unit Details</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{unit.category?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Measure Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {unit.category?.measure_type ? (
                      <span className="capitalize">{unit.category.measure_type}</span>
                    ) : '—'}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Unit Type</dt>
                  <dd className="mt-1">
                    {getTypeBadge(unit.uom_type)}
                    <p className="text-sm text-gray-500 mt-2">{getTypeDescription(unit.uom_type)}</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Conversion Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Conversion Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                {unit.uom_type !== 'reference' && (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-xs font-medium text-gray-500 uppercase">Conversion Factor</dt>
                      <dd className="mt-1">
                        <span className="text-lg font-mono font-semibold text-gray-900">{unit.factor}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {unit.name} = {unit.factor} {unit.reference_unit_name || 'reference unit'}
                        </span>
                      </dd>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dt className="text-xs font-medium text-gray-500 uppercase">Inverse Factor</dt>
                      <dd className="mt-1">
                        <span className="text-lg font-mono font-semibold text-gray-900">{unit.factor_inv}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          1 {unit.reference_unit_name || 'reference unit'} = {unit.factor_inv} {unit.name}
                        </span>
                      </dd>
                    </div>
                  </>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Rounding Precision</dt>
                  <dd className="mt-1">
                    <span className="text-lg font-mono font-semibold text-gray-900">{unit.rounding}</span>
                    <span className="text-sm text-gray-500 ml-2">Quantities rounded to this value</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Status</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {unit.is_active ? 'Active' : 'Inactive'}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {unit.is_active 
                    ? 'This unit is available for use in inventory and products' 
                    : 'This unit is disabled and will not appear in selections'}
                </p>
              </div>
            </div>
          </div>

          {/* Example Conversion */}
          {unit.uom_type !== 'reference' && unit.reference_unit_name && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Example Conversion</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      1 <span className="font-semibold">{unit.name}</span> = 
                      <span className="font-mono font-bold text-blue-600"> {unit.factor}</span> 
                      <span className="font-semibold"> {unit.reference_unit_name}</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      1 <span className="font-semibold">{unit.reference_unit_name}</span> = 
                      <span className="font-mono font-bold text-green-600"> {unit.factor_inv}</span> 
                      <span className="font-semibold"> {unit.name}</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      Example: 10 {unit.name} = {10 * unit.factor} {unit.reference_unit_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Audit Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created By</dt>
                  <dd className="text-gray-700">{unit.creator?.first_name + ' ' + unit.creator?.last_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Created At</dt>
                  <dd className="text-gray-700">{new Date(unit.created_at).toLocaleString()}</dd>
                </div>
                {unit.updated_by && (
                  <div className="flex justify-between">
                    <dt className="text-xs font-medium text-gray-500 uppercase">Updated By</dt>
                    <dd className="text-gray-700">{unit.updater?.name || '—'}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-gray-700">{new Date(unit.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}