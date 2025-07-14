// src/services/errorService.js - Centralized error handling
import { ERROR_TYPES, HTTP_STATUS } from './constants.js';

class ErrorService {
  constructor() {
    this.errorListeners = [];
    this.errorHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Parse and normalize errors from different sources
   */
  parseError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();

    let parsedError = {
      id: errorId,
      timestamp,
      context,
      originalError: error,
    };

    // Handle Axios/HTTP errors
    if (error.response) {
      parsedError = {
        ...parsedError,
        type: this.getErrorTypeFromStatus(error.response.status),
        status: error.response.status,
        statusText: error.response.statusText,
        message: this.extractErrorMessage(error.response.data),
        details: error.response.data,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };
    }
    // Handle Network errors
    else if (error.request) {
      parsedError = {
        ...parsedError,
        type: ERROR_TYPES.NETWORK_ERROR,
        message: 'Network error - please check your internet connection',
        details: { request: error.request },
        isNetworkError: true,
      };
    }
    // Handle WebSocket errors
    else if (error.type === 'websocket') {
      parsedError = {
        ...parsedError,
        type: ERROR_TYPES.WEBSOCKET_ERROR,
        message: error.message || 'WebSocket connection error',
        details: error.details || {},
        isWebSocketError: true,
      };
    }
    // Handle custom application errors
    else if (error.type) {
      parsedError = {
        ...parsedError,
        type: error.type,
        message: error.message || 'An error occurred',
        details: error.details || {},
      };
    }
    // Handle generic JavaScript errors
    else {
      parsedError = {
        ...parsedError,
        type: ERROR_TYPES.UNKNOWN_ERROR,
        message: error.message || 'An unexpected error occurred',
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }

    // Add error to history
    this.addToHistory(parsedError);

    return parsedError;
  }

  /**
   * Extract user-friendly error message from response data
   */
  extractErrorMessage(data) {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data?.error) {
      return data.error;
    }
    
    if (data?.detail) {
      return data.detail;
    }
    
    if (data?.message) {
      return data.message;
    }
    
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map(err => err.message || err).join(', ');
    }
    
    return 'An error occurred';
  }

  /**
   * Map HTTP status codes to error types
   */
  getErrorTypeFromStatus(status) {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_TYPES.AUTHENTICATION_ERROR;
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_TYPES.AUTHORIZATION_ERROR;
      case HTTP_STATUS.BAD_REQUEST:
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        return ERROR_TYPES.VALIDATION_ERROR;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return ERROR_TYPES.RATE_LIMIT_ERROR;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        return ERROR_TYPES.SERVER_ERROR;
      default:
        return ERROR_TYPES.UNKNOWN_ERROR;
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add error to history
   */
  addToHistory(error) {
    this.errorHistory.unshift(error);
    
    // Maintain max history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Handle error with notifications and logging
   */
  handleError(error, options = {}) {
    const {
      context = {},
      showNotification = true,
      logToConsole = true,
      silent = false,
    } = options;

    const parsedError = this.parseError(error, context);

    // Log to console if enabled
    if (logToConsole) {
      console.group(`🚨 Error [${parsedError.type}]`);
      console.error('Message:', parsedError.message);
      console.error('Details:', parsedError.details);
      console.error('Context:', parsedError.context);
      console.error('Original Error:', parsedError.originalError);
      console.groupEnd();
    }

    // Notify error listeners
    if (!silent) {
      this.notifyListeners(parsedError, { showNotification });
    }

    return parsedError;
  }

  /**
   * Register error listener
   */
  onError(callback) {
    this.errorListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorListeners = this.errorListeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all error listeners
   */
  notifyListeners(error, options = {}) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error, options);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Get user-friendly error messages
   */
  getUserFriendlyMessage(error) {
    const errorTypeMessages = {
      [ERROR_TYPES.NETWORK_ERROR]: 'Please check your internet connection and try again.',
      [ERROR_TYPES.AUTHENTICATION_ERROR]: 'Please log in again to continue.',
      [ERROR_TYPES.AUTHORIZATION_ERROR]: 'You don\'t have permission to perform this action.',
      [ERROR_TYPES.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ERROR_TYPES.RATE_LIMIT_ERROR]: 'Too many requests. Please wait a moment and try again.',
      [ERROR_TYPES.SERVER_ERROR]: 'Server is experiencing issues. Please try again later.',
      [ERROR_TYPES.WEBSOCKET_ERROR]: 'Connection issue. Attempting to reconnect...',
      [ERROR_TYPES.AI_SERVICE_ERROR]: 'AI service is temporarily unavailable. Please try again.',
      [ERROR_TYPES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return errorTypeMessages[error.type] || error.message || 'An error occurred';
  }

  /**
   * Check if error should trigger automatic retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      ERROR_TYPES.NETWORK_ERROR,
      ERROR_TYPES.SERVER_ERROR,
      ERROR_TYPES.WEBSOCKET_ERROR,
    ];

    return retryableErrors.includes(error.type);
  }

  /**
   * Check if error should trigger logout
   */
  shouldLogout(error) {
    return error.type === ERROR_TYPES.AUTHENTICATION_ERROR;
  }

  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error, attempt = 1) {
    const baseDelays = {
      [ERROR_TYPES.NETWORK_ERROR]: 1000,
      [ERROR_TYPES.SERVER_ERROR]: 2000,
      [ERROR_TYPES.WEBSOCKET_ERROR]: 1000,
      [ERROR_TYPES.RATE_LIMIT_ERROR]: 5000,
    };

    const baseDelay = baseDelays[error.type] || 1000;
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Create error for specific scenarios
   */
  createError(type, message, details = {}) {
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create network error
   */
  createNetworkError(details = {}) {
    return this.createError(
      ERROR_TYPES.NETWORK_ERROR,
      'Network connection failed',
      details
    );
  }

  /**
   * Create WebSocket error
   */
  createWebSocketError(message, details = {}) {
    return {
      type: 'websocket',
      message,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create validation error
   */
  createValidationError(message, field = null) {
    return this.createError(
      ERROR_TYPES.VALIDATION_ERROR,
      message,
      { field }
    );
  }

  /**
   * Create rate limit error
   */
  createRateLimitError(retryAfter = null) {
    return this.createError(
      ERROR_TYPES.RATE_LIMIT_ERROR,
      'Rate limit exceeded. Please wait before trying again.',
      { retryAfter }
    );
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }

  /**
   * Get error history
   */
  getHistory() {
    return [...this.errorHistory];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type) {
    return this.errorHistory.filter(error => error.type === type);
  }

  /**
   * Get recent errors (last N minutes)
   */
  getRecentErrors(minutes = 5) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errorHistory.filter(error => 
      new Date(error.timestamp) > cutoff
    );
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const total = this.errorHistory.length;
    const byType = {};
    const recent = this.getRecentErrors(60); // Last hour
    
    this.errorHistory.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
    });

    return {
      total,
      byType,
      recent: recent.length,
      mostCommon: Object.entries(byType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
    };
  }

  /**
   * Export error data for debugging
   */
  exportErrorData() {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errors: this.errorHistory,
      statistics: this.getStatistics(),
    };
  }

  /**
   * Import error data (for testing or debugging)
   */
  importErrorData(data) {
    if (data.errors && Array.isArray(data.errors)) {
      this.errorHistory = data.errors.slice(0, this.maxHistorySize);
    }
  }
}

// Create singleton instance
const errorService = new ErrorService();

// Enhanced error classes for specific use cases
export class LawBuddyError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.name = 'LawBuddyError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends LawBuddyError {
  constructor(message, field = null) {
    super(ERROR_TYPES.VALIDATION_ERROR, message, { field });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends LawBuddyError {
  constructor(message = 'Authentication failed') {
    super(ERROR_TYPES.AUTHENTICATION_ERROR, message);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends LawBuddyError {
  constructor(message = 'Network connection failed', details = {}) {
    super(ERROR_TYPES.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

export class WebSocketError extends LawBuddyError {
  constructor(message = 'WebSocket connection failed', details = {}) {
    super(ERROR_TYPES.WEBSOCKET_ERROR, message, details);
    this.name = 'WebSocketError';
  }
}

export class RateLimitError extends LawBuddyError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(ERROR_TYPES.RATE_LIMIT_ERROR, message, { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Export singleton instance and classes
export { errorService as default };
export { ERROR_TYPES } from './constants.js';