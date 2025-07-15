// src/components/common/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '',
  message = null 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    purple: 'border-purple-600'
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div 
        className={`
          animate-spin rounded-full border-2 border-gray-300 
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          border-t-transparent
        `}
      ></div>
      {message && (
        <span className="ml-2 text-sm text-gray-600">{message}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;