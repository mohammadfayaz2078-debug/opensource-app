import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  Filter,
  Download,
  Search,
  X,
  BarChart3,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronDown
} from 'lucide-react';

// Chart Components
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

const SalesReport = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    customer_id: '',
    product_id: '',
    status: '',
    payment_status: '',
    min_amount: '',
    max_amount: '',
    salesperson_id: '',
    search: '',
    chart_type: 'daily',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [chartTab, setChartTab] = useState('revenue'); // revenue, growth, payment

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, currentPage, perPage]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/sales-report/filters');
      setFilterOptions(res.data);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: currentPage,
        per_page: perPage,
      };
      const res = await api.get('/sales-report', { params });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      from_date: '',
      to_date: '',
      customer_id: '',
      product_id: '',
      status: '',
      payment_status: '',
      min_amount: '',
      max_amount: '',
      salesperson_id: '',
      search: '',
      chart_type: 'daily',
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const params = { ...filters };
      const res = await api.get('/sales-report/export', { params });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
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

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      returned: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPaymentColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700',
      unpaid: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getGrowthPercentage = () => {
    if (!data?.chart_data?.revenue || data.chart_data.revenue.length < 2) return 0;
    const revenues = data.chart_data.revenue;
    const first = revenues[0] || 0;
    const last = revenues[revenues.length - 1] || 0;
    if (first === 0) return last > 0 ? 100 : 0;
    return ((last - first) / first) * 100;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">{t('sale_report.loading')}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const chartData = data?.chart_data || { labels: [], revenue: [], count: [], paid: [], due: [] };
  const topProducts = data?.top_products || [];
  const topCustomers = data?.top_customers || [];
  const sales = data?.sales || [];
  const pagination = data?.pagination || {};
  const growthPercentage = getGrowthPercentage();

  // Prepare chart data
  const revenueChartData = chartData.labels.map((label, index) => ({
    name: label,
    revenue: chartData.revenue[index] || 0,
    count: chartData.count[index] || 0,
    paid: chartData.paid[index] || 0,
    due: chartData.due[index] || 0,
  }));

  const paymentData = data?.payment_breakdown?.map(item => ({
    name: item.status.toUpperCase(),
    value: item.total,
    count: item.count,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              {t('sale_report.title')}
            </h1>
            <p className="text-xs text-gray-500">{t('sale_report.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? t('report.hide_filters') : t('report.filters')}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('report.export')}
            </button>
            <button
              onClick={fetchReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('report.refresh')}
            </button>
          </div>
        </div>

        {/* Filters Panel - Compact */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('report.from')}</label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('report.to')}</label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.customer')}</label>
                <select
                  value={filters.customer_id}
                  onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterOptions?.customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.product')}</label>
                <select
                  value={filters.product_id}
                  onChange={(e) => handleFilterChange('product_id', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterOptions?.products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.status')}</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterOptions?.statuses?.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.payment')}</label>
                <select
                  value={filters.payment_status}
                  onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterOptions?.payment_statuses?.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.salesperson')}</label>
                <select
                  value={filters.salesperson_id}
                  onChange={(e) => handleFilterChange('salesperson_id', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterOptions?.salespersons?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.min_amount')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.min_amount}
                  onChange={(e) => handleFilterChange('min_amount', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('sale_report.max_amount')}</label>
                <input
                  type="number"
                  placeholder="999999"
                  value={filters.max_amount}
                  onChange={(e) => handleFilterChange('max_amount', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('report.search')}</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('report.search_placeholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  {t('report.clear')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('sale_report.revenue')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('sale_report.sales')}</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary.total_sales)}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('report.paid')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.total_paid)}</p>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('report.due')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.total_due)}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Growth Indicator */}
        {growthPercentage !== 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{t('sale_report.sales_growth')}</span>
              <span className={`text-sm font-bold ${growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthPercentage >= 0 ? '↑' : '↓'} {Math.abs(growthPercentage).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400">{t('report.growth_hint')}</span>
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          {/* Chart Tabs */}
          <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-4">
            <button
              onClick={() => setChartTab('revenue')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                chartTab === 'revenue' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('sale_report.tab_revenue')}
            </button>
            <button
              onClick={() => setChartTab('growth')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                chartTab === 'growth' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('report.tab_growth')}
            </button>
            <button
              onClick={() => setChartTab('payment')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                chartTab === 'payment' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('report.tab_payment')}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={filters.chart_type}
                onChange={(e) => handleFilterChange('chart_type', e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">{t('report.daily')}</option>
                <option value="weekly">{t('report.weekly')}</option>
                <option value="monthly">{t('report.monthly')}</option>
                <option value="yearly">{t('report.yearly')}</option>
              </select>
            </div>
          </div>

          <div className="p-4">
            <div className="h-64">
              {chartTab === 'revenue' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} />
                    <Bar dataKey="paid" fill="#10B981" />
                    <Bar dataKey="due" fill="#EF4444" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'growth' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="paid" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="due" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'payment' && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-1/2">
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
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('report.payment_summary')}</h4>
                    <div className="space-y-2">
                      {paymentData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products & Customers - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              {t('report.top_products')}
            </h2>
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{t('report.units', { count: formatNumber(product.total_quantity) })}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(product.total_revenue)}</p>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-center text-gray-400 py-2 text-sm">{t('report.no_products_data')}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              {t('sale_report.top_customers')}
            </h2>
            <div className="space-y-2">
              {topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.customer_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{customer.customer_name}</p>
                      <p className="text-xs text-gray-500">{t('report.orders', { count: customer.order_count })}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(customer.total_spent)}</p>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-center text-gray-400 py-2 text-sm">{t('sale_report.no_customer_data')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table - Compact */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{t('sale_report.transactions')}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t('report.records', { count: pagination.total || 0 })}</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{t('report.col_ref')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{t('report.col_date')}</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{t('sale_report.col_customer')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('report.col_total')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('report.col_paid')}</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('report.col_due')}</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">{t('sale_report.col_status')}</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">{t('report.col_payment')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-400">{t('report.no_records')}</td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <button
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {sale.reference_no}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{sale.document_date?.split('T')[0] || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[100px]">{sale.customer?.full_name || t('sale_report.walk_in')}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(sale.total_amount)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(sale.paid_amount)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(sale.due_amount)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(sale.status)}`}>
                          {sale.status?.charAt(0).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getPaymentColor(sale.payment_status)}`}>
                          {sale.payment_status?.charAt(0).toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - Compact */}
          {pagination.last_page > 1 && (
            <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
              <div className="text-[10px] text-gray-500">
                {pagination.from || 0} - {pagination.to || 0} of {pagination.total || 0}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('report.prev')}
                </button>
                {Array.from({ length: Math.min(3, pagination.last_page) }, (_, i) => {
                  let pageNum = i + 1;
                  if (pagination.last_page > 3) {
                    if (currentPage > 2) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > pagination.last_page) {
                        pageNum = pagination.last_page - 2 + i;
                      }
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 text-xs rounded ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                  disabled={currentPage === pagination.last_page}
                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('report.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReport;