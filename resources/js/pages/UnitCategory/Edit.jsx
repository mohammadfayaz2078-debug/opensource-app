import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitCategoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [measureTypes, setMeasureTypes] = useState([]);
  const [unitsCount, setUnitsCount] = useState(0);
  const [form, setForm] = useState({
    name: '',
    measure_type: 'unit',
  });

  useEffect(() => {
    fetchMeasureTypes();
    fetchCategory();
  }, [id]);

  const fetchMeasureTypes = async () => {
    try {
      const res = await api.get('/unit-categories/measure-types');
      setMeasureTypes(res.data.data || []);
    } catch {
      setMeasureTypes([
        { value: 'unit', label: 'Unit (Pieces, Each, etc.)', icon: '🔢' },
        { value: 'weight', label: 'Weight (kg, g, lb, etc.)', icon: '⚖️' },
        { value: 'volume', label: 'Volume (L, mL, gal, etc.)', icon: '🧪' },
        { value: 'length', label: 'Length (m, cm, ft, etc.)', icon: '📏' },
        { value: 'time', label: 'Time (days, hours, etc.)', icon: '⏱️' },
      ]);
    }
  };

  const fetchCategory = async () => {
    try {
      const res = await api.get(`/unit-categories/${id}`);
      const category = res.data.data;
      setForm({
        name: category.name || '',
        measure_type: category.measure_type || 'unit',
      });
      setUnitsCount(category.units_count || 0);
    } catch {
      navigate('/unit-categories');
    } finally {
      setFetching(false);
    }
  };

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
      await api.put(`/unit-categories/${id}`, form);
      navigate(`/unit-categories/${id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to update unit category.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading category...</span>
      </div>
    );
  }

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  const getTypeIcon = (type) => {
    const found = measureTypes.find(t => t.value === type);
    return found?.icon || '📦';
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/unit-categories')} className="hover:text-[#007c89]">Unit Categories</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => navigate(`/unit-categories/${id}`)} className="hover:text-[#007c89]">
            {form.name}
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Unit Category</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Category Information</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Category Name
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Measure Type
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                      {measureTypes.map(type => {
                        const isDisabled = unitsCount > 0 && type.value !== form.measure_type;
                        return (
                          <label
                            key={type.value}
                            className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                              form.measure_type === type.value
                                ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20'
                                : isDisabled
                                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                  : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="measure_type"
                              value={type.value}
                              checked={form.measure_type === type.value}
                              onChange={handleChange}
                              disabled={isDisabled}
                              className="hidden"
                            />
                            <span className="text-2xl mb-1">{type.icon}</span>
                            <span className="text-xs font-medium text-center">
                              {type.label.split(' ')[0]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {errors.measure_type && <p className="text-red-500 text-xs mt-1">{errors.measure_type[0]}</p>}
                    {unitsCount > 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠️ Cannot change measure type because this category has {unitsCount} unit(s) associated.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span className="text-lg">{getTypeIcon(form.measure_type)}</span>
                  <span>{measureTypes.find(t => t.value === form.measure_type)?.label || form.measure_type}</span>
                </div>
              </div>

              {unitsCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-yellow-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>This category has {unitsCount} unit(s). Deleting will require removing them first.</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/unit-categories/${id}`)}
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