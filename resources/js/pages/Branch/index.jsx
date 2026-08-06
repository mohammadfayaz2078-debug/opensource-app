import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import Swal from 'sweetalert2';
import BranchUsersModal from '../../components/BranchUsersModal';
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Building2,
  Store,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Package,
  UserPlus,
  AlertTriangle,
  Image
} from 'lucide-react';

// API Configuration - Hardcoded for now
const API_URL = 'http://localhost:8000';

// Helper function to get image URL
const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}/storage/${path}`;
};

const BranchIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isCompanyAdmin = location.pathname.startsWith('/company-admin');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [provinces, setProvinces] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'B';
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (id) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    return colors[id % colors.length];
  };

  const fetchBranches = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    
    const params = {
      search: searchQuery,
      per_page: perPage,
      page,
      is_active: statusFilter || '',
      branch_province: provinceFilter || ''
    };
    
    try {
      const res = await api.get('/branches', { params });
      
      let branchesData = [];
      let paginationData = {};
      
      if (res.data && res.data.data) {
        if (res.data.data.data && Array.isArray(res.data.data.data)) {
          branchesData = res.data.data.data;
          paginationData = {
            current_page: res.data.data.current_page || 1,
            last_page: res.data.data.last_page || 1,
            per_page: res.data.data.per_page || perPage,
            total: res.data.data.total || 0,
            from: res.data.data.from || 0,
            to: res.data.data.to || 0,
          };
        } else if (Array.isArray(res.data.data)) {
          branchesData = res.data.data;
          paginationData = res.data.meta || {
            current_page: page,
            last_page: 1,
            per_page: perPage,
            total: branchesData.length,
            from: branchesData.length > 0 ? 1 : 0,
            to: branchesData.length
          };
        } else if (res.data.meta) {
          branchesData = res.data.data;
          paginationData = res.data.meta;
        }
      } else if (Array.isArray(res.data)) {
        branchesData = res.data;
      }
      
      setBranches(branchesData);
      setPagination(paginationData);
      setCurrentPage(page);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, perPage, statusFilter, provinceFilter]);

  const fetchProvinces = async () => {
    try {
      const res = await api.get('/branches/provinces');
      let provincesData = [];
      if (res.data && res.data.data) {
        if (Array.isArray(res.data.data)) {
          provincesData = res.data.data;
        } else if (Array.isArray(res.data)) {
          provincesData = res.data;
        }
      } else if (Array.isArray(res.data)) {
        provincesData = res.data;
      }
      setProvinces(provincesData);
    } catch (err) {
      console.error('Failed to fetch provinces:', err);
      // Don't show error to user, just use empty array
    }
  };

  const openBranchUsers = (branch) => {
    if (!branch.is_active) {
      Swal.fire(t('branch.warning'), t('branch.warning_inactive'), 'warning');
      return;
    }
    setSelectedBranch(branch);
    setUsersModalOpen(true);
  };

  const closeBranchUsersModal = () => {
    setUsersModalOpen(false);
    setSelectedBranch(null);
  };

  const viewBranch = (id) => {
    navigate(`${id}/show`);
  };

  const editBranch = (id) => {
    navigate(`${id}/edit`);
  };

  const deleteBranch = async (id, branchName) => {
    const result = await Swal.fire({
      title: t('branch.delete_title'),
      html: t('branch.delete_confirm', { name: `<strong>${branchName}</strong>` }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('branch.delete_confirm_btn'),
      cancelButtonText: t('branch.cancel'),
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/branches/${id}`);
        Swal.fire({
          icon: 'success',
          title: t('branch.delete_success'),
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        fetchBranches(currentPage);
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || t('branch.delete_error'), 'error');
      }
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/branches/${id}/toggle-status`);
      Swal.fire({
        icon: 'success',
        title: res.data.data?.is_active ? t('branch.activated') : t('branch.deactivated'),
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      fetchBranches(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || t('branch.status_error'), 'error');
    }
  };

  const changePage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    fetchBranches(page);
  };

  const pageNumbers = useMemo(() => {
    if (!pagination || !pagination.last_page) return [];
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.current_page - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.last_page, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [pagination]);

  useEffect(() => {
    fetchProvinces();
    fetchBranches(1);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchBranches(1);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                {t('branch.title')}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('branch.subtitle', { total: pagination.total || 0 })}
              </p>
            </div>
            <Link
              to="create"
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {t('branch.new')}
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('branch.search')}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">{t('branch.all_provinces')}</option>
              {provinces.map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">{t('branch.all_status')}</option>
              <option value="active">{t('branch.active')}</option>
              <option value="inactive">{t('branch.inactive')}</option>
            </select>

            <div className="flex items-center gap-1.5 ml-auto">
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => fetchBranches(currentPage)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={t('branch.refresh')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-3 text-sm text-gray-500">{t('branch.loading')}</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          /* Branches Grid */
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {branches && branches.length > 0 ? (
              branches.map((branch) => {
                // Calculate capacity usage
                const userCount = branch.users_count || 0;
                const userCapacity = branch.allowed_user_count || 1;
                const productCount = branch.public_products_count || 0;
                const productCapacity = branch.allowed_product_publish_count || 10;
                const userUsagePercent = Math.min((userCount / userCapacity) * 100, 100);
                const productUsagePercent = Math.min((productCount / productCapacity) * 100, 100);
                const isUserFull = userCount >= userCapacity;
                const isProductFull = productCount >= productCapacity;
                
                // Get logo URL - Using the helper function
                const logoUrl = getImageUrl(branch.branch_logo_url);
                
                return (
                  <div
                    key={branch.id}
                    className={`bg-white rounded-xl shadow-sm border ${
                      branch.is_active ? 'border-gray-100' : 'border-gray-200 bg-gray-50/50'
                    } hover:shadow-md transition-all duration-200 group h-full min-w-0 overflow-hidden`}
                  >
                    <div className="p-3 h-full flex flex-col min-w-0">
                      {/* Header with Logo */}
                      <div className="flex items-start justify-between gap-2 mb-2.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Logo or Initials */}
                          {logoUrl ? (
                            <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 border border-gray-200 bg-white">
                              <img 
                                src={logoUrl} 
                                alt={branch.branch_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to initials on image error
                                  const parent = e.target.parentElement;
                                  const initials = getInitials(branch.branch_name);
                                  const color = getRandomColor(branch.id);
                                  parent.innerHTML = `
                                    <div class="w-full h-full flex items-center justify-center text-white font-semibold text-sm" 
                                         style="background-color: ${color}">
                                      ${initials}
                                    </div>
                                  `;
                                }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="w-9 h-9 rounded-md flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                              style={{ backgroundColor: getRandomColor(branch.id) }}
                            >
                              {getInitials(branch.branch_name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors truncate" title={branch.branch_name}>
                              {branch.branch_name}
                            </h3>
                            {branch.branch_slogan && (
                              <p className="text-xs text-gray-400 truncate w-full" title={branch.branch_slogan}>
                                {branch.branch_slogan}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] sm:text-xs font-medium rounded-full flex-shrink-0 whitespace-nowrap ${
                          branch.is_active 
                            ? 'bg-green-50 text-green-600 border border-green-200' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                          {branch.is_active ? t('branch.active') : t('branch.inactive')}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-2 text-xs text-gray-500 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                        <span className="min-w-0 break-words leading-relaxed">
                          {branch.branch_province || t('branch.no_province')}
                          {branch.branch_district && `, ${branch.branch_district}`}
                          {branch.branch_village && `, ${branch.branch_village}`}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-3 gap-y-1.5 mt-2 min-w-0">
                        {branch.branch_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate" title={branch.branch_phone}>{branch.branch_phone}</span>
                          </div>
                        )}
                        {branch.branch_email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate" title={branch.branch_email}>{branch.branch_email}</span>
                          </div>
                        )}
                      </div>

                      {/* Capacity Stats */}
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-2 flex-1">
                        {/* Users Capacity */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-600">
                                {t('branch.users')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium ${isUserFull ? 'text-red-600' : 'text-gray-600'}`}>
                                {userCount}
                              </span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-xs text-gray-500">{userCapacity}</span>
                              {isUserFull && (
                                <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />
                              )}
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isUserFull ? 'bg-red-500' : userUsagePercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${userUsagePercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Products Capacity */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-medium text-gray-600">
                                {t('branch.products')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-medium ${isProductFull ? 'text-red-600' : 'text-gray-600'}`}>
                                {productCount}
                              </span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-xs text-gray-500">{productCapacity}</span>
                              {isProductFull && (
                                <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />
                              )}
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isProductFull ? 'bg-red-500' : productUsagePercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${productUsagePercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {t('branch.created', { date: formatDate(branch.created_at) })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-1 mt-2.5 pt-2.5 border-t border-gray-100">
                        {isCompanyAdmin && (
                          <button
                            onClick={() => openBranchUsers(branch)}
                            disabled={!branch.is_active}
                            className={`min-w-0 inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                              !branch.is_active
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            title={!branch.is_active ? t('branch.branch_inactive_title') : t('branch.view_users_title')}
                          >
                            <Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                            <span className="truncate">{t('branch.view_users')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => viewBranch(branch.id)}
                          className="min-w-0 inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{t('branch.view')}</span>
                        </button>
                        <button
                          onClick={() => editBranch(branch.id)}
                          className="min-w-0 inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{t('branch.edit')}</span>
                        </button>
                        <button
                          onClick={() => deleteBranch(branch.id, branch.branch_name)}
                          className="min-w-0 inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          <span className="truncate">{t('branch.delete')}</span>
                        </button>
                      </div>

                      {/* Status Toggle */}
                      <div className="mt-1.5">
                        <button
                          onClick={() => toggleStatus(branch.id, branch.is_active)}
                          className={`w-full inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                            branch.is_active
                              ? 'text-green-600 bg-green-50 hover:bg-green-100'
                              : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {branch.is_active ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                              {t('branch.deactivate')}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              {t('branch.activate')}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{t('branch.empty')}</p>
                <Link
                  to="create"
                  className="mt-3 inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  {t('branch.create_first')}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {t('branch.showing')} <span className="font-medium text-gray-700">{pagination.from || 0}</span> {t('branch.to')}{' '}
                <span className="font-medium text-gray-700">{pagination.to || 0}</span> {t('branch.of')}{' '}
                <span className="font-medium text-gray-700">{pagination.total || 0}</span> {t('branch.results')}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => changePage(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className={`inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border ${
                    pagination.current_page === 1
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  } transition-colors`}
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  {t('branch.prev')}
                </button>

                <div className="flex items-center gap-0.5">
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => changePage(page)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                        page === pagination.current_page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  {pagination.last_page > 5 && pagination.current_page < pagination.last_page - 2 && (
                    <>
                      <span className="px-1 text-gray-400 text-xs">…</span>
                      <button
                        onClick={() => changePage(pagination.last_page)}
                        className="px-2.5 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {pagination.last_page}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => changePage(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.last_page}
                  className={`inline-flex items-center px-2.5 py-1.5 text-xs rounded-lg border ${
                    pagination.current_page === pagination.last_page
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  } transition-colors`}
                >
                  {t('branch.next')}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Users Modal */}
      <BranchUsersModal
        branch={selectedBranch}
        isOpen={usersModalOpen}
        onClose={closeBranchUsersModal}
      />
    </div>
  );
};

export default BranchIndex;
