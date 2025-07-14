// src/services/api.js - Complete API service with Axios configuration
import axios from 'axios';
import { API_CONFIG, STORAGE_KEYS, HTTP_STATUS, TIMEOUTS } from './constants.js';
import errorService, { AuthenticationError, NetworkError } from './errorService.js';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = API_CONFIG.RETRY_DELAY;
    
    // Create Axios instance
    this.client = this.createAxiosInstance();
    
    // Track active requests for cancellation
    this.activeRequests = new Map();
    
    // Request/response cache
    this._cache = {};
    
    // Setup interceptors
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
    
    // Track refresh token promise to prevent multiple simultaneous refresh attempts
    this.refreshTokenPromise = null;
  }

  /**
   * Create configured Axios instance
   */
  createAxiosInstance() {
    const client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request timing metadata
    client.interceptors.request.use(config => {
      config.metadata = { startTime: Date.now() };
      return config;
    });

    return client;
  }

  /**
   * Setup request interceptor for authentication and request tracking
   */
  setupRequestInterceptor() {
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request tracking
        const requestId = this.generateRequestId();
        config.requestId = requestId;
        
        // Store active request for potential cancellation
        const cancelTokenSource = axios.CancelToken.source();
        config.cancelToken = cancelTokenSource.token;
        this.activeRequests.set(requestId, cancelTokenSource);

        // Add request timing
        config.metadata = {
          ...config.metadata,
          requestId,
          startTime: Date.now(),
        };

        // Log request in development
        if (import.meta.env.DEV) {
          console.log(`🔄 API Request [${config.method?.toUpperCase()}]:`, config.url);
        }

        return config;
      },
      (error) => {
        return Promise.reject(errorService.handleError(error, {
          context: { phase: 'request_setup' }
        }));
      }
    );
  }

  /**
   * Setup response interceptor for error handling and token refresh
   */
  setupResponseInterceptor() {
    this.client.interceptors.response.use(
      (response) => {
        // Clean up request tracking
        if (response.config.requestId) {
          this.activeRequests.delete(response.config.requestId);
        }

        // Log response timing in development
        if (import.meta.env.DEV && response.config.metadata) {
          const duration = Date.now() - response.config.metadata.startTime;
          console.log(`✅ API Response [${response.status}]:`, response.config.url, `(${duration}ms)`);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Clean up request tracking
        if (originalRequest?.requestId) {
          this.activeRequests.delete(originalRequest.requestId);
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            
            // Retry original request with new token
            const token = this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.handleAuthenticationFailure();
            return Promise.reject(refreshError);
          }
        }

        // Log error in development
        if (import.meta.env.DEV) {
          const duration = originalRequest?.metadata?.startTime 
            ? Date.now() - originalRequest.metadata.startTime 
            : 0;
          console.error(`❌ API Error [${error.response?.status || 'Network'}]:`, 
            originalRequest?.url, `(${duration}ms)`);
        }

        // Handle and return formatted error
        return Promise.reject(errorService.handleError(error, {
          context: { 
            url: originalRequest?.url,
            method: originalRequest?.method,
            requestId: originalRequest?.requestId,
          }
        }));
      }
    );
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get access token from storage
   */
  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * Clear authentication tokens
   */
  clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    this.refreshTokenPromise = this._performTokenRefresh(refreshToken);

    try {
      const result = await this.refreshTokenPromise;
      this.refreshTokenPromise = null;
      return result;
    } catch (error) {
      this.refreshTokenPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual token refresh
   */
  async _performTokenRefresh(refreshToken) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: TIMEOUTS.API_REQUEST }
      );

      const { access_token, refresh_token } = response.data;
      this.setTokens(access_token, refresh_token);
      
      return access_token;
    } catch (error) {
      this.clearTokens();
      throw new AuthenticationError('Token refresh failed');
    }
  }

  /**
   * Handle authentication failure
   */
  handleAuthenticationFailure() {
    this.clearTokens();
    
    // Emit authentication failure event
    window.dispatchEvent(new CustomEvent('auth:failure', {
      detail: { reason: 'token_refresh_failed' }
    }));
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    this.activeRequests.forEach((cancelSource) => {
      cancelSource.cancel('Request cancelled by user');
    });
    this.activeRequests.clear();
  }

  /**
   * Cancel specific request
   */
  cancelRequest(requestId) {
    const cancelSource = this.activeRequests.get(requestId);
    if (cancelSource) {
      cancelSource.cancel('Request cancelled');
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Generic GET request with retry logic
   */
  async get(url, config = {}) {
    return this.requestWithRetry('get', url, undefined, config);
  }

  /**
   * Generic POST request with retry logic
   */
  async post(url, data = {}, config = {}) {
    return this.requestWithRetry('post', url, data, config);
  }

  /**
   * Generic PUT request with retry logic
   */
  async put(url, data = {}, config = {}) {
    return this.requestWithRetry('put', url, data, config);
  }

  /**
   * Generic PATCH request with retry logic
   */
  async patch(url, data = {}, config = {}) {
    return this.requestWithRetry('patch', url, data, config);
  }

  /**
   * Generic DELETE request with retry logic
   */
  async delete(url, config = {}) {
    return this.requestWithRetry('delete', url, undefined, config);
  }

  /**
   * Request with automatic retry logic
   */
  async requestWithRetry(method, url, data, config = {}) {
    const maxAttempts = config.retry !== false ? this.retryAttempts : 1;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let response;
        
        switch (method.toLowerCase()) {
          case 'get':
            response = await this.client.get(url, config);
            break;
          case 'post':
            response = await this.client.post(url, data, config);
            break;
          case 'put':
            response = await this.client.put(url, data, config);
            break;
          case 'patch':
            response = await this.client.patch(url, data, config);
            break;
          case 'delete':
            response = await this.client.delete(url, config);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry if it's not a retryable error or if it's the last attempt
        if (!this.shouldRetry(error) || attempt === maxAttempts) {
          break;
        }

        // Wait before retrying
        const delay = this.getRetryDelay(attempt);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error) {
    // Don't retry client errors (4xx) except for rate limiting
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response.status === HTTP_STATUS.TOO_MANY_REQUESTS;
    }

    // Retry network errors and server errors (5xx)
    return !error.response || error.response.status >= 500;
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay(attempt) {
    const baseDelay = this.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    
    return Math.min(exponentialDelay + jitter, 10000); // Max 10 seconds
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional fields if provided
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          options.onProgress(progress);
        }
      },
      ...options.config,
    };

    return this.post(url, formData, config);
  }

  /**
   * Download file with progress tracking
   */
  async downloadFile(url, options = {}) {
    const config = {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          options.onProgress(progress);
        }
      },
      ...options.config,
    };

    const response = await this.client.get(url, config);
    return response.data;
  }

  /**
   * Get request with caching support
   */
  async getWithCache(url, config = {}) {
    const cacheKey = `api_cache_${url}`;
    const cacheTTL = config.cacheTTL || 300000; // 5 minutes default
    
    // Check cache first
    if (config.useCache !== false) {
      const cached = this.getFromCache(cacheKey, cacheTTL);
      if (cached) {
        return cached;
      }
    }

    // Fetch fresh data
    const data = await this.get(url, config);
    
    // Cache the result
    if (config.useCache !== false) {
      this.setCache(cacheKey, data);
    }
    
    return data;
  }

  /**
   * Simple in-memory cache implementation
   */
  getFromCache(key, ttl) {
    const cached = this._cache?.[key];
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > ttl;
    if (isExpired) {
      this.clearCache(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache entry
   */
  setCache(key, data) {
    if (!this._cache) {
      this._cache = {};
    }
    
    this._cache[key] = {
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear specific cache entry
   */
  clearCache(key) {
    if (this._cache && this._cache[key]) {
      delete this._cache[key];
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this._cache = {};
  }

  /**
   * Batch requests with concurrency control
   */
  async batchRequest(requests, options = {}) {
    const { concurrency = 5, failFast = false } = options;
    const results = [];
    const errors = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await this.requestWithRetry(
            request.method || 'get',
            request.url,
            request.data,
            request.config || {}
          );
          
          return {
            index: i + index,
            success: true,
            data: result,
          };
        } catch (error) {
          const errorResult = {
            index: i + index,
            success: false,
            error: error.message,
            request,
          };
          
          if (failFast) {
            throw errorResult;
          }
          
          return errorResult;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const resultData = result.value;
          if (resultData.success) {
            results.push(resultData);
          } else {
            errors.push(resultData);
          }
        } else {
          errors.push({
            index: -1,
            success: false,
            error: result.reason,
          });
        }
      });
    }
    
    return {
      success: errors.length === 0,
      results: results.sort((a, b) => a.index - b.index),
      errors: errors.sort((a, b) => a.index - b.index),
      total: requests.length,
      successful: results.length,
      failed: errors.length,
    };
  }

  /**
   * Stream data with Server-Sent Events (SSE)
   */
  async streamData(url, options = {}) {
    const { onData, onError, onComplete, signal } = options;
    
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onData?.(data);
        } catch (error) {
          onError?.(error);
        }
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        onError?.(error);
        reject(error);
      };
      
      eventSource.onopen = () => {
        console.log('SSE connection opened');
      };
      
      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          eventSource.close();
          resolve();
        });
      }
      
      // Handle completion
      eventSource.addEventListener('complete', () => {
        eventSource.close();
        onComplete?.();
        resolve();
      });
    });
  }

  /**
   * Get API health status
   */
  async getHealth() {
    try {
      const response = await this.get('/health', { 
        timeout: 5000,
        retry: false 
      });
      return {
        healthy: true,
        ...response
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get API version information
   */
  async getVersion() {
    try {
      const response = await this.get('/version', {
        timeout: 5000,
        retry: false
      });
      return response;
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getVersion' }
      });
    }
  }

  /**
   * Get API statistics
   */
  getStatistics() {
    return {
      baseURL: this.baseURL,
      activeRequests: this.activeRequests.size,
      cacheSize: this._cache ? Object.keys(this._cache).length : 0,
      hasValidToken: !!this.getAccessToken(),
      isRefreshing: !!this.refreshTokenPromise,
    };
  }

  /**
   * Update base URL (useful for environment switching)
   */
  updateBaseURL(newBaseURL) {
    this.baseURL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
  }

  /**
   * Set default headers
   */
  setDefaultHeaders(headers) {
    Object.assign(this.client.defaults.headers, headers);
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(headerName) {
    delete this.client.defaults.headers[headerName];
  }

  /**
   * Set request timeout
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }

  /**
   * Enable/disable request logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Get request performance metrics
   */
  getPerformanceMetrics() {
    const cacheHitRate = this._cache ? Object.keys(this._cache).length / 100 : 0;
    
    return {
      activeRequests: this.activeRequests.size,
      cacheSize: this._cache ? Object.keys(this._cache).length : 0,
      cacheHitRate: Math.min(cacheHitRate, 1),
      averageResponseTime: this.calculateAverageResponseTime(),
    };
  }

  /**
   * Calculate average response time (mock implementation)
   */
  calculateAverageResponseTime() {
    // In a real implementation, you would track response times
    return 250; // Mock 250ms average
  }

  /**
   * Create request interceptor
   */
  addRequestInterceptor(onFulfilled, onRejected) {
    return this.client.interceptors.request.use(onFulfilled, onRejected);
  }

  /**
   * Create response interceptor
   */
  addResponseInterceptor(onFulfilled, onRejected) {
    return this.client.interceptors.response.use(onFulfilled, onRejected);
  }

  /**
   * Remove interceptor
   */
  removeInterceptor(type, interceptorId) {
    if (type === 'request') {
      this.client.interceptors.request.eject(interceptorId);
    } else if (type === 'response') {
      this.client.interceptors.response.eject(interceptorId);
    }
  }

  /**
   * Create a new instance with different configuration
   */
  createInstance(config = {}) {
    const instance = axios.create({
      baseURL: config.baseURL || this.baseURL,
      timeout: config.timeout || this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers,
      },
    });

    return instance;
  }

  /**
   * Validate network connectivity
   */
  async checkConnectivity() {
    try {
      await this.get('/health', { 
        timeout: 3000, 
        retry: false 
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get request headers for debugging
   */
  getRequestHeaders() {
    const token = this.getAccessToken();
    return {
      ...this.client.defaults.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Reset service to initial state
   */
  reset() {
    this.cancelAllRequests();
    this.clearAllCache();
    this.clearTokens();
    this.refreshTokenPromise = null;
  }

  /**
   * Health check for the service
   */
  healthCheck() {
    return {
      isOperational: true,
      hasValidConfiguration: !!this.baseURL,
      hasActiveRequests: this.activeRequests.size > 0,
      cacheSize: this._cache ? Object.keys(this._cache).length : 0,
      isAuthenticated: !!this.getAccessToken(),
      canRefreshToken: !!this.getRefreshToken(),
    };
  }

  /**
   * Export configuration for debugging
   */
  exportConfig() {
    return {
      baseURL: this.baseURL,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      headers: this.client.defaults.headers,
      statistics: this.getStatistics(),
    };
  }
}

// Create and export singleton instance
const apiService = new ApiService();

export default apiService;