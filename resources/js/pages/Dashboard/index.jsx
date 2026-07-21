import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

const Dashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    customers: 0,
    suppliers: 0,
    expenses: 0,
  });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [recentSuppliers, setRecentSuppliers] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Static data based on sidebar modules
      setStats({
        customers: 128,
        suppliers: 45,
        expenses: 342,
      });

      setRecentCustomers([
        { id: 1, name: 'Customer 1', email: 'customer1@example.com', phone: '+1234567890', total_orders: 5 },
        { id: 2, name: 'Customer 2', email: 'customer2@example.com', phone: '+1234567891', total_orders: 3 },
        { id: 3, name: 'Customer 3', email: 'customer3@example.com', phone: '+1234567892', total_orders: 8 },
        { id: 4, name: 'Customer 4', email: 'customer4@example.com', phone: '+1234567893', total_orders: 2 },
        { id: 5, name: 'Customer 5', email: 'customer5@example.com', phone: '+1234567894', total_orders: 6 }
      ]);

      setRecentSuppliers([
        { id: 1, name: 'Tech Supplies Co.', email: 'sales@techsupplies.com', phone: '+1234567895', total_purchases: 12500 },
        { id: 2, name: 'Global Traders', email: 'info@globaltraders.com', phone: '+1234567896', total_purchases: 8700 },
        { id: 3, name: 'Quality Goods Ltd.', email: 'contact@qualitygoods.com', phone: '+1234567897', total_purchases: 15400 },
        { id: 4, name: 'Express Logistics', email: 'dispatch@expresslogistics.com', phone: '+1234567898', total_purchases: 4300 }
      ]);

      setRecentExpenses([
        { id: 1, category: 'Utilities', type: 'Electricity', amount: 450, date: '2024-01-15', status: 'paid' },
        { id: 2, category: 'Rent', type: 'Office Rent', amount: 2000, date: '2024-01-01', status: 'paid' },
        { id: 3, category: 'Supplies', type: 'Office Supplies', amount: 125, date: '2024-01-10', status: 'paid' },
        { id: 4, category: 'Transport', type: 'Fuel', amount: 280, date: '2024-01-12', status: 'pending' },
        { id: 5, category: 'Marketing', type: 'Advertising', amount: 500, date: '2024-01-08', status: 'paid' }
      ]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      Swal.fire('Error', 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome, {user.first_name + ' ' + user.last_name || user.email || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">
          Branch Dashboard — overview of your business activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.customers}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Suppliers</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.suppliers}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expenses</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.expenses}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0v8m2-8v8M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Customers</h2>
          <Link
            to="/customers"
            className="text-sm text-[#007c89] hover:text-[#006d77] font-medium"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
            <span className="ml-3 text-gray-500">Loading...</span>
          </div>
        ) : recentCustomers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.total_orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Suppliers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Suppliers</h2>
          <Link
            to="/suppliers"
            className="text-sm text-[#007c89] hover:text-[#006d77] font-medium"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          </div>
        ) : recentSuppliers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{supplier.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{supplier.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{supplier.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${supplier.total_purchases.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Expenses</h2>
          <Link
            to="/expenses"
            className="text-sm text-[#007c89] hover:text-[#006d77] font-medium"
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#007c89] border-t-transparent"></div>
          </div>
        ) : recentExpenses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{expense.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{expense.type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">${expense.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        expense.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;