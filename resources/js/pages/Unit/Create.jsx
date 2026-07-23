import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [referenceUnit, setReferenceUnit] = useState(null);
  const [categoryUnits, setCategoryUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    uom_type: 'reference',
    factor: '',
    rounding: '0.01',
    is_active: true,
  });

  const formatNumber = (v) => {
    if (v === undefined || v === null || v === '') return '';
    const n = parseFloat(v);
    return isNaN(n) ? '' : n.toString();
  };

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (form.category_id) {
      fetchReferenceUnit(form.category_id);
      fetchCategoryUnits(form.category_id);
    } else {
      setReferenceUnit(null);
      setCategoryUnits([]);
    }
  }, [form.category_id]);

  const fetchCategories = async () => {
    try { const r = await api.get('/unit-categories/list/options'); setCategories(r.data.data || []); } catch { setCategories([]); }
  };
  const fetchReferenceUnit = async (cid) => {
    try { const r = await api.get(`/units/category/${cid}/reference`); setReferenceUnit(r.data.data || null); } catch { setReferenceUnit(null); }
  };
  const fetchCategoryUnits = async (cid) => {
    try { const r = await api.get(`/units/category/${cid}/units`); setCategoryUnits(r.data.data || []); } catch { setCategoryUnits([]); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let v = value;
    if (name === 'factor' || name === 'rounding') v = formatNumber(value);
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : v }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const handleTypeChange = (e) => {
    const t = e.target.value;
    setForm(p => ({ ...p, uom_type: t, factor: t === 'reference' ? '' : p.factor }));
    if (errors.uom_type) setErrors(p => ({ ...p, uom_type: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      await api.post('/units', { ...form, factor: form.factor ? parseFloat(form.factor) : null, rounding: parseFloat(form.rounding) || 0.01 });
      navigate('/units');
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        if (err.response.data.message && !err.response.data.errors) setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: err.response?.data?.message || 'Failed to create unit.' });
      }
    } finally { setLoading(false); }
  };

  const ic = (f) => `w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89] ${errors[f] ? 'border-red-400' : 'border-gray-300'}`;

  const ref = categoryUnits.find(u => u.uom_type === 'reference');
  const bigger = categoryUnits.filter(u => u.uom_type === 'bigger');
  const smaller = categoryUnits.filter(u => u.uom_type === 'smaller');

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
            <button onClick={() => navigate('/units')} className="hover:text-[#007c89]">Units</button>
            <span>/</span>
            <span className="text-gray-700">New</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Add Unit</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/units')} className="px-4 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" form="unit-form" disabled={loading}
            className="px-6 py-1.5 text-sm bg-[#007c89] text-white rounded-md font-medium hover:bg-[#006d77] disabled:opacity-50">
            {loading ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>

      {errors.general && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-md text-sm">{errors.general}</div>}

      <form id="unit-form" onSubmit={handleSubmit}>
        <div className="space-y-3">
          {/* Unit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Unit Information</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Category *</label>
                  <select name="category_id" value={form.category_id} onChange={handleChange} className={ic('category_id')}>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.measure_type_label})</option>)}
                  </select>
                  {errors.category_id && <p className="text-red-500 text-xs mt-0.5">{errors.category_id[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Unit Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} className={ic('name')} placeholder="e.g. Kilogram" autoFocus />
                  {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Rounding</label>
                  <input name="rounding" value={form.rounding} onChange={handleChange} className={ic('rounding')} placeholder="0.01" />
                </div>
              </div>
            </div>
          </div>

          {/* Unit Type */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-200">
              <h2 className="text-base font-medium text-gray-900">Type</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 'reference', i: '⚓', l: 'Reference', d: 'Base unit' },
                  { v: 'bigger', i: '⬆️', l: 'Bigger', d: 'Larger than ref' },
                  { v: 'smaller', i: '⬇️', l: 'Smaller', d: 'Smaller than ref' },
                ].map(t => (
                  <label key={t.v} className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    form.uom_type === t.v ? 'border-[#007c89] bg-[#007c89]/5 ring-2 ring-[#007c89]/20' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="uom_type" value={t.v} checked={form.uom_type === t.v} onChange={handleTypeChange} className="hidden" />
                    <span className="text-2xl mb-1">{t.i}</span>
                    <span className="text-xs font-medium">{t.l}</span>
                    <span className="text-[10px] text-gray-400 text-center">{t.d}</span>
                  </label>
                ))}
              </div>
              {errors.uom_type && <p className="text-red-500 text-xs mt-1">{errors.uom_type[0]}</p>}
            </div>
          </div>

          {/* Conversion Factor (only for bigger/smaller) */}
          {form.uom_type !== 'reference' && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-900">Conversion</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Factor *</label>
                    <input type="text" name="factor" value={form.factor} onChange={handleChange} className={ic('factor')} placeholder="e.g. 1000" />
                    {errors.factor && <p className="text-red-500 text-xs mt-0.5">{errors.factor[0]}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {form.uom_type === 'bigger' ? 'How many ref units = 1 of this' : 'How many of this = 1 ref unit'}
                    </p>
                  </div>
                  <div>
                    {form.factor && form.name && referenceUnit ? (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-gray-700">
                          {form.uom_type === 'bigger' ? (
                            <>1 <span className="text-[#007c89] font-semibold">{form.name}</span> = <span className="font-mono font-semibold text-[#007c89]">{formatNumber(form.factor)}</span> <span className="text-[#007c89] font-semibold">{referenceUnit.name}</span></>
                          ) : (
                            <>1 <span className="text-[#007c89] font-semibold">{referenceUnit.name}</span> = <span className="font-mono font-semibold text-[#007c89]">{formatNumber(form.factor)}</span> <span className="text-[#007c89] font-semibold">{form.name}</span></>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {form.uom_type === 'bigger' ? `1 ${form.name} contains ${formatNumber(form.factor)} ${referenceUnit.name}` : `1 ${referenceUnit.name} contains ${formatNumber(form.factor)} ${form.name}`}
                        </p>
                      </div>
                    ) : !referenceUnit && form.category_id ? (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 h-full flex items-center">
                        <p className="text-xs text-amber-700">⚠ No reference unit in this category yet.</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 h-full flex items-center">
                        <p className="text-xs text-gray-400">Select category and enter factor to see preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing units in category */}
          {categoryUnits.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-900">Existing Units</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  {ref && (
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-[10px] text-gray-500">⚓ Reference</p>
                      <p className="font-medium">{ref.name}</p>
                    </div>
                  )}
                  {bigger.length > 0 && (
                    <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-[10px] text-gray-500">⬆️ Bigger</p>
                      <p className="font-medium">{bigger.map(u => u.name).join(', ')}</p>
                    </div>
                  )}
                  {smaller.length > 0 && (
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-gray-500">⬇️ Smaller</p>
                      <p className="font-medium">{smaller.map(u => u.name).join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Active</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#007c89] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007c89]"></div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
