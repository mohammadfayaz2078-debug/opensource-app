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
  Plus,
  Minus,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle,
  XCircle
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
  ComposedChart,
  AreaChart
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
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
          <p className="mt-4 text-gray-600 font-medium">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const salesOverview = data?.sales_overview || {};
  const revenueExpenses = data?.revenue_expenses || { labels: [], revenue: [], expenses: [], profit: [] };
  const topProducts = data?.top_products || [];
  const topCustomers = data?.top_customers || [];
  const recentActivity = data?.recent_activity || [];
  const quickStats = data?.quick_stats || {};
  const monthlyTrend = data?.monthly_trend || [];
  const inventoryStatus = data?.inventory_status || {};

  // Chart data
  const revenueChartData = revenueExpenses.labels.map((label, index) => ({
    name: label,
    revenue: revenueExpenses.revenue[index] || 0,
    expenses: revenueExpenses.expenses[index] || 0,
    profit: revenueExpenses.profit[index] || 0,
  }));

  const trendChartData = monthlyTrend.map(item => ({
    month: item.month,
    sales: item.sales || 0,
    purchases: item.purchases || 0,
    new_customers: item.new_customers || 0,
  }));

  // Payment breakdown for pie chart
  const paymentData = salesOverview.payment_breakdown?.map(item => ({
    name: t(`payment.${String(item.status || '').toLowerCase()}`, { defaultValue: String(item.status || '').toUpperCase() }),
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
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              {t('dashboard.title')}
            </h1>
            <p className="text-xs text-gray-500">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
            </button>
            <span className="text-xs text-gray-400">{data?.period?.this_month || ''}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('dashboard.today_sales')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.today?.sales)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('dashboard.orders', { count: formatNumber(summary.today?.sales_count || 0) })}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('dashboard.month_sales')}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(summary.this_month?.sales)}</p>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className={`text-[10px] font-medium ${getStatusColor(summary.this_month?.profit)} mt-1`}>
              {t('dashboard.profit', { amount: formatCurrency(summary.this_month?.profit) })}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('dashboard.month_expenses')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.this_month?.expenses)}</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('dashboard.vs_purchases', { amount: formatCurrency(summary.this_month?.purchases) })}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{t('dashboard.customers')}</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary.counts?.customers)}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{t('dashboard.new_today', { count: formatNumber(quickStats.customers?.today || 0) })}</p>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('dashboard.invoices')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(quickStats.invoices?.total || 0)}</p>
            <p className="text-[9px] text-gray-400">{t('dashboard.this_month', { count: formatNumber(quickStats.invoices?.this_month || 0) })}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('dashboard.bills')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(quickStats.bills?.total || 0)}</p>
            <p className="text-[9px] text-gray-400">{t('dashboard.this_month', { count: formatNumber(quickStats.bills?.this_month || 0) })}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('dashboard.products')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.counts?.products || 0)}</p>
            <p className="text-[9px] text-gray-400">{t('dashboard.in_stock', { count: formatNumber(inventoryStatus.in_stock || 0) })}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('dashboard.suppliers')}</p>
            <p className="text-sm font-bold text-gray-900">{formatNumber(summary.counts?.suppliers || 0)}</p>
            <p className="text-[9px] text-gray-400">{t('dashboard.active_suppliers')}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 text-center">
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">{t('dashboard.return_rate')}</p>
            <p className="text-sm font-bold text-gray-900">{quickStats.return_rate || 0}%</p>
            <p className="text-[9px] text-gray-400">{t('dashboard.of_total_sales')}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Revenue vs Expenses Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.revenue_vs_expenses')}</h2>
            <div className="h-64">
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
                  <Area type="monotone" dataKey="revenue" name={t('dashboard.revenue')} stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expenses" name={t('dashboard.expenses')} stroke="#EF4444" fill="#FCA5A5" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="profit" name={t('dashboard.profit_label')} stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.payment_breakdown')}</h2>
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
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.monthly_trend')}</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Bar dataKey="sales" fill="#3B82F6" name={t('dashboard.sales')} />
                <Bar dataKey="purchases" fill="#8B5CF6" name={t('dashboard.purchases')} />
                <Bar dataKey="new_customers" fill="#10B981" name={t('dashboard.new_customers')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              {t('dashboard.top_products')}
            </h2>
            <div className="space-y-2">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{t('dashboard.units', { count: formatNumber(product.quantity) })}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(product.revenue)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">{t('dashboard.no_products')}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              {t('dashboard.top_customers')}
            </h2>
            <div className="space-y-2">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-400 w-5">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-500">{t('dashboard.order_count', { count: customer.order_count })}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(customer.total_spent)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">{t('dashboard.no_customers')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Status & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Inventory Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" />
              {t('dashboard.inventory_status')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('dashboard.in_stock_label')}</span>
                <span className="text-sm font-bold text-green-600">{formatNumber(inventoryStatus.in_stock || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('dashboard.low_stock')}</span>
                <span className="text-sm font-bold text-yellow-600">{formatNumber(inventoryStatus.low_stock || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('dashboard.out_of_stock')}</span>
                <span className="text-sm font-bold text-red-600">{formatNumber(inventoryStatus.out_of_stock || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('dashboard.total_products')}</span>
                <span className="text-sm font-bold text-gray-900">{formatNumber(inventoryStatus.total_products || 0)}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              {t('dashboard.recent_activity')}
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${getActivityColor(activity.type)}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {getActivityIcon(activity.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.type === 'sale' && t('dashboard.invoice_ref', { ref: activity.reference })}
                          {activity.type === 'purchase' && t('dashboard.bill_ref', { ref: activity.reference })}
                          {activity.type === 'customer' && t('dashboard.new_customer_ref', { name: activity.name })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.customer || activity.supplier || activity.code || ''}
                          {' '}• {activity.time_ago || t('dashboard.just_now')}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <p className="text-sm font-semibold text-gray-900 ml-2">{formatCurrency(activity.amount)}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">{t('dashboard.no_activity')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px] text-gray-400">
          {data?.period?.today ? t('dashboard.updated_on', { date: new Date(data.period.today).toLocaleString() }) : ''}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
