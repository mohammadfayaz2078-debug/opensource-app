import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import CompanyAdminSidebar from '../components/CompanyAdminSidebar';
import api from '../plugins/axios';

const CompanyAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('companyAdminSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [headerCollapsed, setHeaderCollapsed] = useState(() => {
    const saved = localStorage.getItem('companyAdminHeaderCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [user, setUser] = useState({
    name: 'Company Admin',
    email: 'admin@company.com'
  });

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isRTL, setIsRTL] = useState(false);

  const userButtonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Computed values
  const userInitials = (user.name || user.company_name || 'CA')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const isLanguageRTL = (lang) => {
    const rtlLanguages = ['fa', 'ps', 'ar', 'he', 'ur'];
    return rtlLanguages.includes(lang);
  };

  // Methods
  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('companyAdminSidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  };

  const toggleHeaderCollapsed = () => {
    setHeaderCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('companyAdminHeaderCollapsed', JSON.stringify(newState));
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
      await api.post('/company-admin/language', { language: lang });

      setCurrentLanguage(lang);
      const rtl = isLanguageRTL(lang);
      setIsRTL(rtl);

      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;

      const userData = JSON.parse(localStorage.getItem('user'));
      userData.language = lang;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

    } catch (e) {
      console.error('Language change failed', e);
    }
  };

  const logout = async () => {
    try {
      await api.post('/company-admin/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('api_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('permissions');
      localStorage.removeItem('impersonating_branch');
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      localStorage.removeItem('ca_user_type');
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
      const saved = localStorage.getItem('companyAdminSidebarCollapsed');
      setSidebarCollapsed(saved ? JSON.parse(saved) : false);
    }

    if (newWidth >= 1024) {
      setMobileSidebarOpen(false);
    }
  }, []);

  // Click outside handler for dropdown
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

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setUserDropdownOpen(false);
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
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Styles
  const getHeaderContainerStyle = () => {
    const isDesktop = windowWidth >= 1024;
    const offsetRem = isDesktop ? (sidebarCollapsed ? 0 : 14) : 0;
    const headerHeight = headerCollapsed ? 48 : (windowWidth >= 640 ? 64 : 56);

    if (isRTL) {
      return {
        top: '0px', right: `${offsetRem}rem`, left: '0px',
        width: isDesktop ? `calc(100% - ${offsetRem}rem)` : '100%',
        height: `${headerHeight}px`, position: 'fixed', zIndex: 30,
        backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 300ms', overflow: 'hidden'
      };
    } else {
      return {
        top: '0px', left: `${offsetRem}rem`, right: '0px',
        width: isDesktop ? `calc(100% - ${offsetRem}rem)` : '100%',
        height: `${headerHeight}px`, position: 'fixed', zIndex: 30,
        backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 300ms', overflow: 'hidden'
      };
    }
  };

  const getUserDropdownStyle = () => {
    if (!userButtonRef.current) {
      return {
        top: '60px',
        right: isRTL ? 'auto' : '16px',
        left: isRTL ? '16px' : 'auto'
      };
    }
    const rect = userButtonRef.current.getBoundingClientRect();
    if (isRTL) {
      return { top: `${rect.bottom + 8}px`, left: `${rect.left}px`, right: 'auto', minWidth: '180px' };
    } else {
      return { top: `${rect.bottom + 8}px`, right: `${window.innerWidth - rect.right}px`, left: 'auto', minWidth: '180px' };
    }
  };

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

  const displayName = user.company_name || user.manager_name || user.name || 'Company Admin';
  const displayEmail = user.company_email || user.email || '';

  return (
    <div className={`min-h-screen bg-gray-50 flex ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <CompanyAdminSidebar
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
        <div style={getHeaderContainerStyle()}>
          {/* Full header content */}
          {!headerCollapsed && (
            <div className="flex h-14 sm:h-16 flex-shrink-0 transition-all duration-300">
              {/* Mobile hamburger button */}
              <div className={`flex items-center ${isRTL ? 'ml-auto' : ''}`}>
                <button
                  type="button"
                  onClick={toggleMobileSidebar}
                  className="text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#007c89] lg:hidden hover:bg-gray-50 px-3 sm:px-4"
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {windowWidth >= 1024 && (
                  <button
                    onClick={toggleSidebarCollapsed}
                    className="hidden lg:flex items-center px-3 sm:px-4 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    title={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
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
                  <button
                    onClick={toggleHeaderCollapsed}
                    className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Collapse header"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
                  {/* Company Admin Badge */}
                  <div className="hidden sm:block px-3 py-1 bg-[#007c89]/10 text-[#007c89] rounded-full text-xs font-semibold">
                    Company Admin
                  </div>

                  {/* Language selector */}
                  <div className="relative">
                    <select
                      value={currentLanguage}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="border border-gray-300 rounded-md text-xs sm:text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#007c89] bg-white text-gray-700"
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
                      className="user-dropdown-button flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007c89] p-1"
                    >
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-[#007c89]/10 flex items-center justify-center shrink-0">
                        <span className="text-[#007c89] font-semibold text-xs sm:text-sm">{userInitials}</span>
                      </div>
                      <div className={`ml-2 hidden sm:block text-left min-w-0 ${isRTL ? 'text-right mr-2' : ''}`}>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[100px] lg:max-w-[150px]">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[100px] lg:max-w-[150px] hidden md:block">{displayEmail}</p>
                      </div>
                      <svg className="ml-1 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    {userDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        className="fixed rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
                        style={getUserDropdownStyle()}
                      >
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate('/company-admin/profile');
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
                title="Expand header"
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
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
        >
          <div className="py-2">
            <div className={`mx-auto px-2 w-full max-w-full ${sidebarCollapsed && windowWidth >= 1024 ? '' : 'xl:max-w-7xl'}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <style>{`
        .rtl .lg\\:mr-64 { margin-right: 16rem; }
        .rtl .lg\\:mr-20 { margin-right: 5rem; }
        .ltr .lg\\:ml-64 { margin-left: 16rem; }
        .ltr .lg\\:ml-20 { margin-left: 5rem; }
        .rtl .text-left { text-align: right; }
        .rtl .text-right { text-align: left; }
        .rtl .ml-2 { margin-left: 0 !important; margin-right: 0.5rem !important; }
        .rtl .ml-4 { margin-left: 0 !important; margin-right: 1rem !important; }
        .rtl .flex-row-reverse { flex-direction: row-reverse; }

        main::-webkit-scrollbar { width: 6px; height: 6px; }
        main::-webkit-scrollbar-track { background: transparent; }
        main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        main::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        @media (max-width: 1024px) {
          button, a { min-height: 36px; min-width: 36px; }
        }
        @media screen and (max-width: 768px) {
          input, select, textarea { font-size: 16px; }
        }
      `}</style>
    </div>
  );
};

export default CompanyAdminLayout;
