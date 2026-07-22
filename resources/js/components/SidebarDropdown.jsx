import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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

const POPUP_WIDTH = 256;

const SidebarDropdown = ({ 
  isOpen, 
  onToggle, 
  title, 
  icon, 
  isRTL = false,
  children 
}) => {
  const [panelStyle, setPanelStyle] = useState({});
  const buttonRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  const IconComponent = () => {
    const Icon = Icons[icon];
    if (!Icon) {
      return (
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    }
    return <Icon />;
  };

  const updatePanelPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const top = rect.top;
    const viewportWidth = window.innerWidth;
    let left;

    if (isRTL) {
      left = rect.left - POPUP_WIDTH;
      if (left < 0) {
        left = 8;
      }
    } else {
      left = rect.right;
      if (left + POPUP_WIDTH > viewportWidth) {
        left = rect.left - POPUP_WIDTH;
        if (left < 0) left = viewportWidth - POPUP_WIDTH - 8;
      }
    }

    setPanelStyle({
      top: `${top}px`,
      left: `${left}px`
    });
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target) && isOpen) {
        onToggle();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onToggle]);

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      updatePanelPosition();
      
      // Add event listeners
      window.addEventListener('resize', updatePanelPosition);
      window.addEventListener('scroll', updatePanelPosition, true);
      
      return () => {
        window.removeEventListener('resize', updatePanelPosition);
        window.removeEventListener('scroll', updatePanelPosition, true);
      };
    } else {
      // Delay unmount for animation
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Update position on scroll/resize when open
  useEffect(() => {
    if (isOpen) {
      updatePanelPosition();
    }
  }, [isOpen, isRTL, title]);

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 transition text-base
          ${isRTL ? 'flex-row-reverse' : ''}
          ${isOpen 
            ? 'text-[#0EA5E9] bg-[#EFF6FF] font-medium' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }
        `}
      >
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Icon display */}
          <div className="w-6 h-6 flex items-center justify-center">
            <IconComponent />
          </div>

          <span className={`text-base truncate ${isRTL ? 'mr-3' : 'ml-3'} ${isOpen ? 'text-[#0EA5E9]' : 'text-slate-700'}`}>
            {title}
          </span>
        </div>

          <svg
            className={`w-4 h-4 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
              ${isOpen ? 'text-[#0EA5E9]' : 'text-slate-400'}
            `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Portal dropdown */}
      {isOpen && mounted && createPortal(
        <div
          style={panelStyle}
          className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">
              {title}
            </p>
          </div>

          <div className="p-2">
            {children}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SidebarDropdown;