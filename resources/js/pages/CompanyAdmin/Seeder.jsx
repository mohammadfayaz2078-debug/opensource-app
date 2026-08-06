// pages/CompanyAdmin/Seeder.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import { Database, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const Seeder = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get('/company-admin/seeder/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setChecking(false);
    }
  };

  const runSeeder = async () => {
    const result = await Swal.fire({
      title: t('seeder.confirm_run_title'),
      html: t('seeder.confirm_run_html'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('seeder.confirm_run_btn'),
      cancelButtonText: t('seeder.cancel'),
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const res = await api.post('/company-admin/seeder/run');
        Swal.fire({
          icon: 'success',
          title: t('seeder.success'),
          text: res.data.message,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        await checkStatus();
      } catch (err) {
        Swal.fire(t('seeder.error'), err.response?.data?.message || t('seeder.run_failed'), 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetAndSeed = async () => {
    const result = await Swal.fire({
      title: t('seeder.confirm_reset_title'),
      html: t('seeder.confirm_reset_html'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('seeder.confirm_reset_btn'),
      cancelButtonText: t('seeder.cancel'),
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const res = await api.post('/company-admin/seeder/reset');
        Swal.fire({
          icon: 'success',
          title: t('seeder.success'),
          text: res.data.message,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        await checkStatus();
      } catch (err) {
        Swal.fire(t('seeder.error'), err.response?.data?.message || t('seeder.reset_failed'), 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{t('seeder.title')}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{t('seeder.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('seeder.current_status')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">{t('seeder.branches')}</p>
              <p className="text-sm font-semibold flex items-center gap-2 mt-1">
                {status?.branches_exist ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">{t('seeder.seeded')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">{t('seeder.not_seeded')}</span>
                  </>
                )}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">{t('seeder.users')}</p>
              <p className="text-sm font-semibold flex items-center gap-2 mt-1">
                {status?.users_exist ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">{t('seeder.seeded')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">{t('seeder.not_seeded')}</span>
                  </>
                )}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">{t('seeder.wallets')}</p>
              <p className="text-sm font-semibold flex items-center gap-2 mt-1">
                {status?.accounts_exist ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">{t('seeder.seeded')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">{t('seeder.not_seeded')}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {t('seeder.status_label')} {status?.data_seeded ? (
              <span className="text-green-600 font-medium">{t('seeder.data_seeded')}</span>
            ) : (
              <span className="text-amber-600 font-medium">{t('seeder.data_not_seeded')}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('seeder.actions')}</h3>
          <div className="space-y-3">
            <button
              onClick={runSeeder}
              disabled={loading || status?.data_seeded}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{t('seeder.run')}</p>
                  <p className="text-xs text-gray-500">{t('seeder.run_hint')}</p>
                </div>
              </div>
              {loading ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : status?.data_seeded ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600" />
              )}
            </button>

            <button
              onClick={resetAndSeed}
              disabled={loading}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{t('seeder.reset')}</p>
                  <p className="text-xs text-gray-500">{t('seeder.reset_hint')}</p>
                </div>
              </div>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Seeder;