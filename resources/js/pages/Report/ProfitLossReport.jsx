import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../plugins/axios';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  Wallet,
  BarChart3,
  PieChart,
  LineChart,
  X,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Award,
  AlertCircle
} from 'lucide-react';

import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  AreaChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const ProfitLossReport = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [filters, setFilters] = useState({
    from_date: '', // Empty - show all dates
    to_date: '',   // Empty - show all dates
    period_type: 'yearly', // Default to yearly
  });
  const [showFilters, setShowFilters] = useState(false);
  const [chartTab, setChartTab] = useState('overview');

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/profit-loss-report/filters');
      setFilterOptions(res.data);
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      // Only send dates if they are not empty
      if (!params.from_date) delete params.from_date;
      if (!params.to_date) delete params.to_date;
      
      const res = await api.get('/profit-loss-report', { params });
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
  };

  const handlePresetChange = (preset) => {
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    switch (preset) {
      case 'today':
        fromDate = now;
        toDate = now;
        break;
      case 'yesterday':
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 1);
        toDate = new Date(now);
        toDate.setDate(now.getDate() - 1);
        break;
      case 'this_week':
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - now.getDay());
        toDate = now;
        break;
      case 'last_week':
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - now.getDay() - 7);
        toDate = new Date(now);
        toDate.setDate(now.getDate() - now.getDay() - 1);
        break;
      case 'this_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = now;
        break;
      case 'last_month':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        fromDate = new Date(now.getFullYear(), quarter * 3, 1);
        toDate = now;
        break;
      case 'this_year':
        fromDate = new Date(now.getFullYear(), 0, 1);
        toDate = now;
        break;
      case 'all_time':
        fromDate = null;
        toDate = null;
        setFilters(prev => ({
          ...prev,
          from_date: '',
          to_date: '',
        }));
        return;
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      from_date: fromDate ? fromDate.toISOString().split('T')[0] : '',
      to_date: toDate ? toDate.toISOString().split('T')[0] : '',
    }));
  };

  const clearFilters = () => {
    setFilters({
      from_date: '',
      to_date: '',
      period_type: 'yearly',
    });
  };

  const handleExport = async () => {
    try {
      const params = { ...filters };
      if (!params.from_date) delete params.from_date;
      if (!params.to_date) delete params.to_date;
      
      const res = await api.get('/profit-loss-report/export', { params });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profit-loss-report-${new Date().toISOString().split('T')[0]}.json`;
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

  const formatDate = (date) => {
    if (!date) return t('profit_loss.all_time');
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

  const getStatusBgColor = (value) => {
    if (value > 0) return 'bg-green-50 border-green-200';
    if (value < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (value) => {
    if (value > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">{t('profit_loss.loading')}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const chartData = data?.chart_data || { labels: [], revenue: [], profit: [], expenses: [] };
  const monthlyTrend = data?.monthly_trend || [];
  const categoryBreakdown = data?.category_breakdown || { expense_categories: [], income_categories: [] };
  const topProducts = data?.top_products || [];
  const period = data?.period || {};

  // Prepare chart data
  const overviewChartData = chartData.labels.map((label, index) => ({
    name: label,
    revenue: chartData.revenue[index] || 0,
    profit: chartData.profit[index] || 0,
    expenses: chartData.expenses[index] || 0,
  }));

  // Monthly trend chart data
  const trendChartData = monthlyTrend.map(item => ({
    month: item.month,
    revenue: item.revenue,
    expenses: item.expenses,
    profit: item.profit,
    other_income: item.other_income || 0,
  }));

  // Expense category data for pie chart
  const expenseCategoryData = categoryBreakdown.expense_categories?.map(item => ({
    name: item.name,
    value: item.total,
  })) || [];

  // Income category data for pie chart
  const incomeCategoryData = categoryBreakdown.income_categories?.map(item => ({
    name: item.name,
    value: item.total,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              {t('profit_loss.title')}
            </h1>
            <p className="text-xs text-gray-500">{t('profit_loss.subtitle')}</p>
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('report.refresh')}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('report.from')}</label>
                <input
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('profit_loss.all_time')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('report.to')}</label>
                <input
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder={t('profit_loss.all_time')}
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('profit_loss.period_type')}</label>
                <select
                  value={filters.period_type}
                  onChange={(e) => handleFilterChange('period_type', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  {filterOptions?.period_types?.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">{t('profit_loss.quick_select')}</label>
                <select
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('profit_loss.select_preset')}</option>
                  {filterOptions?.date_range_presets?.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                  <option value="all_time">{t('profit_loss.all_time')}</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  {t('profit_loss.reset')}
                </button>
              </div>
            </div>
            {/* Show date range info */}
            <div className="mt-2 text-[10px] text-gray-400">
              {filters.from_date || filters.to_date ? (
                <span>{t('profit_loss.showing')} {formatDate(filters.from_date)} - {formatDate(filters.to_date)}</span>
              ) : (
                <span>{t('profit_loss.showing')} {t('profit_loss.all_time')}</span>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('profit_loss.revenue')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.gross_revenue)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('profit_loss.gross_profit')}</p>
                <p className={`text-lg font-bold ${getStatusColor(summary.gross_profit)}`}>
                  {formatCurrency(summary.gross_profit)}
                </p>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('profit_loss.margin', { value: summary.gross_profit_margin?.toFixed(1) })}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('profit_loss.expenses')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.total_expenses)}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm border p-3 ${
            summary.net_profit > 0 ? 'border-green-200 bg-green-50/30' : 
            summary.net_profit < 0 ? 'border-red-200 bg-red-50/30' : 
            'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('profit_loss.net_profit')}</p>
                <p className={`text-lg font-bold ${getStatusColor(summary.net_profit)}`}>
                  {formatCurrency(summary.net_profit)}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                summary.net_profit > 0 ? 'bg-emerald-100' : 
                summary.net_profit < 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                {getStatusIcon(summary.net_profit)}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('profit_loss.margin', { value: summary.net_profit_margin?.toFixed(1) })}</p>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('profit_loss.sales')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.total_sales)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('profit_loss.items_sold')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.total_items_sold)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('profit_loss.purchases')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.total_purchases)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('profit_loss.items_purchased')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.total_items_purchased)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('profit_loss.profit_per_order')}</p>
            <p className={`text-sm font-bold ${getStatusColor(summary.profit_per_order)}`}>
              {formatCurrency(summary.profit_per_order)}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
          <div className="border-b border-gray-200 px-4 py-2 flex items-center gap-4 overflow-x-auto">
            <button
              onClick={() => setChartTab('overview')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                chartTab === 'overview' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('profit_loss.tab_overview')}
            </button>
            <button
              onClick={() => setChartTab('trend')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                chartTab === 'trend' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('profit_loss.tab_trend')}
            </button>
            <button
              onClick={() => setChartTab('expenses')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                chartTab === 'expenses' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('profit_loss.tab_expenses')}
            </button>
            <button
              onClick={() => setChartTab('income')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                chartTab === 'income' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('profit_loss.tab_income')}
            </button>
            <button
              onClick={() => setChartTab('products')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                chartTab === 'products' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('profit_loss.tab_products')}
            </button>
          </div>

          <div className="p-4">
            <div className="h-64">
              {chartTab === 'overview' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={overviewChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} />
                    <Bar dataKey="profit" fill="#10B981" />
                    <Bar dataKey="expenses" fill="#EF4444" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'trend' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#FCA5A5" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="profit" stroke="#10B981" fill="#6EE7B7" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'expenses' && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expenseCategoryData.map((entry, index) => (
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
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('profit_loss.expense_categories')}</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {expenseCategoryData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-gray-600 truncate">{item.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      {expenseCategoryData.length === 0 && (
                        <p className="text-gray-400 text-sm">{t('profit_loss.no_expense_data')}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {chartTab === 'income' && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {incomeCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('profit_loss.income_categories')}</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {incomeCategoryData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}></div>
                            <span className="text-gray-600 truncate">{item.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                      {incomeCategoryData.length === 0 && (
                        <p className="text-gray-400 text-sm">{t('profit_loss.no_income_data')}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {chartTab === 'products' && (
                <div className="overflow-y-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{t('profit_loss.col_product')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('profit_loss.col_qty')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('profit_loss.col_revenue')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('profit_loss.col_cost')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('profit_loss.col_profit')}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{t('profit_loss.col_margin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.slice(0, 10).map((product, index) => (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[120px]">{product.name}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(product.total_quantity)}</td>
                          <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(product.total_revenue)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{formatCurrency(product.total_cost)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${getStatusColor(product.total_profit)}`}>
                            {formatCurrency(product.total_profit)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              product.profit_margin > 20 ? 'bg-green-100 text-green-700' :
                              product.profit_margin > 10 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {product.profit_margin}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {topProducts.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-3 py-4 text-center text-gray-400">{t('profit_loss.no_product_data')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Period Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {t('profit_loss.report_period')} {filters.from_date || filters.to_date ? (
                `${formatDate(filters.from_date)} - ${formatDate(filters.to_date)}`
              ) : (
                t('profit_loss.all_time')
              )}
            </span>
            <span>{t('profit_loss.generated')} {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReport;