import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../plugins/axios';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  BarChart3,
  Activity,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  Building2,
  UserPlus,
  Store,
  ChevronDown,
  Calendar,
  X,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const CompanyDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [branches, setBranches] = useState([]); // ✅ Define branches state
  const [filters, setFilters] = useState({
    branch_id: '',
    from_date: '',
    to_date: '',
    period_type: 'monthly',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch branches separately
  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [filters]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches?per_page=100');
      // Check if response has data property
      const branchesData = res.data?.data?.data || res.data?.data || [];
      setBranches(branchesData);
      console.log('Branches fetched:', branchesData);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      // If the branches endpoint fails, try to get from dashboard
      if (data?.branches) {
        setBranches(data.branches);
      }
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.from_date) delete params.from_date;
      if (!params.to_date) delete params.to_date;
      
      const res = await api.get('/company-admin/dashboard', { params });
      console.log('Dashboard Response:', res.data);
      console.log('Branches:', res.data?.branches);
      
      setData(res.data);
      
      // If branches are returned in dashboard response, use them
      if (res.data?.branches && res.data.branches.length > 0) {
        setBranches(res.data.branches);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchBranches()]);
    setRefreshing(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      branch_id: '',
      from_date: '',
      to_date: '',
      period_type: 'monthly',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AFN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const formatDate = (date) => {
    if (!date) return t('company_admin.all_time');
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'purchase':
        return <Truck className="w-4 h-4 text-purple-500" />;
      case 'customer':
        return <Users className="w-4 h-4 text-emerald-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'sale':
        return 'bg-blue-50 border-blue-200';
      case 'purchase':
        return 'bg-purple-50 border-purple-200';
      case 'customer':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">{t('company_admin.loading')}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const branchStats = data?.branch_stats || [];
  const salesData = data?.sales_data || {};
  const financialChart = data?.financial_chart || { labels: [], revenue: [], expenses: [], profit: [] };
  const topProducts = data?.top_products || [];
  const topBranches = data?.top_branches || [];
  const recentActivity = data?.recent_activity || [];
  const userStats = data?.user_stats || {};
  const inventoryStats = data?.inventory_stats || {};
  const selectedBranch = data?.selected_branch;

  // Chart data
  const chartData = financialChart.labels.map((label, index) => ({
    name: label,
    revenue: financialChart.revenue[index] || 0,
    expenses: financialChart.expenses[index] || 0,
    profit: financialChart.profit[index] || 0,
  }));

  // Payment breakdown for pie chart
  const paymentData = salesData.payment_breakdown?.map(item => ({
    name: item.status.toUpperCase(),
    value: item.count,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" />
              {t('company_admin.title')}
            </h1>
            <p className="text-xs text-gray-500">{data?.company?.company_name || t('company_admin.overview')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? t('company_admin.hide_filters') : t('company_admin.filters')}
            </button>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t('company_admin.refreshing') : t('company_admin.refresh')}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('company_admin.branch')}</label>
                <select
                  value={filters.branch_id}
                  onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('company_admin.all_branches')}</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name}
                      {branch.branch_province && ` (${branch.branch_province})`}
                    </option>
                  ))}
                </select>
                {branches.length === 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">{t('company_admin.no_branches')}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('company_admin.from')}</label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('company_admin.to')}</label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('company_admin.period_type')}</label>
                <select
                  value={filters.period_type}
                  onChange={(e) => handleFilterChange('period_type', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="daily">{t('company_admin.period_daily')}</option>
                  <option value="weekly">{t('company_admin.period_weekly')}</option>
                  <option value="monthly">{t('company_admin.period_monthly')}</option>
                  <option value="yearly">{t('company_admin.period_yearly')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
                {t('company_admin.clear_filters')}
              </button>
            </div>
          </div>
        )}

        {/* Selected Branch Info */}
        {selectedBranch && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedBranch.branch_name}</p>
                <p className="text-xs text-gray-600">{selectedBranch.branch_province}, {selectedBranch.branch_district}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('company_admin.revenue')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.sales?.total)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('company_admin.orders', { count: formatNumber(summary.sales?.count || 0) })}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('company_admin.expenses')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.expenses?.total)}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('company_admin.transactions', { count: formatNumber(summary.expenses?.count || 0) })}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('company_admin.net_profit')}</p>
                <p className={`text-lg font-bold ${getStatusColor(summary.net_profit)}`}>
                  {formatCurrency(summary.net_profit)}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                summary.net_profit > 0 ? 'bg-emerald-100' : 
                summary.net_profit < 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                {summary.net_profit > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                ) : summary.net_profit < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : (
                  <Activity className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('company_admin.after_expenses')}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('company_admin.customers')}</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary.customers)}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('company_admin.suppliers', { count: formatNumber(summary.suppliers || 0) })}</p>
          </div>
        </div>

        {/* Branch Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            {t('company_admin.branch_performance')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{t('company_admin.branch')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('company_admin.th_sales')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('company_admin.th_orders')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('company_admin.th_purchases')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('company_admin.th_expenses')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('company_admin.th_profit')}</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">{t('company_admin.th_customers')}</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.length > 0 ? (
                  branchStats.map((branch, index) => (
                    <tr key={branch.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{branch.name}</div>
                        <div className="text-[10px] text-gray-400">{branch.location}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(branch.sales)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(branch.sales_count)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(branch.purchases)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(branch.expenses)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${getStatusColor(branch.profit)}`}>
                        {formatCurrency(branch.profit)}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{formatNumber(branch.customers)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-3 py-4 text-center text-gray-400">{t('company_admin.no_branch_data')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Financial Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('company_admin.financial_overview')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#FCA5A5" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('company_admin.sales_payment_status')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Products & Branches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              {t('company_admin.top_products')}
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{t('company_admin.units', { count: formatNumber(product.quantity) })}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(product.revenue)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">{t('company_admin.no_product_data')}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-500" />
              {t('company_admin.top_branches')}
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topBranches.length > 0 ? (
                topBranches.map((branch, index) => (
                  <div key={branch.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{branch.name}</p>
                        <p className="text-xs text-gray-500">{t('company_admin.orders', { count: formatNumber(branch.order_count) })}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(branch.revenue)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">{t('company_admin.no_branch_data')}</p>
              )}
            </div>
          </div>
        </div>

        {/* User & Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {t('company_admin.user_statistics')}
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">{t('company_admin.total')}</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(userStats.total)}</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">{t('company_admin.active')}</p>
                <p className="text-lg font-bold text-green-600">{formatNumber(userStats.active)}</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-500">{t('company_admin.inactive')}</p>
                <p className="text-lg font-bold text-red-600">{formatNumber(userStats.inactive)}</p>
              </div>
            </div>
            <div className="space-y-1">
              {userStats.by_role?.map((role, index) => (
                <div key={index} className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{role.role}</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(role.count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              {t('company_admin.inventory_overview')}
            </h2>
            <div className="text-center p-3 bg-gray-50 rounded-lg mb-3">
              <p className="text-xs text-gray-500">{t('company_admin.total_products')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(inventoryStats.total)}</p>
            </div>
            <div className="space-y-1">
              {inventoryStats.by_category?.map((category, index) => (
                <div key={index} className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{category.category}</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(category.count)}</span>
                </div>
              ))}
              {(!inventoryStats.by_category || inventoryStats.by_category.length === 0) && (
                <p className="text-center text-gray-400 py-2 text-sm">{t('company_admin.no_categories_data')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            {t('company_admin.recent_activity')}
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${getActivityColor(activity.type)}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {getActivityIcon(activity.type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.type === 'sale' && t('company_admin.activity_sale', { reference: activity.reference })}
                        {activity.type === 'purchase' && t('company_admin.activity_purchase', { reference: activity.reference })}
                        {activity.type === 'customer' && t('company_admin.activity_customer', { name: activity.name })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.customer || activity.supplier || activity.code || ''}
                        {activity.branch && ` • ${activity.branch}`}
                        {' '}• {activity.time_ago || t('company_admin.just_now')}
                      </p>
                    </div>
                  </div>
                  {activity.amount && (
                    <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(activity.amount)}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-4 text-sm">{t('company_admin.no_recent_activity')}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-gray-400">
          {data?.company?.company_name || t('company_admin.title')} • 
          {filters.from_date || filters.to_date ? (
            ` ${t('company_admin.showing_range', { from: formatDate(filters.from_date), to: formatDate(filters.to_date) })}`
          ) : (
            ` ${t('company_admin.showing_all_time')}`
          )}
          {selectedBranch && ` • ${t('company_admin.branch_suffix', { name: selectedBranch.branch_name })}`}
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;