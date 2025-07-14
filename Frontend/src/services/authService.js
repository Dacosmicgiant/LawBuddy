// src/services/authService.js - Authentication and user management
import apiService from './api.js';
import errorService, { AuthenticationError, ValidationError } from './errorService.js';
import { API_ENDPOINTS, STORAGE_KEYS, VALIDATION, SUBSCRIPTION_TIERS } from './constants.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
    this.isInitialized = false;
    
    // Initialize from stored data
    this.initialize();
  }

  /**
   * Initialize auth service from stored data
   */
  async initialize() {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (storedUser && accessToken) {
        this.currentUser = JSON.parse(storedUser);
        
        // Validate token by fetching current user
        try {
          await this.getCurrentUser();
        } catch (error) {
          // Token is invalid, clear stored data
          this.logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.logout();
    } finally {
      this.isInitialized = true;
      this.notifyAuthChange();
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      this.validateRegistrationData(userData);
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, {
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        full_name: userData.fullName?.trim(),
      });

      // Store user data and tokens
      this.setAuthData(response);
      
      return {
        success: true,
        user: this.currentUser,
        message: 'Registration successful! Welcome to LawBuddy.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'register', email: userData.email }
      });
    }
  }

  /**
   * Login user
   */
  async login(credentials) {
    try {
      this.validateLoginData(credentials);
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
      });

      // Store user data and tokens
      this.setAuthData(response);
      
      return {
        success: true,
        user: this.currentUser,
        message: 'Login successful! Welcome back.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'login', email: credentials.email }
      });
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint if user is authenticated
      if (this.isAuthenticated()) {
        try {
          await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        }
      }
    } finally {
      // Always clear local data
      this.clearAuthData();
      
      // Cancel any pending requests
      apiService.cancelAllRequests();
      
      // Notify listeners
      this.notifyAuthChange();
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      if (!this.isAuthenticated()) {
        throw new AuthenticationError('Not authenticated');
      }

      const response = await apiService.get(API_ENDPOINTS.AUTH.ME);
      
      // Update stored user data
      this.currentUser = {
        id: response.id,
        email: response.email,
        profile: response.profile,
        preferences: response.preferences,
        subscription: response.subscription,
        usageStats: response.usage_stats,
        isActive: response.is_active,
        createdAt: response.created_at,
      };
      
      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getCurrentUser' }
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      this.validateProfileData(profileData);
      
      // Note: Backend doesn't have a direct profile update endpoint
      // This would need to be implemented or we might need to use a different approach
      const response = await apiService.put(API_ENDPOINTS.AUTH.ME, {
        full_name: profileData.fullName,
        location: profileData.location,
        phone: profileData.phone,
      });

      // Update current user data
      this.currentUser = {
        ...this.currentUser,
        profile: {
          ...this.currentUser.profile,
          ...response.profile,
        }
      };
      
      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.currentUser));
      
      // Notify listeners
      this.notifyAuthChange();
      
      return {
        success: true,
        user: this.currentUser,
        message: 'Profile updated successfully.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'updateProfile' }
      });
    }
  }

  /**
   * Change user password
   */
  async changePassword(passwordData) {
    try {
      this.validatePasswordChange(passwordData);
      
      await apiService.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, null, {
        params: {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }
      });
      
      return {
        success: true,
        message: 'Password changed successfully.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'changePassword' }
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      this.validateEmail(email);
      
      await apiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.toLowerCase().trim(),
      });
      
      return {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'requestPasswordReset', email }
      });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData) {
    try {
      this.validatePasswordReset(resetData);
      
      await apiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token: resetData.token,
        new_password: resetData.newPassword,
      });
      
      return {
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'resetPassword' }
      });
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount() {
    try {
      await apiService.delete(API_ENDPOINTS.AUTH.DEACTIVATE);
      
      // Logout user after deactivation
      this.clearAuthData();
      this.notifyAuthChange();
      
      return {
        success: true,
        message: 'Account deactivated successfully.'
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'deactivateAccount' }
      });
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.currentUser && apiService.getAccessToken());
  }

  /**
   * Check if user has specific subscription tier
   */
  hasSubscriptionTier(requiredTier) {
    if (!this.currentUser) return false;
    
    const tierHierarchy = {
      [SUBSCRIPTION_TIERS.FREE]: 0,
      [SUBSCRIPTION_TIERS.PREMIUM]: 1,
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: 2,
    };
    
    const userTierLevel = tierHierarchy[this.currentUser.subscription?.tier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;
    
    return userTierLevel >= requiredTierLevel;
  }

  /**
   * Check if user can perform action based on subscription
   */
  canPerformAction(action) {
    const actionRequirements = {
      'create_chat': SUBSCRIPTION_TIERS.FREE,
      'export_chat': SUBSCRIPTION_TIERS.PREMIUM,
      'advanced_analytics': SUBSCRIPTION_TIERS.PREMIUM,
      'unlimited_messages': SUBSCRIPTION_TIERS.PROFESSIONAL,
      'priority_support': SUBSCRIPTION_TIERS.PROFESSIONAL,
    };
    
    const requiredTier = actionRequirements[action];
    if (!requiredTier) return true; // No restriction
    
    return this.hasSubscriptionTier(requiredTier);
  }

  /**
   * Get user's usage statistics
   */
  getUsageStats() {
    return this.currentUser?.usageStats || {
      totalChats: 0,
      totalMessages: 0,
      lastActive: null,
      favoriteTopics: [],
    };
  }

  /**
   * Get user's subscription info
   */
  getSubscriptionInfo() {
    return this.currentUser?.subscription || {
      tier: SUBSCRIPTION_TIERS.FREE,
      expiresAt: null,
      features: [],
    };
  }

  /**
   * Set authentication data
   */
  setAuthData(response) {
    // Extract user data
    this.currentUser = {
      id: response.id,
      email: response.email,
      profile: response.profile,
      preferences: response.preferences,
      subscription: response.subscription,
      usageStats: response.usage_stats,
      isActive: response.is_active,
      createdAt: response.created_at,
    };
    
    // Store tokens
    apiService.setTokens(response.access_token, response.refresh_token);
    
    // Store user profile
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.currentUser));
    
    // Notify listeners
    this.notifyAuthChange();
  }

  /**
   * Clear authentication data
   */
  clearAuthData() {
    this.currentUser = null;
    apiService.clearTokens();
    
    // Clear related localStorage items
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.CHAT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.UI_SETTINGS);
  }

  /**
   * Add authentication change listener
   */
  onAuthChange(callback) {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all auth listeners
   */
  notifyAuthChange() {
    const authState = {
      isAuthenticated: this.isAuthenticated(),
      user: this.currentUser,
      isInitialized: this.isInitialized,
    };
    
    this.authListeners.forEach(listener => {
      try {
        listener(authState);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  /**
   * Validation methods
   */
  validateRegistrationData(data) {
    if (!data.email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(data.email)) {
      throw new ValidationError('Please enter a valid email address', 'email');
    }
    
    if (!data.password) {
      throw new ValidationError('Password is required', 'password');
    }
    
    if (data.password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
        'password'
      );
    }
    
    if (!VALIDATION.PASSWORD_REGEX.test(data.password)) {
      throw new ValidationError(
        'Password must contain uppercase, lowercase, number, and special character',
        'password'
      );
    }
    
    if (data.fullName && data.fullName.trim().length < VALIDATION.USERNAME_MIN_LENGTH) {
      throw new ValidationError(
        `Name must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters long`,
        'fullName'
      );
    }
  }

  validateLoginData(data) {
    if (!data.email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(data.email)) {
      throw new ValidationError('Please enter a valid email address', 'email');
    }
    
    if (!data.password) {
      throw new ValidationError('Password is required', 'password');
    }
  }

  validateProfileData(data) {
    if (data.fullName && data.fullName.trim().length < VALIDATION.USERNAME_MIN_LENGTH) {
      throw new ValidationError(
        `Name must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters long`,
        'fullName'
      );
    }
    
    if (data.fullName && data.fullName.trim().length > VALIDATION.USERNAME_MAX_LENGTH) {
      throw new ValidationError(
        `Name must be no more than ${VALIDATION.USERNAME_MAX_LENGTH} characters long`,
        'fullName'
      );
    }
  }

  validatePasswordChange(data) {
    if (!data.currentPassword) {
      throw new ValidationError('Current password is required', 'currentPassword');
    }
    
    if (!data.newPassword) {
      throw new ValidationError('New password is required', 'newPassword');
    }
    
    if (data.newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `New password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
        'newPassword'
      );
    }
    
    if (!VALIDATION.PASSWORD_REGEX.test(data.newPassword)) {
      throw new ValidationError(
        'New password must contain uppercase, lowercase, number, and special character',
        'newPassword'
      );
    }
    
    if (data.currentPassword === data.newPassword) {
      throw new ValidationError('New password must be different from current password', 'newPassword');
    }
  }

  validatePasswordReset(data) {
    if (!data.token) {
      throw new ValidationError('Reset token is required', 'token');
    }
    
    if (!data.newPassword) {
      throw new ValidationError('New password is required', 'newPassword');
    }
    
    if (data.newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
        'newPassword'
      );
    }
    
    if (!VALIDATION.PASSWORD_REGEX.test(data.newPassword)) {
      throw new ValidationError(
        'Password must contain uppercase, lowercase, number, and special character',
        'newPassword'
      );
    }
  }

  validateEmail(email) {
    if (!email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      throw new ValidationError('Please enter a valid email address', 'email');
    }
  }

  /**
   * Get auth service statistics
   */
  getStatistics() {
    return {
      isAuthenticated: this.isAuthenticated(),
      isInitialized: this.isInitialized,
      hasUser: !!this.currentUser,
      listenerCount: this.authListeners.length,
      subscriptionTier: this.currentUser?.subscription?.tier || 'none',
      usageStats: this.getUsageStats(),
    };
  }
}

// Create and export singleton instance
const authService = new AuthService();

export default authService;