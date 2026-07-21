import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SuperAdminSidebarDropdown from './SuperAdminSidebarDropdown';

// Icon components
const Icons = {
  home: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  building: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

const CompanyAdminSidebar = ({
  isCollapsed,
  isMobileOpen,
  isRTL,
  onToggleCollapsed,
  onToggleMobile,
  onCloseMobile
}) => {
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [linkSearch, setLinkSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [collapsedGroupsOpen, setCollapsedGroupsOpen] = useState({});
  const [showSearch, setShowSearch] = useState(true);
  const sidebarRef = useRef(null);

  const companyName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.company_name || 'Company';
    } catch { return 'Company'; }
  })();

  // Company Admin Links
  const links = [
    {
      title: null,
      children: [
        {
          name: 'Dashboard',
          to: '/company-admin/dashboard',
          icon: 'home',
          translation_key: 'company_admin_dashboard'
        }
      ]
    },
    {
      title: 'Management',
      icon: 'building',
      translation_key: 'management',
      children: [
        { name: 'Branches', to: '/company-admin/branches', icon: 'building', translation_key: 'branches' },
        { name: 'Roles', to: '/company-admin/roles', icon: 'shield', translation_key: 'roles' },
        { name: 'Users', to: '/company-admin/users', icon: 'users', translation_key: 'users' },
      ]
    }
  ];

  const t = (key) => {
    const translations = {
      'company_management': 'Company Management',
      'search_links': 'Search links...',
      'company_admin_dashboard': 'Dashboard',
      'management': 'Management',
      'branches': 'Branches',
      'users': 'Users',
      'roles': 'Roles',
    };
    return translations[key] || key;
  };

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
      return { ...group, children: authorizedChildren };
    })
    .filter(group => group.children && group.children.length > 0);

  const getSidebarClasses = () => {
    const classes = [];
    if (windowWidth >= 1024) {
      if (isRTL) {
        classes.push('border-l', 'border-white/10');
      } else {
        classes.push('border-r', 'border-white/10');
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
        classes.push('right-0', 'border-l', 'border-white/10');
      } else {
        classes.push('left-0', 'border-r', 'border-white/10');
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

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const toggleCollapsedGroup = (name) => {
    setCollapsedGroupsOpen(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isCollapsedGroupOpen = (name) => collapsedGroupsOpen[name];

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

  const IconComponent = ({ icon, className = "w-4 h-4" }) => {
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

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && windowWidth < 1024 && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar-container fixed inset-y-0 z-40
           bg-[#1e3a5f] text-white
           flex flex-col h-screen
           transform transition-all duration-300 ease-out
           shadow-xl ${getSidebarClasses()}`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-[#1e3a5f] ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {(!isCollapsed || windowWidth < 1024) && (
            <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className="w-9 h-9 bg-[#007c89] rounded-md flex items-center justify-center flex-shrink-0 shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className={`overflow-hidden ${isRTL ? 'text-right' : ''}`}>
                <h1 className="text-base font-semibold text-white truncate">
                  {companyName}
                </h1>
                <p className="text-xs text-white/70 truncate">
                  {t('company_management')}
                </p>
              </div>
            </div>
          )}

          {isCollapsed && windowWidth >= 1024 && (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 bg-[#007c89] rounded-md flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          )}

          {windowWidth < 1024 && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-white/70 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        {(!isCollapsed || windowWidth < 1024) && showSearch && (
          <div className="mt-3 flex-shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder={t('search_links')}
                className="w-full pl-9 pr-3 py-2 bg-white/10 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#007c89] focus:bg-white/15 text-sm border border-white/10"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={`flex-1 overflow-y-auto custom-scrollbar ${isRTL ? 'text-right' : ''}`}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2d5a8a #1e3a5f' }}
        >
          {(!isCollapsed || windowWidth < 1024) ? (
            <>
              {filteredLinks.map((group, idx) => (
                <React.Fragment key={group.title || idx}>
                  {!group.title ? (
                    group.children.map((child, childIdx) => (
                      <NavLink
                        key={childIdx}
                        to={child.to}
                        onClick={handleLinkClick}
                        className={({ isActive }) => `
                          flex items-center p-2.5 transition group
                          ${isRTL ? 'flex-row-reverse' : ''}
                          ${isActive
                            ? 'bg-white text-gray-900 font-medium shadow-md'
                            : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <div className="w-7 h-7 flex items-center justify-center">
                          <IconComponent icon={child.icon} className="w-4.5 h-4.5" />
                        </div>
                        <span className={`text-base truncate ${isRTL ? 'mr-4' : 'ml-3'}`}>
                          {t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_'))}
                        </span>
                      </NavLink>
                    ))
                  ) : (
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
                            flex items-center p-2 transition text-md
                            ${isRTL ? 'pr-5' : 'pl-5'}
                            ${isActive
                              ? 'bg-[#007c89] text-white font-medium'
                              : 'text-slate-700 hover:bg-slate-100'
                            }
                          `}
                        >
                          <span className="mx-2 text-[#007c89]">•</span>
                          <span className="truncate">
                            {t(child.translation_key || child.name.toLowerCase().replace(/ /g, '_'))}
                          </span>
                        </NavLink>
                      ))}
                    </SuperAdminSidebarDropdown>
                  )}
                </React.Fragment>
              ))}
            </>
          ) : (
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
                          flex justify-center p-3 transition group
                          ${isActive
                            ? 'bg-[#007c89] text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <IconComponent icon={child.icon} className="w-4 h-4" />
                        </div>
                      </NavLink>
                    ))
                  ) : (
                    <button
                      onClick={() => toggleCollapsedGroup(group.title.toLowerCase())}
                      title={t(group.translation_key || group.title.toLowerCase().replace(/ /g, '_'))}
                      className={`w-full flex justify-center p-3 transition group
                        ${isCollapsedGroupOpen(group.title.toLowerCase())
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
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

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e3a5f;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #2d5a8a;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3d7aba;
          }
        `}</style>
      </aside>
    </>
  );
};

export default CompanyAdminSidebar;
