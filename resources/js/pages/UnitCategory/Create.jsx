import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function UnitCategoryCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [measureTypes, setMeasureTypes] = useState([]);
  const [form, setForm] = useState({
    name: '',
    measure_type: 'unit',
  });

  useEffect(() => {
    fetchMeasureTypes();
  }, []);

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
      await api.post('/unit-categories', form);
      navigate('/unit-categories');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || t('unit_category.create_failed') });
      }
    } finally {
      setLoading(false);
    }
  };

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
          <button onClick={() => navigate('/unit-categories')} className="hover:text-[#007c89]">{t('unit_category.title')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{t('unit_category.new_category')}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('unit_category.add_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('unit_category.subtitle')}</p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{t('unit_category.category_info')}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t('unit_category.category_name')}
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass('name')}
                      placeholder={t('unit_category.name_placeholder')}
                      autoFocus
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t('unit_category.measure_type')}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                      {measureTypes.map(type => (
                        <label
                          key={type.value}
                          className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                            form.measure_type === type.value
                              ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="measure_type"
                            value={type.value}
                            checked={form.measure_type === type.value}
                            onChange={handleChange}
                            className="hidden"
                          />
                          <span className="text-2xl mb-1">{type.icon}</span>
                          <span className="text-xs font-medium text-center">
                            {t(`unit_category.type_${type.value}`) || type.label.split(' ')[0]}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.measure_type && <p className="text-red-500 text-xs mt-1">{errors.measure_type[0]}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {t('unit_category.selected_label', { label: measureTypes.find(t => t.value === form.measure_type)?.label || form.measure_type })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <span className="text-lg">{getTypeIcon(form.measure_type)}</span>
                  <span>{t('unit_category.units_share')}</span>
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
                    {t('unit_category.creating')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('unit_category.create_category')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/unit-categories')}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 mt-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
