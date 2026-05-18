import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';

export default function UnitConversion() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    from_unit_id: '',
    to_unit_id: '',
    quantity: '',
  });

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/unit-categories/list/options');
      setCategories(res.data.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchUnitsByCategory = async (categoryId) => {
    if (!categoryId) {
      setUnits([]);
      return;
    }
    try {
      const res = await api.get('/units/list/options', { params: { category_id: categoryId } });
      setUnits(res.data.data || []);
    } catch {
      setUnits([]);
    }
  };

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    fetchUnitsByCategory(categoryId);
    setForm({ from_unit_id: '', to_unit_id: '', quantity: '' });
    setResult(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setResult(null);
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!form.from_unit_id || !form.to_unit_id || !form.quantity) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/units/convert', { params: form });
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const fromUnit = units.find(u => u.id === parseInt(form.from_unit_id));
  const toUnit = units.find(u => u.id === parseInt(form.to_unit_id));

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/units')} className="hover:text-[#007c89]">Units</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">Unit Converter</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Unit Converter</h1>
        <p className="text-sm text-gray-500 mt-1">Convert between different units of measurement</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Convert Units</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Category
                </label>
                <select
                  onChange={handleCategoryChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    From Unit
                  </label>
                  <select
                    name="from_unit_id"
                    value={form.from_unit_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                    disabled={!units.length}
                  >
                    <option value="">Select unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    To Unit
                  </label>
                  <select
                    name="to_unit_id"
                    value={form.to_unit_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                    disabled={!units.length}
                  >
                    <option value="">Select unit</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity to convert"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#007c89]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77] transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Converting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Convert
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Conversion Result</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {result.converted_quantity?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {result.formula}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-left">
                      <p className="text-gray-500">From Unit Factor</p>
                      <p className="font-mono font-medium">{result.from_unit?.factor}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-500">To Unit Factor</p>
                      <p className="font-mono font-medium">{result.to_unit?.factor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}