import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarDropdown from './SidebarDropdown';
import api from '../plugins/axios';

// Icon components
const Icons = {
  home: () => (
    <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  settings: () => (
    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  wallet: () => (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h-4m4 0v4m0-4l-4 4m4-4l4-4m-4 4V5m0 4h4m-4 0l4 4M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m0 18h10a2 2 0 002-2v-4m-12 4V5m0 16h4m0-16h-4" />
    </svg>
  ),
  box: () => (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  truck: () => (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 18H6a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v2m2 10H8m10 0v-6a2 2 0 00-2-2H8m10 0v6m-6-6h6m-6 0v6" />
    </svg>
  ),
  chart: () => (
    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  user: () => (
    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  shopping: () => (
    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1 5h12l-1-5M5 21h.01M19 21h.01" />
    </svg>
  ),
  income: () => (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  package: () => (
    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  users: () => (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
};

const Sidebar = ({ 
  isCollapsed, 
  isMobileOpen, 
  isRTL, 
  onToggleCollapsed, 
  onToggleMobile, 
  onCloseMobile 
}) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsedGroupsOpen, setCollapsedGroupsOpen] = useState({});
  const [showSearch, setShowSearch] = useState(true);
  const sidebarRef = useRef(null);

  // API URL for images - Hardcoded to avoid process.env issues
  const API_URL = 'http://localhost:8000';

  // Translation helper (replace with your i18n implementation)
  const t = (key) => {
    const translations = {
      'search_links': 'Search links...',
      'sidebar_dashboard': 'Dashboard',
      'sidebar_employees': 'Employees',
      'sidebar_user_roles': 'User Roles',
      'sidebar_branches': 'Branches',
      'sidebar_users': 'Users',
      'sidebar_customer_list': 'Customers',
      'sidebar_add_customer': 'Add a Customer',
      'sidebar_inactive_customers': 'Display inactive customers',
      'sidebar_record_journal': 'Record Journal',
      'sidebar_view_journal': 'View Journal Entries',
      'sidebar_supplier_list': 'Suppliers',
      'sidebar_mileage_list': 'Mileage List',
      'sidebar_vehicle_list': 'Vehicle List',
      'sidebar_last_invoice': 'Last Invoice',
      'sidebar_salesperson': 'Salesperson',
      'sidebar_expenses': 'Expenses',
      'sidebar_purchase_orders': 'Bill',
      'sidebar_purchase_returns': 'Purchase Returns',
      'sidebar_invoices': 'Invoices',
      'sidebar_sale_returns': 'Sale Returns',
      'sidebar_stock_balances': 'Stock Balances',
      'sidebar_stock_transactions': 'Transactions',
      'sidebar_suppliers': 'Suppliers',
      'sidebar_income_categories': 'Income Categories',
      'sidebar_other_incomes': 'Other Incomes',
      'sidebar_expense_categories': 'Categories',
      'sidebar_expense_types': 'Expense Types',
      'sidebar_salespersons': 'Salespersons',
      'management': 'Management',
      'Administration': 'Administration',
      'Customers': 'Customer',
      'Banking': 'Banking',
      'Purchases': 'Purchases',
      'Inventory': 'Inventory',
      'Reports': 'Reports',
      'Accounting': 'Accounting',
      'sidebar_settings': 'Settings',
      'sidebar_receivable_list': 'Receivable List',
      'sidebar_payable_list': 'Payable List',
      'sidebar_category_list': 'Category List',
      'sidebar_warehouse_towers': 'Warehouses/Towers',
      'sidebar_product_categories': 'Product Category',
      'sidebar_products': 'Products',
      'sidebar_journals': 'Journals',
      'sidebar_sales': 'Sale Report',
      'sidebar_purchases': 'Purchase Report',
      'sidebar_profit_loss': 'Profit & Loss',
      'sidebar_profile': 'Profile',
      'sidebar_unit_categories': 'Unit Category',
      'sidebar_units': 'Product Units',
      'sidebar_accounts': 'Wallets',
      'sidebar_account_transactions': 'Wallet Transactions',
      'sidebar_account_transfers': 'Transfers',
    };
    return translations[key] || key;
  };

  const links = [
    {
      title: null,
      children: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: 'home',
          translation_key: 'sidebar_dashboard'
        }
      ]
    },
    {
      title: 'Sales',
      icon: 'users',
      translation_key: 'Sales',
      children: [
        { name: 'Customer', to: '/customers', translation_key: 'sidebar_customer_list' },
        { name: 'Invoices', to: '/sales', translation_key: 'sidebar_invoices' },
        { name: 'Sale Returns', to: '/sale-returns', translation_key: 'sidebar_sale_returns' },
      ]
    },
    {
      title: 'Purchases',
      icon: 'shopping',
      translation_key: 'Purchases',
      children: [
        { name: 'Suppliers', to: '/suppliers', translation_key: 'sidebar_supplier_list' },
        { name: 'Bill', to: '/purchases', translation_key: 'sidebar_purchase_orders' },
        { name: 'Purchase Returns', to: '/purchase-returns', translation_key: 'sidebar_purchase_returns' },
      ]
    },
    {
      title: 'Inventory',
      icon: 'box',
      translation_key: 'Inventory',
      children: [
        { name: 'Unit Category', to: '/unit-categories', translation_key: 'sidebar_unit_categories' },
        { name: 'Product Units', to: '/units', translation_key: 'sidebar_units' },
        { name: 'Product Category', to: '/product-categories', translation_key: 'sidebar_product_categories' },
        { name: 'Products', to: '/products', translation_key: 'sidebar_products' },
        { name: 'Stock Balances', to: '/stock/balances', translation_key: 'sidebar_stock_balances' },
        { name: 'Stock Transactions', to: '/stock/transactions', translation_key: 'sidebar_stock_transactions' },
      ]
    },
    {
      title: 'Accounting',
      icon: 'wallet',
      translation_key: 'Accounting',
      children: [
        { name: 'Wallets', to: '/accounts', translation_key: 'sidebar_accounts' },
        { name: 'Wallet Transactions', to: '/account-transactions', translation_key: 'sidebar_account_transactions' },
        { name: 'Transfers', to: '/account-transfers', translation_key: 'sidebar_account_transfers' },
      ]
    },
    {
      title: 'Incomes',
      icon: 'income',
      translation_key: 'Incomes',
      children: [
        { name: 'Income Category', to: '/income-categories', translation_key: 'sidebar_income_categories' },
        { name: 'Other Incomes', to: '/other-incomes', translation_key: 'sidebar_other_incomes' },
      ]
    },
    {
      title: 'Publication',
      icon: 'box',
      translation_key: 'Publication',
      children: [
        { name: 'Products & Orders', to: '/publications', translation_key: 'sidebar_publication' },
      ]
    },
    {
      title: 'Expenses',
      icon: 'shopping',
      translation_key: 'Expenses',
      children: [
        { name: 'Expense Types', to: '/expense-types', translation_key: 'sidebar_expense_types' },
        { name: 'Expenses', to: '/expenses', translation_key: 'sidebar_expenses' }
      ]
    },
    {
      title: 'Reports',
      icon: 'chart',
      translation_key: 'Reports',
      children: [
        { name: 'Sale Report', to: '/sales-report', translation_key: 'sidebar_sales' },
        { name: 'Purchase Report', to: '/purchase-report', translation_key: 'sidebar_purchases' },
        { name: 'Profit & Loss', to: '/profit-loss-report', translation_key: 'sidebar_profit_loss' }
      ]
    },
    {
      title: 'Settings',
      icon: 'settings',
      translation_key: 'Settings',
      children: [
        { name: 'Roles', to: '/roles', translation_key: 'Roles' },
        { name: 'Users', to: '/users', translation_key: 'Users' },
        { name: 'Settings', to: '/settings', translation_key: 'sidebar_settings' },
        { name: 'Profile', to: '/profile', translation_key: 'sidebar_profile' }
      ]
    }
  ];

  const filteredLinks = links
    .map(group => {
      const search = linkSearch.toLowerCase();
      const authorizedChildren = group.children?.filter(child => {
        if (!search) return true;
        return (
          child.name.toLowerCase().includes(search) ||
          t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_')).toLowerCase().includes(search)
        );
      });
      return {
        ...group,
        children: authorizedChildren
      };
    })
    .filter(group => group.children && group.children.length > 0);

  const getSidebarClasses = () => {
    const classes = [];

    if (windowWidth >= 1024) {
      if (isRTL) {
        classes.push('border-l', 'border-slate-200');
      } else {
        classes.push('border-r', 'border-slate-200');
      }

      if (isCollapsed) {
        classes.push('opacity-0', 'pointer-events-none');
        if (isRTL) {
          classes.push('translate-x-[calc(100%+8px)]');
        } else {
          classes.push('-translate-x-[calc(100%+8px)]');
        }
      } else {
        classes.push('w-56', 'translate-x-0', 'opacity-100', 'pointer-events-auto');
        if (isRTL) {
          classes.push('right-0');
        } else {
          classes.push('left-0');
        }
      }
    } else {
      classes.push('w-56');
      if (isRTL) {
        classes.push('right-0', 'border-l', 'border-slate-200');
      } else {
        classes.push('left-0', 'border-r', 'border-slate-200');
      }
      if (isMobileOpen) {
        classes.push('translate-x-0');
      } else {
        if (isRTL) {
          classes.push('translate-x-full');
        } else {
          classes.push('-translate-x-full');
        }
      }
    }

    return classes.join(' ');
  };

  const handleLinkClick = () => {
    setOpenDropdown(null);
    if (windowWidth < 1024) {
      onCloseMobile();
    }
  };

  const closeMobileSidebar = () => {
    onCloseMobile();
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const toggleCollapsedGroup = (name) => {
    setCollapsedGroupsOpen(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const isCollapsedGroupOpen = (name) => {
    return collapsedGroupsOpen[name];
  };

  const fetchUser = async () => {
    try {
      const res = await api.get('/me');
      const data = res.data || {};
      setUser(data.user ?? data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth);
    if (windowWidth >= 1024 && isCollapsed) {
      setShowSearch(false);
    } else {
      setShowSearch(true);
    }
  }, [isCollapsed]);

  useEffect(() => {
    fetchUser();
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }
  }, [isRTL]);

  const IconComponent = ({ icon, className = "w-4 h-4", isActive = false }) => {
    const Icon = Icons[icon];
    if (!Icon) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    }
    return <Icon />;
  };

  // Get branch logo URL - Using hardcoded API_URL
  const getBranchLogoUrl = () => {
    if (!user?.branch?.branch_logo_url) return null;
    const logoUrl = user.branch.branch_logo_url;
    if (logoUrl.startsWith('http')) return logoUrl;
    return `${API_URL}/storage/${logoUrl}`;
  };

  // Get initials for fallback
  const getInitials = () => {
    const branchName = user?.branch?.branch_name || 'M';
    return branchName.charAt(0).toUpperCase();
  };

  const branchLogoUrl = getBranchLogoUrl();

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && windowWidth < 1024 && (
        <div
          onClick={closeMobileSidebar}
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar-container fixed inset-y-0 z-40
           bg-[#F0F9FF] text-slate-700 border-r border-slate-200
           flex flex-col h-screen
           transform transition-all duration-300 ease-out
           shadow-sm ${getSidebarClasses()}`}
      >
        {/* Header with Logo */}
        <div
          className={`px-3 py-2.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {(!isCollapsed || windowWidth < 1024) && (
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Logo or Initials */}
              {branchLogoUrl ? (
                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-slate-200 bg-white shadow-sm">
                  <img 
                    src={branchLogoUrl} 
                    alt={user?.branch?.branch_name || 'Branch'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials on error
                      const parent = e.target.parentElement;
                      const initials = getInitials();
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]">
                          ${initials}
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] rounded-md flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
                  {getInitials()}
                </div>
              )}
              <div className={`overflow-hidden ${isRTL ? 'text-right' : ''}`}>
                <div className="text-sm font-medium text-slate-800 truncate leading-tight">
                  {user?.branch ? user.branch.branch_name : 'Management'}
                </div>
                <div className="text-xs text-slate-500 truncate leading-tight">
                  {user?.branch?.branch_province || user?.branch?.city || ''}
                </div>
              </div>
            </div>
          )}

          {isCollapsed && windowWidth >= 1024 && (
            <div className="w-full flex justify-center">
              {branchLogoUrl ? (
                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-slate-200 bg-white shadow-sm">
                  <img 
                    src={branchLogoUrl} 
                    alt={user?.branch?.branch_name || 'Branch'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const parent = e.target.parentElement;
                      const initials = getInitials();
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#0EA5E9] to-[#0284C7]">
                          ${initials}
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] rounded-md flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {getInitials()}
                </div>
              )}
            </div>
          )}

          {windowWidth < 1024 && (
            <button
              onClick={closeMobileSidebar}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        {(!isCollapsed || windowWidth < 1024) && showSearch && (
          <div className="mt-2 mb-1 flex-shrink-0 px-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder={t('search_links')}
                className="w-full pl-9 pr-3 py-1.5 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-[#EFF6FF] text-sm bg-white border border-slate-200 rounded"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={`flex-1 overflow-y-auto custom-scrollbar mt-2 ${isRTL ? 'text-right' : ''}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f8fafc'
          }}
        >
          {(!isCollapsed || windowWidth < 1024) ? (
            // Expanded view
            <>
              {filteredLinks.map((group, idx) => (
                <React.Fragment key={group.title || idx}>
                  {!group.title ? (
                    // Direct links (no dropdown)
                    group.children.map((child, childIdx) => (
                      <NavLink
                        key={childIdx}
                        to={child.to}
                        onClick={handleLinkClick}
                        className={({ isActive }) => `
                          flex items-center px-3 py-2 transition group relative
                          ${isRTL ? 'flex-row-reverse' : ''}
                          ${isActive 
                            ? 'text-[#0EA5E9] bg-[#EFF6FF] font-medium after:absolute after:left-0 after:top-1 after:bottom-1 after:w-0.5 after:bg-[#0EA5E9] after:rounded-r-full' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }
                        `}
                      >
                        <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                          <IconComponent 
                            icon={child.icon} 
                            className="w-5 h-5"
                          />
                        </div>
                        <span className={`text-base truncate ${isRTL ? 'mr-3' : 'ml-3'}`}>
                          {t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_'))}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    // Dropdown groups
                    <SidebarDropdown
                      key={group.title}
                      isOpen={openDropdown === group.title.toLowerCase()}
                      onToggle={() => toggleDropdown(group.title.toLowerCase())}
                      title={t(group.translation_key || group.title.toLowerCase().replace(/ /g, '_'))}
                      icon={group.icon}
                      isRTL={isRTL}
                    >
                      {group.children.map((child, childIdx) => (
                        <NavLink
                          key={childIdx}
                          to={child.to}
                          onClick={handleLinkClick}
                          className={({ isActive }) => `
                            flex items-center px-3 py-1.5 transition text-sm rounded
                            ${isRTL ? 'pr-5' : 'pl-5'}
                            ${isActive 
                              ? 'text-[#0EA5E9] bg-[#EFF6FF] font-medium' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }
                          `}
                        >
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="truncate">
                            {t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_'))}
                          </span>
                        </NavLink>
                      ))}
                    </SidebarDropdown>
                  )}
                </React.Fragment>
              ))}
            </>
          ) : (
            // Collapsed view
            <div className="space-y-1">
              {filteredLinks.map((group, idx) => (
                <React.Fragment key={group.title || idx}>
                  {!group.title ? (
                    group.children.map((child, childIdx) => (
                      <NavLink
                        key={childIdx}
                        to={child.to}
                        onClick={handleLinkClick}
                        title={t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_'))}
                        className={({ isActive }) => `
                          flex justify-center p-3 transition group relative
                          ${isActive 
                            ? 'text-[#0EA5E9] bg-[#EFF6FF] after:absolute after:left-0 after:top-1 after:bottom-1 after:w-0.5 after:bg-[#0EA5E9] after:rounded-r-full' 
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                          }
                        `}
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <IconComponent icon={child.icon} className="w-5 h-5" />
                        </div>
                      </NavLink>
                    ))
                  ) : (
                    <button
                      onClick={() => toggleCollapsedGroup(group.title.toLowerCase())}
                      title={t(group.translation_key || group.title.toLowerCase().replace(/ /g, '_'))}
                      className={`w-full flex justify-center p-3 transition group
                        ${isCollapsedGroupOpen(group.title.toLowerCase())
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }
                      `}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <IconComponent icon={group.icon} className="w-4 h-4" />
                      </div>
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </nav>
      </aside>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @media (min-width: 1024px) {
          .ltr .sidebar-container.-translate-x-full {
            transform: translateX(-100%);
          }
          .rtl .sidebar-container.translate-x-full {
            transform: translateX(100%);
          }
          .ltr .sidebar-container.translate-x-0 {
            transform: translateX(0);
          }
          .rtl .sidebar-container.translate-x-0 {
            transform: translateX(0);
          }
        }
        
        @media (max-width: 1023px) {
          .ltr .sidebar-container {
            transition: transform 0.3s ease-in-out;
            transform: translateX(-100%);
          }
          .ltr .sidebar-container.translate-x-0 {
            transform: translateX(0);
          }
          .rtl .sidebar-container {
            transition: transform 0.3s ease-in-out;
            transform: translateX(100%);
          }
          .rtl .sidebar-container.translate-x-0 {
            transform: translateX(0);
          }
        }
        
        .sidebar-container {
          transform: none;
        }
      `}</style>
    </>
  );
};

export default Sidebar;