import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

export default function UnitCategoryShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategory();
  }, [id]);

  const fetchCategory = async () => {
    try {
      const res = await api.get(`/unit-categories/${id}`);
      setCategory(res.data.data);
    } catch (err) {
      console.error('Failed to fetch category', err);
      navigate('/unit-categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('unit_category.delete_confirm'))) return;
    try {
      await api.delete(`/unit-categories/${id}`);
      navigate('/unit-categories');
    } catch (err) {
      const message = err.response?.data?.message || t('unit_category.delete_failed');
      alert(message);
    }
  };

  const getMeasureTypeIcon = (type) => {
    const icons = {
      unit: '🔢',
      weight: '⚖️',
      volume: '🧪',
      length: '📏',
      time: '⏱️'
    };
    return icons[type] || '📦';
  };

  const getMeasureTypeLabel = (type) => {
    const labels = {
      unit: t('unit_category.type_unit'),
      weight: t('unit_category.type_weight'),
      volume: t('unit_category.type_volume'),
      length: t('unit_category.type_length'),
      time: t('unit_category.type_time')
    };
    return labels[type] || type;
  };

  const getMeasureTypeColor = (type) => {
    const colors = {
      unit: 'bg-blue-100 text-blue-700',
      weight: 'bg-green-100 text-green-700',
      volume: 'bg-purple-100 text-purple-700',
      length: 'bg-yellow-100 text-yellow-700',
      time: 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
        <span className="ml-3 text-gray-600">{t('unit_category.loading_category')}</span>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/unit-categories')} className="hover:text-[#007c89]">{t('unit_category.title')}</button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700">{category.name}</span>
        </div>
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl bg-gray-100">
              {getMeasureTypeIcon(category.measure_type)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{category.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{t('unit_category.show_subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/unit-categories/${id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-[#007c89] text-white text-sm font-medium rounded-md hover:bg-[#006d77]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('edit')}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Units List */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('unit_category.units_in_category')}</h2>
            </div>
            <div className="p-6">
              {category.units && category.units.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('unit_category.col_unit_name')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('unit_category.col_symbol')}</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('unit_category.col_conversion_factor')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.units.map(unit => (
                        <tr key={unit.id} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-sm text-gray-900">{unit.name}</td>
                          <td className="px-3 py-2 text-sm font-mono text-gray-600">{unit.symbol || '—'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{unit.conversion_factor || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">{t('unit_category.no_units')}</p>
                  <button
                    onClick={() => navigate('/units/create', { state: { category_id: category.id } })}
                    className="mt-3 text-sm text-[#007c89] hover:underline"
                  >
                    {t('unit_category.add_unit')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Measure Type Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('unit_category.measure_type_card')}</h2>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="text-5xl mb-3">{getMeasureTypeIcon(category.measure_type)}</div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMeasureTypeColor(category.measure_type)}`}>
                  {category.measure_type.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-3">{getMeasureTypeLabel(category.measure_type)}</p>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('unit_category.statistics')}</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">{t('unit_category.total_units')}</dt>
                  <dd className="text-xl font-bold text-gray-900">{category.units_count || 0}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Audit Info */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('unit_category.audit_info')}</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('unit_category.created_by')}</dt>
                  <dd className="text-gray-700">{category.creator?.first_name + ' ' + category.creator?.last_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('unit_category.created_at')}</dt>
                  <dd className="text-gray-700">{new Date(category.created_at).toLocaleString()}</dd>
                </div>
                {category.updated_by && (
                  <div className="flex justify-between">
                    <dt className="text-xs font-medium text-gray-500 uppercase">{t('unit_category.updated_by')}</dt>
                    <dd className="text-gray-700">{category.updater?.name || '—'}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-xs font-medium text-gray-500 uppercase">{t('unit_category.last_updated')}</dt>
                  <dd className="text-gray-700">{new Date(category.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
