import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import currencyService from '@/services/currencyService';
import Swal from 'sweetalert2';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/plugins/axios';

const CurrencyManager = () => {
  const { t } = useTranslation();
  const { canView, canCreate, canEdit, canDelete } = usePermissions();

  // ─── State ─────────────────────────────────────────────────
  const [currencies, setCurrencies] = useState([]);
  const [meta, setMeta] = useState({});
  const [baseCurrencyId, setBaseCurrencyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [authUser, setAuthUser] = useState(null);
  const userType = localStorage.getItem('user_type');
  const isSuperAdmin = userType === 'super_admin';
  const isCompanyAdmin = userType === 'company_admin';
  const needsBranchSelector = isSuperAdmin || isCompanyAdmin;
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const getBranchParam = () => {
    if (needsBranchSelector && selectedBranchId) return { branch_id: selectedBranchId };
    return {};
  };

  // Permissions
  const [perms, setPerms] = useState({ view: false, create: false, edit: false, delete: false });

  // Currency Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: null, code: '', name: '', symbol: '',
    decimal_places: 2, position: 'before', rounding: 0.01,
    is_active: true, initial_rate: '', set_as_base: false,
  });

  // Rate Panel
  const [ratePanel, setRatePanel] = useState({ open: false, currency: null });
  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rateForm, setRateForm] = useState({ rate: '', date: new Date().toISOString().slice(0, 10) });
  const [rateSaving, setRateSaving] = useState(false);

  const debounceRef = useRef(null);

  // ─── Derived ───────────────────────────────────────────────
  const isAdmin = useMemo(() => authUser?.role?.role_name === 'admin' || authUser?.branch_id === null, [authUser]);

  const canViewCurrencies = useMemo(() => isAdmin || perms.view, [isAdmin, perms.view]);
  const canCreateCurrencies = useMemo(() => isAdmin || perms.create, [isAdmin, perms.create]);
  const canEditCurrencies = useMemo(() => isAdmin || perms.edit, [isAdmin, perms.edit]);
  const canDeleteCurrencies = useMemo(() => isAdmin || perms.delete, [isAdmin, perms.delete]);

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchBranches = async () => {
    if (!needsBranchSelector) return;
    try {
      const endpoint = isSuperAdmin ? '/super-admin/branches' : '/branches';
      const res = await api.get(endpoint, { params: { per_page: 999 } });
      const list = res.data?.data || res.data?.branches?.data || res.data?.branches || [];
      const branchList = Array.isArray(list) ? list : [];
      setBranches(branchList);
      if (branchList.length > 0 && !selectedBranchId) {
        setSelectedBranchId(String(branchList[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchCurrencies = useCallback(async (page = 1) => {
    if (!canViewCurrencies) return;
    if (needsBranchSelector && !selectedBranchId) return;
    try {
      setLoading(true);
      setError('');
      const res = await currencyService.getCurrencies({ search: searchQuery, page, ...getBranchParam() });
      setCurrencies(res.data.data || []);
      setMeta(res.data.meta || {});
      setBaseCurrencyId(res.data.base_currency_id || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, [canViewCurrencies, searchQuery, selectedBranchId]);

  const fetchRates = useCallback(async (currencyId) => {
    try {
      setRatesLoading(true);
      const res = await currencyService.getRates(currencyId, getBranchParam());
      setRates(res.data.data || []);
    } catch {
      setRates([]);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // ─── Currency CRUD ─────────────────────────────────────────
  const saveCurrency = async () => {
    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        symbol: form.symbol,
        decimal_places: parseInt(form.decimal_places) || 2,
        position: form.position,
        rounding: parseFloat(form.rounding) || 0.01,
        is_active: form.is_active,
        ...getBranchParam(),
      };

      if (form.id) {
        await currencyService.updateCurrency(form.id, payload);
        Swal.fire({ title: t('success'), text: t('currency_update_success'), icon: 'success', timer: 1500, showConfirmButton: false });
      } else {
        if (form.initial_rate) payload.initial_rate = parseFloat(form.initial_rate);
        if (form.set_as_base) payload.set_as_base = true;
        await currencyService.createCurrency(payload);
        Swal.fire({ title: t('success'), text: t('currency_create_success'), icon: 'success', timer: 1500, showConfirmButton: false });
      }
      await fetchCurrencies(currentPage);
      closeModal();
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || t('currency_save_error'), icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrency = async (id) => {
    const result = await Swal.fire({
      title: t('currency_delete_confirm_title'),
      text: t('currency_delete_confirm_text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('yes_delete'),
      cancelButtonText: t('cancel'),
    });
    if (!result.isConfirmed) return;
    try {
      await currencyService.deleteCurrency(id, getBranchParam());
      Swal.fire({ title: t('success'), text: t('currency_delete_success'), icon: 'success', timer: 1500, showConfirmButton: false });
      fetchCurrencies(currentPage);
      if (ratePanel.currency?.id === id) closeRatePanel();
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || t('currency_delete_error'), icon: 'error' });
    }
  };

  const setAsBase = async (id) => {
    const result = await Swal.fire({
      title: t('currency_set_base_confirm'),
      text: t('currency_set_base_confirm_text'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('currency_set_base'),
      cancelButtonText: t('cancel'),
    });
    if (!result.isConfirmed) return;
    try {
      await currencyService.setBaseCurrency(id, getBranchParam());
      Swal.fire({ title: t('success'), text: t('currency_set_base_success'), icon: 'success', timer: 1500, showConfirmButton: false });
      fetchCurrencies(currentPage);
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || 'Failed', icon: 'error' });
    }
  };

  const toggleActive = async (id) => {
    try {
      await currencyService.toggleActive(id, getBranchParam());
      fetchCurrencies(currentPage);
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || 'Failed', icon: 'error' });
    }
  };

  // ─── Rate CRUD ─────────────────────────────────────────────
  const saveRate = async () => {
    if (!ratePanel.currency || !rateForm.rate || !rateForm.date) return;
    setRateSaving(true);
    try {
      await currencyService.saveRate(ratePanel.currency.id, {
        rate: parseFloat(rateForm.rate),
        date: rateForm.date,
        ...getBranchParam(),
      });
      Swal.fire({ title: t('success'), text: t('currency_rate_save_success'), icon: 'success', timer: 1200, showConfirmButton: false });
      fetchRates(ratePanel.currency.id);
      fetchCurrencies(currentPage);
      setRateForm({ rate: '', date: new Date().toISOString().slice(0, 10) });
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || 'Failed', icon: 'error' });
    } finally {
      setRateSaving(false);
    }
  };

  const deleteRate = async (rateId) => {
    if (!ratePanel.currency) return;
    try {
      await currencyService.deleteRate(ratePanel.currency.id, rateId, getBranchParam());
      fetchRates(ratePanel.currency.id);
      fetchCurrencies(currentPage);
    } catch (err) {
      Swal.fire({ title: t('error'), text: err.response?.data?.message || 'Failed', icon: 'error' });
    }
  };

  // ─── Modal Helpers ─────────────────────────────────────────
  const openModal = (item = null) => {
    if (item) {
      setForm({
        id: item.id, code: item.code, name: item.name, symbol: item.symbol || '',
        decimal_places: item.decimal_places, position: item.position,
        rounding: item.rounding, is_active: item.is_active,
        initial_rate: '', set_as_base: false,
      });
      setIsEditing(true);
    } else {
      setForm({
        id: null, code: '', name: '', symbol: '',
        decimal_places: 2, position: 'before', rounding: 0.01,
        is_active: true, initial_rate: '', set_as_base: false,
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const openRatePanel = (currency) => {
    setRatePanel({ open: true, currency });
    setRateForm({ rate: '', date: new Date().toISOString().slice(0, 10) });
    fetchRates(currency.id);
  };

  const closeRatePanel = () => {
    setRatePanel({ open: false, currency: null });
    setRates([]);
  };

  // ─── Pagination ────────────────────────────────────────────
  const pageNumbers = useMemo(() => {
    if (!meta.last_page) return [];
    const total = meta.last_page;
    const cur = meta.current_page;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 3) return [1, 2, 3, '...', total];
    if (cur >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', cur - 1, cur, cur + 1, '...', total];
  }, [meta]);

  // ─── Search ────────────────────────────────────────────────
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCurrencies(1), 400);
  };

  // ─── Effects ───────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/user-me');
        setAuthUser(res.data?.user ?? res.data);
      } catch {}
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (authUser) {
      setPerms({
        view: canView('currencies'),
        create: canCreate('currencies'),
        edit: canEdit('currencies'),
        delete: canDelete('currencies'),
      });
    }
  }, [authUser, canView, canCreate, canEdit, canDelete]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (canViewCurrencies && authUser) fetchCurrencies();
  }, [canViewCurrencies, authUser, fetchCurrencies]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (ratePanel.open) closeRatePanel();
        else if (isModalOpen) closeModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isModalOpen, ratePanel.open]);

  // ─── Auth Check ────────────────────────────────────────────
  if (!canViewCurrencies) {
    return (
      <div className="mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-sm text-red-700 border border-red-200">
          You are not authorized to view currencies.
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl">

      {/* Header */}
      {/* <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('currencies_title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('currencies_subtitle')}</p>
      </div> */}

      {/* Branch Selector */}
      {needsBranchSelector && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {branches.length > 0 ? (
            <>
              <label className="text-sm font-medium text-yellow-800">Branch:</label>
              <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="px-3 py-1.5 text-sm border border-yellow-300 rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 bg-white">
                <option value="">-- Select --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </>
          ) : (
            <p className="text-sm font-medium text-yellow-800">No branches found.</p>
          )}
        </div>
      )}

      {/* Search & Add */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder={t('currency_search')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {canCreateCurrencies && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <i className="fas fa-plus mr-2"></i>
              {t('currency_add')}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-3 text-gray-500 text-sm">{t('currency_loading')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Main Content: Table + Rate Panel Side by Side */}
      {!loading && !error && (
        <div className="flex gap-4">

          {/* Currency Table */}
          <div className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all ${ratePanel.open ? 'flex-1 min-w-0' : 'w-full'}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('currency_code')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('currency_name')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('currency_symbol')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('currency_rate')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('currency_status')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('currency_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currencies.map((item) => {
                    const isBase = item.id === baseCurrencyId;
                    const latestRate = item.latest_rate?.rate;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 transition cursor-pointer ${ratePanel.currency?.id === item.id ? 'bg-blue-50' : ''}`}
                        onClick={() => openRatePanel(item)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">{item.code}</span>
                            {isBase && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                                <i className="fas fa-star text-[8px] mr-0.5"></i> {t('currency_base')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.name}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{item.symbol || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {isBase ? (
                            <span className="text-xs text-gray-400">1.0000</span>
                          ) : latestRate ? (
                            <span className="text-sm font-mono text-gray-800">{parseFloat(latestRate).toFixed(4)}</span>
                          ) : (
                            <span className="text-xs text-orange-500">No rate</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleActive(item.id); }}
                            disabled={isBase && item.is_active}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition ${
                              item.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            <i className={`fas ${item.is_active ? 'fa-check-circle' : 'fa-times-circle'} mr-1 text-[10px]`}></i>
                            {item.is_active ? t('currency_active') : t('currency_inactive')}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1">
                            {canEditCurrencies && !isBase && (
                              <button
                                onClick={() => setAsBase(item.id)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition"
                                title={t('currency_set_base')}
                              >
                                <i className="fas fa-star text-xs"></i>
                              </button>
                            )}
                            {canEditCurrencies && (
                              <button
                                onClick={() => openModal(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                title={t('edit')}
                              >
                                <i className="fas fa-edit text-xs"></i>
                              </button>
                            )}
                            {canDeleteCurrencies && !isBase && (
                              <button
                                onClick={() => deleteCurrency(item.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                title={t('delete')}
                              >
                                <i className="fas fa-trash text-xs"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!currencies.length && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <i className="fas fa-coins text-4xl mb-3 block"></i>
                        <p className="text-sm">{t('currency_empty')}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="px-4 py-3 border-t flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {t('showing')} {meta.from}-{meta.to} {t('of')} {meta.total}
                </span>
                <div className="flex gap-1">
                  {pageNumbers.map((page, idx) => (
                    <button
                      key={idx}
                      onClick={() => page !== '...' && fetchCurrencies(page)}
                      disabled={page === '...' || page === meta.current_page}
                      className={`px-2.5 py-1 rounded text-sm transition ${
                        page === meta.current_page
                          ? 'bg-blue-600 text-white'
                          : page === '...'
                          ? 'text-gray-400 cursor-default'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rate Panel (Slide-in from right) */}
          {ratePanel.open && ratePanel.currency && (
            <div className="w-96 bg-white rounded-xl shadow-lg overflow-hidden flex-shrink-0">
              {/* Panel Header */}
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {ratePanel.currency.code} — {t('currency_rates_title')}
                  </h3>
                  <p className="text-xs text-gray-500">{ratePanel.currency.name}</p>
                </div>
                <button onClick={closeRatePanel} className="p-1 hover:bg-gray-200 rounded transition">
                  <i className="fas fa-times text-gray-500"></i>
                </button>
              </div>

              {/* Add Rate Form */}
              {canEditCurrencies && ratePanel.currency.id !== baseCurrencyId && (
                <div className="p-4 border-b bg-blue-50/50">
                  <p className="text-xs font-medium text-gray-600 mb-2">{t('currency_rate_add')}</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={rateForm.date}
                      onChange={(e) => setRateForm({ ...rateForm, date: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={rateForm.rate}
                      onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                      placeholder={t('currency_rate_value')}
                      className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={saveRate}
                      disabled={rateSaving || !rateForm.rate}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      {rateSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('currency_initial_rate_help')}
                  </p>
                </div>
              )}

              {/* Rate History */}
              <div className="overflow-y-auto max-h-[500px]">
                {ratesLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : rates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <i className="fas fa-chart-line text-2xl mb-2 block"></i>
                    <p className="text-xs">{t('currency_rate_empty')}</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{t('currency_rate_date')}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('currency_rate_value')}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{t('currency_rate_inverse')}</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rates.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700">{r.date}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono text-gray-800">
                            {parseFloat(r.rate).toFixed(6)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">
                            {parseFloat(r.inverse_rate).toFixed(6)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {canEditCurrencies && ratePanel.currency.id !== baseCurrencyId && (
                              <button
                                onClick={() => deleteRate(r.id)}
                                className="p-1 text-red-400 hover:text-red-600 transition"
                              >
                                <i className="fas fa-times text-xs"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Currency Add/Edit Modal ─────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditing ? t('currency_modal_edit_title') : t('currency_modal_add_title')}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <i className="fas fa-times text-gray-400"></i>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveCurrency(); }} className="space-y-4">
              {/* Row: Code + Name */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_code')} *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_name')} *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="US Dollar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Row: Symbol + Position + Decimals */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_symbol')}</label>
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    placeholder="$"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_position')}</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="before">{t('currency_position_before')}</option>
                    <option value="after">{t('currency_position_after')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_decimal_places')}</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={form.decimal_places}
                    onChange={(e) => setForm({ ...form, decimal_places: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Row: Rounding */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_rounding')}</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={form.rounding}
                    onChange={(e) => setForm({ ...form, rounding: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Create-only fields */}
              {!isEditing && (
                <>
                  <hr className="border-gray-200" />

                  {/* Set as Base or Initial Rate */}
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.set_as_base}
                        onChange={(e) => setForm({ ...form, set_as_base: e.target.checked, initial_rate: e.target.checked ? '' : form.initial_rate })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('currency_set_as_base')}</span>
                    </label>
                  </div>

                  {!form.set_as_base && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('currency_initial_rate')}</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={form.initial_rate}
                        onChange={(e) => setForm({ ...form, initial_rate: e.target.value })}
                        placeholder="0.0000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">{t('currency_initial_rate_help')}</p>
                    </div>
                  )}
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                  {isEditing ? t('currency_modal_update') : t('currency_modal_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyManager;