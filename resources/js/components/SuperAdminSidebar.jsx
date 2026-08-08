import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SuperAdminSidebarDropdown from './SuperAdminSidebarDropdown';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

// Icon components (simplified for React)
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
  building: () => (
    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  report: () => (
    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  users: () => (
    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
};

const SuperAdminSidebar = ({ 
  isCollapsed, 
  isMobileOpen, 
  isRTL, 
  onToggleCollapsed, 
  onToggleMobile, 
  onCloseMobile 
}) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [linkSearch, setLinkSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsedGroupsOpen, setCollapsedGroupsOpen] = useState({});
  const [showSearch, setShowSearch] = useState(true);
  const sidebarRef = useRef(null);
  const { isInstallable, isInstalled, install } = useInstallPrompt();

  // Super Admin Links - only Dashboard and Companies (WHM-style)
  const links = [
    {
      title: null,
      children: [
        {
          name: 'Dashboard',
          to: '/super-admin/dashboard',
          icon: 'home',
          translation_key: 'super_admin.sidebar_dashboard'
        }
      ]
    },
    {
      title: 'Management',
      icon: 'building',
      translation_key: 'super_admin.sidebar_management',
      children: [
        { name: 'Companies', to: '/super-admin/companies', icon: 'building', translation_key: 'super_admin.sidebar_companies' },
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

  const getSidebarStyle = () => ({
    left: isRTL ? 'auto' : 0,
    right: isRTL ? 0 : 'auto',
    transform: windowWidth >= 1024
      ? (isCollapsed ? `translateX(${isRTL ? 'calc(100% + 8px)' : 'calc(-100% - 8px)'})` : 'translateX(0)')
      : (isMobileOpen ? 'translateX(0)' : `translateX(${isRTL ? '100%' : '-100%'})`),
  });

  const handleLinkClick = () => {
    setOpenDropdown(null);
    if (windowWidth < 1024) {
      onCloseMobile();
    }
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

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
    if (windowWidth >= 1024 && isCollapsed) {
      setShowSearch(false);
    } else {
      setShowSearch(true);
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [isRTL]);

  const IconComponent = ({ icon, className = "w-4 h-4", isActive = false }) => {
    const Icon = Icons[icon];
    if (!Icon) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    }
    return <Icon />;
  };

  const isActiveLink = (to) => location.pathname === to;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && windowWidth < 1024 && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[90] transition-opacity"
        />
      )}

      <aside
        ref={sidebarRef}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={getSidebarStyle()}
        className={`sidebar-container fixed inset-y-0 z-[100]
           bg-[#F0F9FF] text-slate-700 border-r border-slate-200
           flex flex-col h-screen
           transform transition-all duration-300 ease-out
           shadow-sm ${getSidebarClasses()}`}
      >
        {/* Header */}
        <div
          className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0"
        >
          {(!isCollapsed || windowWidth < 1024) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] rounded-md flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
                S
              </div>
              <div className={`overflow-hidden ${isRTL ? 'text-right' : ''}`}>
                <div className="text-sm font-medium text-slate-800 truncate leading-tight">
                  {t('super_admin.brand')}
                </div>
                <div className="text-xs text-slate-500 truncate leading-tight">
                  {t('super_admin.global_management')}
                </div>
              </div>
            </div>
          )}

          {isCollapsed && windowWidth >= 1024 && (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] rounded-md flex items-center justify-center text-white font-bold text-sm shadow-sm">
                S
              </div>
            </div>
          )}

          {windowWidth < 1024 && (
            <button
              onClick={onCloseMobile}
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
          className={`flex-1 overflow-y-auto custom-scrollbar ${isRTL ? 'text-right' : ''}`}
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
                          ${isActive 
                            ? `text-[#0EA5E9] bg-[#EFF6FF] font-medium after:absolute after:top-1 after:bottom-1 after:w-0.5 after:bg-[#0EA5E9] ${isRTL ? 'after:right-0 after:rounded-l-full' : 'after:left-0 after:rounded-r-full'}`
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
                    <SuperAdminSidebarDropdown
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
                    </SuperAdminSidebarDropdown>
                  )}
                </React.Fragment>
              ))}

              {/* Download App */}
              <div className="border-t border-slate-200 mt-3 pt-2 px-2">
                <button
                  onClick={install}
                  disabled={isInstalled}
                  className={`flex items-center w-full px-3 py-2 rounded-lg transition text-sm
                    ${isInstalled
                      ? 'text-green-600 bg-green-50 cursor-default'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className={`truncate ${isRTL ? 'mr-3' : 'ml-3'}`}>
                    {isInstalled ? t('super_admin.app_installed') : t('super_admin.download_app')}
                  </span>
                </button>
              </div>
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

              {/* Download App - collapsed */}
              <div className="border-t border-slate-200 pt-2 mt-2">
                <button
                  onClick={install}
                  disabled={isInstalled}
                  title={isInstalled ? t('super_admin.app_installed') : t('super_admin.download_app')}
                  className={`w-full flex justify-center p-3 transition group
                    ${isInstalled
                      ? 'text-green-500'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }
                  `}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* CSS for custom scrollbar */}
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
        `}</style>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
