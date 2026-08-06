import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function UnitEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [referenceUnit, setReferenceUnit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    uom_type: 'reference',
    factor: '',
    rounding: '0.01',
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchUnit();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/unit-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchUnit = async () => {
    try {
      const res = await api.get(`/units/${id}`);
      const unit = res.data.data;
      setForm({
        category_id: unit.category_id || '',
        name: unit.name || '',
        uom_type: unit.uom_type || 'reference',
        factor: unit.factor || '',
        rounding: unit.rounding || '0.01',
        is_active: unit.is_active ?? true,
      });
      if (unit.reference_unit_name) {
        setReferenceUnit({ name: unit.reference_unit_name });
      }
    } catch {
      navigate('/units');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setForm(prev => ({
      ...prev,
      uom_type: type,
      factor: type === 'reference' ? '' : prev.factor
    }));
    if (errors.uom_type) setErrors(prev => ({ ...prev, uom_type: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.put(`/units/${id}`, form);
      navigate(`/units/${id}`);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) {
          setErrors({ general: err.response.data.message });
        }
      } else {
        setErrors({ general: err.response?.data?.message || t('unit.update_failed') });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">{t('unit.loading_unit')}</span>
      </div>
    );
  }

  const inputClass = (field) => `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] focus:border-[#007c89] ${errors[field] ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/units')} className="hover:text-[#007c89]">{t('unit.title')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => navigate(`/units/${id}`)} className="hover:text-[#007c89]">
            {form.name}
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{t('edit')}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('unit.edit_title')}</h1>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">{t('unit.unit_info')}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t('unit.category_label')}
                    </label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      className={inputClass('category_id')}
                    >
                      <option value="">{t('unit.select_category')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.measure_type_label})
                        </option>
                      ))}
                    </select>
                    {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id[0]}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t('unit.unit_name_field')}
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
                      {t('unit.unit_type')}
                    </label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <label
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          form.uom_type === 'reference'
                            ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uom_type"
                          value="reference"
                          checked={form.uom_type === 'reference'}
                          onChange={handleTypeChange}
                          className="hidden"
                        />
                        <span className="text-2xl mb-1">⚓</span>
                        <span className="text-xs font-medium">{t('unit.type_reference')}</span>
                      </label>
                      
                      <label
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          form.uom_type === 'bigger'
                            ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uom_type"
                          value="bigger"
                          checked={form.uom_type === 'bigger'}
                          onChange={handleTypeChange}
                          className="hidden"
                        />
                        <span className="text-2xl mb-1">⬆️</span>
                        <span className="text-xs font-medium">{t('unit.type_bigger')}</span>
                      </label>
                      
                      <label
                        className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          form.uom_type === 'smaller'
                            ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uom_type"
                          value="smaller"
                          checked={form.uom_type === 'smaller'}
                          onChange={handleTypeChange}
                          className="hidden"
                        />
                        <span className="text-2xl mb-1">⬇️</span>
                        <span className="text-xs font-medium">{t('unit.type_smaller')}</span>
                      </label>
                    </div>
                    {errors.uom_type && <p className="text-red-500 text-xs mt-1">{errors.uom_type[0]}</p>}
                  </div>
                  
                  {form.uom_type !== 'reference' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        {t('unit.conversion_factor')}
                      </label>
                      <input
                        type="text"
                        name="factor"
                        value={form.factor}
                        onChange={handleChange}
                        className={inputClass('factor')}
                        placeholder={t('unit.factor_placeholder2')}
                      />
                      {errors.factor && <p className="text-red-500 text-xs mt-1">{errors.factor[0]}</p>}

                      {/* Live Conversion Preview */}
                      {form.factor && form.name && referenceUnit && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-gray-700">
                            {form.uom_type === 'bigger' ? (
                              <>1 <span className="text-[#007c89] font-semibold">{form.name}</span> = <span className="font-mono font-semibold text-[#007c89]">{parseFloat(form.factor).toString()}</span> <span className="text-[#007c89] font-semibold">{referenceUnit.name}</span></>
                            ) : (
                              <>1 <span className="text-[#007c89] font-semibold">{referenceUnit.name}</span> = <span className="font-mono font-semibold text-[#007c89]">{parseFloat(form.factor).toString()}</span> <span className="text-[#007c89] font-semibold">{form.name}</span></>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {form.uom_type === 'bigger'
                              ? t('unit.contains_bigger', { name: form.name, factor: parseFloat(form.factor).toString(), ref: referenceUnit.name })
                              : t('unit.contains_smaller', { ref: referenceUnit.name, factor: parseFloat(form.factor).toString(), name: form.name })}
                          </p>
                        </div>
                      )}
                      {!referenceUnit && form.category_id && (
                        <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="text-xs text-amber-700">{t('unit.no_reference_edit')}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {form.uom_type === 'bigger'
                          ? t('unit.bigger_hint2')
                          : t('unit.smaller_hint2')}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {t('unit.rounding_precision')}
                    </label>
                    <input
                      type="number"
                      step="any"
                      name="rounding"
                      value={form.rounding}
                      onChange={handleChange}
                      className={inputClass('rounding')}
                    />
                    {errors.rounding && <p className="text-red-500 text-xs mt-1">{errors.rounding[0]}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-6">
              {form.uom_type !== 'reference' && referenceUnit && (
                <div className="mb-4 p-3 bg-green-50 rounded-md">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t('unit.reference_unit_label', { name: referenceUnit.name })}</span>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#007c89] focus:ring-[#007c89] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('active')}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    {t('unit.saving')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('save')}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/units/${id}`)}
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
