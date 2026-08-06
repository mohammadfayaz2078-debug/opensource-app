import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';

const CompanyAdminProfile = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('company_admin_profile.title')}</h1>
        <p className="text-gray-500 mt-1">{t('company_admin_profile.subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.company_name')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.company_name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.company_email')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.company_email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.manager_name')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.manager_name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.manager_email')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.company_phone')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.company_phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.city')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.city || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500">{t('company_admin_profile.address')}</label>
            <p className="mt-1 text-sm text-gray-900">{user.company_address || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyAdminProfile;
