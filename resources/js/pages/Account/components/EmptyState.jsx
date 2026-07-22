// pages/Account/components/EmptyState.jsx
import React from 'react';

const EmptyState = ({ title = 'No items found', message = 'Start by creating your first item', actionLabel = 'Create', onAction }) => {
  return (
    <div className="text-center py-8">
      <div className="inline-block p-3 bg-gray-50 rounded-full mb-3">
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">{message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;