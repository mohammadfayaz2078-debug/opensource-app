import React, { useState, useEffect, useMemo } from 'react';
import api from '../../plugins/axios';
import { useTranslation } from 'react-i18next';

const UserSettings = () => {
  const { t } = useTranslation();
  const [authUser, setAuthUser] = useState(null);

  const fetchAuthUser = async () => {
    try {
      const res = await api.get('/user-me');
      setAuthUser(res.data);
    } catch (err) {
      console.error('Failed to fetch auth user:', err);
    }
  };

  useEffect(() => {
    fetchAuthUser();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-3 md:py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{t('settings.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">{t('settings.subtitle')}</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('settings.title')}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{t('settings.section_subtitle')}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500">
                  {t('settings.coming_soon')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
