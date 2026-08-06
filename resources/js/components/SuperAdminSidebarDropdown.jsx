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
  report: () => (
    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  building: () => (
    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
};

const POPUP_WIDTH = 256;
const POPUP_MAX_HEIGHT = 420;
const VIEWPORT_GAP = 8;

const SuperAdminSidebarDropdown = ({ 
  isOpen, 
  onToggle, 
  title, 
  icon, 
  isRTL = false,
  children 
}) => {
  const [panelStyle, setPanelStyle] = useState({});
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
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
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const maxPopupHeight = Math.min(POPUP_MAX_HEIGHT, viewportHeight - (VIEWPORT_GAP * 2));
    const popupHeight = Math.min(
      panelRef.current?.scrollHeight || panelRef.current?.offsetHeight || 240,
      maxPopupHeight,
    );
    const top = Math.max(
      VIEWPORT_GAP,
      Math.min(rect.top, viewportHeight - popupHeight - VIEWPORT_GAP),
    );
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
      left: `${left}px`,
      maxHeight: `${maxPopupHeight}px`,
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
      const frame = requestAnimationFrame(updatePanelPosition);
      
      // Add event listeners
      window.addEventListener('resize', updatePanelPosition);
      window.addEventListener('scroll', updatePanelPosition, true);
      
      return () => {
        cancelAnimationFrame(frame);
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
          ${isOpen 
            ? 'text-[#0EA5E9] bg-[#EFF6FF] font-medium' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }
        `}
      >
        <div className="flex items-center">
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
          ref={panelRef}
          style={panelStyle}
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed z-[110] w-64 rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">
              {title}
            </p>
          </div>

          <div className="p-2 overflow-y-auto overscroll-contain custom-scrollbar">
            {children}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SuperAdminSidebarDropdown;
