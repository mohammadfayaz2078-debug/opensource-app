import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../plugins/axios';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// Icon component
const BellIcon = () => (
  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const AuthenticatedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    const saved = localStorage.getItem('headerCollapsed');
    return saved === 'true';
  });
  
 // State initialization - FIXED for all user types
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return { name: 'Guest', email: '' };

    let userData;
    try {
      userData = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('user');
      return { name: 'Guest', email: '' };
    }
    if (!userData || typeof userData !== 'object') {
      localStorage.removeItem('user');
      return { name: 'Guest', email: '' };
    }
    const userType = localStorage.getItem('user_type');
    
    // Company Admin (from companies table)
    if (userType === 'company_admin') {
      return {
        name: userData.manager_name || userData.company_name || 'Company Admin',
        email: userData.email || userData.company_email || '',
        raw: userData
      };
    }
    
    // Regular User (from users table)
    if (userType === 'user') {
      const fullName = userData.first_name || userData.last_name 
        ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
        : userData.name || 'User';
      
      return {
        name: fullName,
        email: userData.email || '',
        raw: userData
      };
    }

    return {
      name: userData.name || 'User',
      email: userData.email || '',
      raw: userData
    };
  });

  // Computed user initials - FIXED
  const getUserInitials = () => {
    if (!user?.name || user.name === 'Guest') return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  const userInitials = getUserInitials();
  
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isRTL, setIsRTL] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  
  const userButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  let notificationInterval = useRef(null);


  const isLanguageRTL = (lang) => {
    const rtlLanguages = ['fa', 'ps', 'ar', 'he', 'ur'];
    return rtlLanguages.includes(lang);
  };

  // Translation helper
  const t = (key, params = {}) => {
    const translations = {
      'open_sidebar': 'Open sidebar',
      'close_sidebar': 'Close sidebar',
      'collapse_header': 'Collapse header',
      'expand_header': 'Expand header',
      'notifications': 'Notifications',
      'mark_all_read': 'Mark all as read',
      'loading': 'Loading...',
      'no_notifications': 'No notifications',
      'view_all_notifications': 'View all notifications',
      'mark_as_read': 'Mark as read',
      'notification.contract_expiry.title': 'Contract {contract_number} Expiring',
      'notification.contract_expiry.title_expired': 'Contract {contract_number} Expired',
      'notification.contract_expiry.expiring': '{customer_name}\'s contract expires in {days} days',
      'notification.contract_expiry.expired': '{customer_name}\'s contract expired {days} days ago',
      'notification.payment_due.title': 'Payment Due: {amount} {currency}',
      'notification.payment_due.upcoming': '{customer_name} has payment due in {days} days: {amount} {currency}',
      'notification.payment_due.overdue': '{customer_name}\'s payment is overdue by {days} days: {amount} {currency}',
      'notification.system_alert.title': 'System Alert',
      'notification.system_alert.message': '{message}'
    };
    
    let text = translations[key] || key;
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, value);
    });
    return text;
  };

  // Header container style
  const headerContainerStyle = () => {
    const isDesktop = windowWidth >= 1024;
    const offsetRem = isDesktop ? (sidebarCollapsed ? 0 : 14) : 0;
    const headerHeight = headerCollapsed ? 48 : (windowWidth >= 640 ? 64 : 56);

    if (isRTL) {
      return {
        top: '0px',
        right: `${offsetRem}rem`,
        left: '0px',
        width: isDesktop ? `calc(100% - ${offsetRem}rem)` : '100%',
        height: `${headerHeight}px`,
        position: 'fixed',
        zIndex: 30,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 300ms',
        overflow: 'hidden'
      };
    } else {
      return {
        top: '0px',
        left: `${offsetRem}rem`,
        right: '0px',
        width: isDesktop ? `calc(100% - ${offsetRem}rem)` : '100%',
        height: `${headerHeight}px`,
        position: 'fixed',
        zIndex: 30,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 300ms',
        overflow: 'hidden'
      };
    }
  };

  // User dropdown style
  const userDropdownStyle = () => {
    if (!userButtonRef.current) {
      return {
        top: '60px',
        right: isRTL ? 'auto' : '16px',
        left: isRTL ? '16px' : 'auto'
      };
    }

    const rect = userButtonRef.current.getBoundingClientRect();
    
    if (isRTL) {
      return {
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        right: 'auto',
        minWidth: '180px'
      };
    } else {
      return {
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
        left: 'auto',
        minWidth: '180px'
      };
    }
  };

  // Notification dropdown style
  const notificationDropdownStyle = () => {
    return {
      top: windowWidth >= 640 ? '64px' : '56px',
      right: isRTL ? 'auto' : '16px',
      left: isRTL ? '16px' : 'auto'
    };
  };

  // Main content margin
  const getMainContentMargin = () => {
    if (windowWidth >= 1024) {
      if (sidebarCollapsed) {
        return isRTL ? 'lg:mr-0' : 'lg:ml-0';
      } else {
        return isRTL ? 'lg:mr-56' : 'lg:ml-56';
      }
    }
    return '';
  };


  const fetchUserData = async () => {
  try {
    const res = await api.get('/me');
    const data = res.data || {};
    
    if (data.user_type) {
      localStorage.setItem('user_type', data.user_type);
    }
    
    if (data.permissions) {
      localStorage.setItem('permissions', JSON.stringify(data.permissions));
    }
    
    // Normalize user data based on type
    let normalizedUser = { ...(data.user || data) };
    
    if (data.user_type === 'company_admin') {
      normalizedUser = {
        ...normalizedUser,
        name: normalizedUser.manager_name || normalizedUser.company_name || 'Company Admin',
        email: normalizedUser.email || normalizedUser.company_email || ''
      };
    } else if (data.user_type === 'user' && (normalizedUser.first_name || normalizedUser.last_name)) {
      normalizedUser = {
        ...normalizedUser,
        name: `${normalizedUser.first_name || ''} ${normalizedUser.last_name || ''}`.trim() || 'User',
      };
    }
    
    setUser(normalizedUser);
    
    if (data.language) {
      setCurrentLanguage(data.language);
      const rtl = isLanguageRTL(data.language);
      setIsRTL(rtl);
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = data.language;
    }
  } catch (error) {
    console.error('Failed to fetch user data:', error);
  }
};


  // Notification methods
  const fetchNotifications = async () => {
    setNotificationLoading(true);
    try {
      const res = await api.get('/notifications/unread');
      setNotifications(res.data.data || []);
      
      const countRes = await api.get('/notifications/unread-count');
      setUnreadCount(countRes.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotificationLoading(false);
    }
  };

  const toggleNotificationDropdown = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
    if (!notificationDropdownOpen) {
      fetchNotifications();
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }
    
    if (notification.type === 'contract_expiry' && notification.data?.contract_id) {
      navigate('/contracts');
    }
    
    setNotificationDropdownOpen(false);
  };

  const viewAllNotifications = () => {
    navigate('/notifications');
    setNotificationDropdownOpen(false);
  };

  const getPriorityClass = (notification) => {
    switch (notification.priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-emerald-600';
      default: return 'text-gray-900';
    }
  };

  const getLocalizedTitle = (notification) => {
    switch (notification.type) {
      case 'contract_expiry':
        if (notification.data?.days_remaining) {
          return t('notification.contract_expiry.title', {
            contract_number: notification.data.contract_number || ''
          });
        } else if (notification.data?.days_overdue) {
          return t('notification.contract_expiry.title_expired', {
            contract_number: notification.data.contract_number || ''
          });
        }
        return notification.title;
      
      case 'payment_due':
        return t('notification.payment_due.title', {
          amount: notification.data?.amount || '',
          currency: notification.data?.currency || ''
        });
      
      case 'system_alert':
        return t('notification.system_alert.title');
      
      default:
        return notification.title;
    }
  };

  const getLocalizedMessage = (notification) => {
    switch (notification.type) {
      case 'contract_expiry':
        if (notification.data?.days_remaining) {
          return t('notification.contract_expiry.expiring', {
            customer_name: notification.data.customer_name || '',
            days: notification.data.days_remaining
          });
        } else if (notification.data?.days_overdue) {
          return t('notification.contract_expiry.expired', {
            customer_name: notification.data.customer_name || '',
            days: notification.data.days_overdue
          });
        }
        return notification.message;
      
      case 'payment_due':
        if (notification.data?.days_remaining) {
          return t('notification.payment_due.upcoming', {
            customer_name: notification.data.customer_name || '',
            amount: notification.data.amount || '',
            currency: notification.data.currency || '',
            days: notification.data.days_remaining
          });
        } else if (notification.data?.days_overdue) {
          return t('notification.payment_due.overdue', {
            customer_name: notification.data.customer_name || '',
            amount: notification.data.amount || '',
            currency: notification.data.currency || '',
            days: notification.data.days_overdue
          });
        }
        return notification.message;
      
      case 'system_alert':
        return t('notification.system_alert.message', {
          message: notification.message
        });
      
      default:
        return notification.message;
    }
  };

  // Methods
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  };


  // Add this computed value for user type display
const getUserTypeDisplay = () => {
  const userType = localStorage.getItem('user_type');
  if (userType === 'company_admin') {
    return 'Company Admin';
  } else {
    return '';
  }
};

const userTypeDisplay = getUserTypeDisplay();

  const toggleHeaderCollapsed = () => {
    setHeaderCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('headerCollapsed', JSON.stringify(newState));
      return newState;
    });
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const changeLanguage = async (lang) => {
    try {
      await api.post('/user/language', {
        language: lang
      });

      setCurrentLanguage(lang);
      const rtl = isLanguageRTL(lang);
      setIsRTL(rtl);
      
      // Update document direction
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      setSidebarKey(prev => prev + 1);

      // Update localStorage
      const stored = localStorage.getItem('user');
      const userData = stored ? JSON.parse(stored) : null;
      if (userData) {
        userData.language = lang;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }

    } catch (e) {
      console.error('Language change failed', e);
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('api_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('permissions');
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      localStorage.removeItem('ca_user_type');
      localStorage.removeItem('impersonating_branch');
      navigate('/login');
    }
  };

  // Handle resize
  const handleResize = useCallback(() => {
    const newWidth = window.innerWidth;
    setWindowWidth(newWidth);

    if (newWidth >= 1024 && newWidth < 1280) {
      setSidebarCollapsed(true);
    } else if (newWidth >= 1280) {
      const saved = localStorage.getItem('sidebarCollapsed');
      setSidebarCollapsed(saved === 'true');
    }

    if (newWidth >= 1024) {
      setMobileSidebarOpen(false);
    }
  }, []);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          userButtonRef.current && !userButtonRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close mobile sidebar and dropdowns on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setUserDropdownOpen(false);
    fetchUserData();
    setNotificationDropdownOpen(false);
  }, [location.pathname]);

  // Initialize
  useEffect(() => {
    handleResize();
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      const lang = userData.language || 'en';
      setCurrentLanguage(lang);
      const rtl = isLanguageRTL(lang);
      setIsRTL(rtl);
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }

    window.addEventListener('resize', handleResize);
    
    fetchNotifications();
    notificationInterval.current = setInterval(fetchNotifications, 300000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
      }
    };
  }, []);

  // Watch for language changes
  useEffect(() => {
    const rtl = isLanguageRTL(currentLanguage);
    setIsRTL(rtl);
    setSidebarKey(prev => prev + 1);
  }, [currentLanguage]);

  // Handle impersonation
  const isImpersonatingBranch = localStorage.getItem('impersonating_branch') === 'true';

  const backToCompanyAdmin = async () => {
    const caToken = localStorage.getItem('ca_token');
    const caUser = localStorage.getItem('ca_user');
    const caUserType = localStorage.getItem('ca_user_type');

    if (!caToken) return;

    const impersonatedToken = localStorage.getItem('api_token');

    localStorage.setItem('api_token', caToken);
    localStorage.setItem('user', caUser);
    localStorage.setItem('user_type', caUserType);
    localStorage.removeItem('ca_token');
    localStorage.removeItem('ca_user');
    localStorage.removeItem('ca_user_type');
    localStorage.removeItem('impersonating_branch');
    localStorage.removeItem('permissions');

    // Navigate immediately, fire-and-forget the stop API
    window.location.href = '/company-admin/dashboard';

    try {
      await fetch('/api/impersonation/stop', {
        method: 'POST',
        headers: { Authorization: `Bearer ${impersonatedToken}`, Accept: 'application/json' }
      });
    } catch (e) {}
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>


      <div className="flex flex-1">
      {/* Sidebar */}
      <Sidebar
        key={sidebarKey}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        isRTL={isRTL}
        onToggleCollapsed={toggleSidebarCollapsed}
        onToggleMobile={toggleMobileSidebar}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${getMainContentMargin()}`}>
        {/* Fixed header */}
        <div style={headerContainerStyle()}>
          {/* Full header content */}
          {!headerCollapsed && (
            <div className="flex h-14 sm:h-16 flex-shrink-0 transition-all duration-300">
              {/* Mobile hamburger button */}
              <div className={`flex items-center ${isRTL ? 'ml-auto' : ''}`}>
                <button
                  type="button"
                  onClick={toggleMobileSidebar}
                  className="text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 lg:hidden hover:bg-gray-50 px-3 sm:px-4"
                >
                  <span className="sr-only">{isRTL ? 'باز کردن منو' : 'Open sidebar'}</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Desktop toggle button for sidebar */}
                {windowWidth >= 1024 && (
                  <button
                    onClick={toggleSidebarCollapsed}
                    className="hidden lg:flex items-center px-3 sm:px-4 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    title={sidebarCollapsed ? t('open_sidebar') : t('close_sidebar')}
                  >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                      )}
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-1 justify-between px-2 sm:px-4 min-w-0">
                <div className="flex flex-1 items-center min-w-0">
                  {/* Toggle header button */}
                  <button
                    onClick={toggleHeaderCollapsed}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title={t('collapse_header')}
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
              {userTypeDisplay && (
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    userTypeDisplay === 'Company Admin' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {userTypeDisplay === 'Company Admin' ? (
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    {userTypeDisplay}
                  </span>
                </div>
              )}
                  {/* Back to Admin (when impersonating) */}
                  {isImpersonatingBranch && (
                    <button onClick={backToCompanyAdmin} className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-[#007c89] border border-gray-200 rounded-md hover:border-[#007c89] hover:bg-blue-50 transition-colors mr-1" title="Back to Company Admin">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                      </svg>
                      Back to Admin
                    </button>
                  )}

                  {/* Download App */}
                  <button
                    onClick={install}
                    disabled={isInstalled}
                    className={`relative p-2 rounded-lg transition-colors
                      ${isInstalled
                        ? 'text-green-500 cursor-default'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    title={isInstalled ? 'App Installed' : 'Download App'}
                  >
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>

                  {/* Notification bell */}
                  <div className="relative" style={{ zIndex: 100 }}>
                    <button
                      onClick={toggleNotificationDropdown}
                      className={`relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none rounded-lg hover:bg-gray-50 transition-colors ${notificationDropdownOpen ? 'bg-gray-50' : ''}`}
                      type="button"
                    >
                      <BellIcon />
                      {unreadCount > 0 && (
                        <span 
                          className={`absolute top-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[18px] ${isRTL ? 'left-1 right-auto' : 'right-1'}`}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification dropdown */}
                    {notificationDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        className="fixed w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
                        style={notificationDropdownStyle()}
                      >
                        <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
                          <h3 className="font-semibold text-gray-700 text-sm">{t('notifications')}</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                              type="button"
                            >
                              {t('mark_all_read')}
                            </button>
                          )}
                        </div>

                        <div className="max-h-96 overflow-y-auto" style={{ maxHeight: '30rem' }}>
                          {notificationLoading ? (
                            <div className="p-8 text-center text-gray-500">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-emerald-500"></div>
                              <p className="mt-2 text-xs">{t('loading')}</p>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                              <BellIcon />
                              <p className="text-sm mt-2">{t('no_notifications')}</p>
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-emerald-50' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${getPriorityClass(notification)}`}>
                                      {getLocalizedTitle(notification)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {getLocalizedMessage(notification)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{notification.created_at?.split('T')[0]}</p>
                                  </div>
                                  {!notification.is_read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotificationAsRead(notification.id);
                                      }}
                                      className="text-xs text-gray-400 hover:text-gray-600 shrink-0 p-1 rounded hover:bg-gray-200"
                                      title={t('mark_as_read')}
                                      type="button"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="p-2 border-t border-gray-200 text-center">
                          <button
                            onClick={viewAllNotifications}
                            className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors w-full py-2 hover:bg-gray-50 rounded"
                            type="button"
                          >
                            {t('view_all_notifications')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Language selector */}
                  <div className="relative">
                    <select
                      value={currentLanguage}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="border border-gray-300 rounded-md text-xs sm:text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-700"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    >
                      <option value="en">English</option>
                      <option value="fa">دری</option>
                      <option value="ps">پښتو</option>
                    </select>
                  </div>

                  {/* User dropdown */}
                  <div className="relative">
                    <button
                      ref={userButtonRef}
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="user-dropdown-button flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 p-1"
                    >
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-emerald-600 font-semibold text-xs sm:text-sm">{userInitials}</span>
                      </div>
                      <svg className="ml-1 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* User dropdown menu */}
                    {userDropdownOpen && (
                      <div
                        className="fixed rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
                        style={userDropdownStyle()}
                      >
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate('/profile');
                          }}
                          className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {isRTL ? 'پروفایل شما' : 'Your Profile'}
                        </button>
                        <div className="border-t border-gray-100"></div>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="block w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-gray-50"
                        >
                          {isRTL ? 'خروج' : 'Sign out'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsed header */}
          {headerCollapsed && (
            <div className="flex items-center justify-center h-12 transition-all duration-300">
              <button
                onClick={toggleHeaderCollapsed}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title={t('expand_header')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Page content */}
        <main
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 transition-all duration-300 ${headerCollapsed ? 'pt-12' : 'pt-14 sm:pt-16'}`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 transparent',
            // overscrollBehavior: 'contain'
          }}
        >
          <div className="py-2 sm:py-3">
            <div className={`mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 w-full max-w-full ${sidebarCollapsed && windowWidth >= 1024 ? '' : 'xl:max-w-7xl'}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .rtl .lg\\:mr-64 {
          margin-right: 16rem;
        }
        .rtl .lg\\:mr-20 {
          margin-right: 5rem;
        }
        .ltr .lg\\:ml-64 {
          margin-left: 16rem;
        }
        .ltr .lg\\:ml-20 {
          margin-left: 5rem;
        }
        .rtl .text-left {
          text-align: right;
        }
        .rtl .text-right {
          text-align: left;
        }
        .rtl .ml-2 {
          margin-left: 0 !important;
          margin-right: 0.5rem !important;
        }
        .rtl .ml-4 {
          margin-left: 0 !important;
          margin-right: 1rem !important;
        }
        .rtl .flex-row-reverse {
          flex-direction: row-reverse;
        }
        
        main::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        main::-webkit-scrollbar-track {
          background: transparent;
        }
        main::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        main::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        @media (max-width: 1024px) {
          button, a {
            min-height: 36px;
            min-width: 36px;
          }
        }
        
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px;
          }
        }
        
        @supports (padding: max(0px)) {
          .px-3 {
            padding-left: max(0.75rem, env(safe-area-inset-left));
            padding-right: max(0.75rem, env(safe-area-inset-right));
          }
        }
      `}</style>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;