// src/contexts/AuthContext.js - Authentication state management with Context API
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import authService from '../services/authService.js';
import errorService from '../services/errorService.js';
import { SUBSCRIPTION_TIERS } from '../services/constants.js';

// Initial state
const initialState = {
  user: null,
  tokens: {
    access: null,
    refresh: null,
    expiresAt: null,
  },
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,
  authError: null,
  lastActivity: null,
  sessionTimeout: null,
  permissions: {
    canCreateChats: false,
    canExportChats: false,
    canAccessAnalytics: false,
    hasUnlimitedMessages: false,
  },
};

// Action types
const AUTH_ACTIONS = {
  // Authentication flow
  AUTH_INIT_START: 'AUTH_INIT_START',
  AUTH_INIT_SUCCESS: 'AUTH_INIT_SUCCESS',
  AUTH_INIT_FAILURE: 'AUTH_INIT_FAILURE',
  
  // Login/Logout
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  
  LOGOUT_START: 'LOGOUT_START',
  LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',
  
  // Registration
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  
  // Profile management
  UPDATE_PROFILE_START: 'UPDATE_PROFILE_START',
  UPDATE_PROFILE_SUCCESS: 'UPDATE_PROFILE_SUCCESS',
  UPDATE_PROFILE_FAILURE: 'UPDATE_PROFILE_FAILURE',
  
  // Token management
  TOKEN_REFRESH_START: 'TOKEN_REFRESH_START',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE',
  
  // Session management
  UPDATE_ACTIVITY: 'UPDATE_ACTIVITY',
  SESSION_TIMEOUT_WARNING: 'SESSION_TIMEOUT_WARNING',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Error handling
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_ERROR: 'SET_ERROR',
  
  // Subscription updates
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  USAGE_STATS_UPDATED: 'USAGE_STATS_UPDATED',
};

// Helper function to calculate permissions based on subscription
const calculatePermissions = (subscription) => {
  const tier = subscription?.tier || SUBSCRIPTION_TIERS.FREE;
  
  return {
    canCreateChats: true, // All users can create chats
    canExportChats: tier === SUBSCRIPTION_TIERS.PREMIUM || tier === SUBSCRIPTION_TIERS.PROFESSIONAL,
    canAccessAnalytics: tier === SUBSCRIPTION_TIERS.PREMIUM || tier === SUBSCRIPTION_TIERS.PROFESSIONAL,
    hasUnlimitedMessages: tier === SUBSCRIPTION_TIERS.PROFESSIONAL,
    canAccessPrioritySupport: tier === SUBSCRIPTION_TIERS.PROFESSIONAL,
    maxChatsPerDay: tier === SUBSCRIPTION_TIERS.FREE ? 10 : tier === SUBSCRIPTION_TIERS.PREMIUM ? 50 : Infinity,
    maxMessagesPerDay: tier === SUBSCRIPTION_TIERS.FREE ? 100 : tier === SUBSCRIPTION_TIERS.PREMIUM ? 500 : Infinity,
  };
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.AUTH_INIT_START:
      return {
        ...state,
        isLoading: true,
        authError: null,
      };

    case AUTH_ACTIONS.AUTH_INIT_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: !!action.payload.user,
        isLoading: false,
        isInitialized: true,
        authError: null,
        permissions: calculatePermissions(action.payload.user?.subscription),
        lastActivity: new Date(),
      };

    case AUTH_ACTIONS.AUTH_INIT_FAILURE:
      return {
        ...state,
        user: null,
        tokens: { access: null, refresh: null, expiresAt: null },
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        authError: action.payload.error,
        permissions: calculatePermissions(null),
      };

    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        authError: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        tokens: {
          access: action.payload.tokens?.access,
          refresh: action.payload.tokens?.refresh,
          expiresAt: action.payload.tokens?.expiresAt,
        },
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        permissions: calculatePermissions(action.payload.user?.subscription),
        lastActivity: new Date(),
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        tokens: { access: null, refresh: null, expiresAt: null },
        isAuthenticated: false,
        isLoading: false,
        authError: action.payload.error,
        permissions: calculatePermissions(null),
      };

    case AUTH_ACTIONS.LOGOUT_START:
      return {
        ...state,
        isLoading: true,
      };

    case AUTH_ACTIONS.LOGOUT_SUCCESS:
      return {
        ...initialState,
        isInitialized: true,
        isLoading: false,
      };

    case AUTH_ACTIONS.UPDATE_PROFILE_START:
      return {
        ...state,
        isLoading: true,
        authError: null,
      };

    case AUTH_ACTIONS.UPDATE_PROFILE_SUCCESS:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload.user,
        },
        isLoading: false,
        authError: null,
        lastActivity: new Date(),
      };

    case AUTH_ACTIONS.UPDATE_PROFILE_FAILURE:
      return {
        ...state,
        isLoading: false,
        authError: action.payload.error,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_START:
      return {
        ...state,
        // Don't set loading to true for token refresh to avoid UI flicker
        authError: null,
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        tokens: {
          access: action.payload.tokens.access,
          refresh: action.payload.tokens.refresh,
          expiresAt: action.payload.tokens.expiresAt,
        },
        authError: null,
        lastActivity: new Date(),
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILURE:
      return {
        ...initialState,
        isInitialized: true,
        isLoading: false,
        authError: action.payload.error,
      };

    case AUTH_ACTIONS.UPDATE_ACTIVITY:
      return {
        ...state,
        lastActivity: new Date(),
        sessionTimeout: null,
      };

    case AUTH_ACTIONS.SESSION_TIMEOUT_WARNING:
      return {
        ...state,
        sessionTimeout: 'warning',
      };

    case AUTH_ACTIONS.SESSION_EXPIRED:
      return {
        ...initialState,
        isInitialized: true,
        isLoading: false,
        authError: 'Session expired. Please log in again.',
      };

    case AUTH_ACTIONS.SUBSCRIPTION_UPDATED:
      return {
        ...state,
        user: {
          ...state.user,
          subscription: action.payload.subscription,
        },
        permissions: calculatePermissions(action.payload.subscription),
      };

    case AUTH_ACTIONS.USAGE_STATS_UPDATED:
      return {
        ...state,
        user: {
          ...state.user,
          usageStats: {
            ...state.user.usageStats,
            ...action.payload.usageStats,
          },
        },
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        authError: null,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        authError: action.payload.error,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: AUTH_ACTIONS.AUTH_INIT_START });

      try {
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser();
          
          dispatch({
            type: AUTH_ACTIONS.AUTH_INIT_SUCCESS,
            payload: {
              user,
              tokens: {
                access: authService.getAccessToken(),
                refresh: authService.getRefreshToken(),
                expiresAt: null, // Could be calculated from token
              },
            },
          });
        } else {
          dispatch({
            type: AUTH_ACTIONS.AUTH_INIT_FAILURE,
            payload: { error: null },
          });
        }
      } catch (error) {
        dispatch({
          type: AUTH_ACTIONS.AUTH_INIT_FAILURE,
          payload: { error: error.message },
        });
      }
    };

    initializeAuth();
  }, []);

  // Listen for auth service changes
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((authState) => {
      if (!authState.isAuthenticated && state.isAuthenticated) {
        // User logged out or token expired
        dispatch({ type: AUTH_ACTIONS.LOGOUT_SUCCESS });
      }
    });

    return unsubscribe;
  }, [state.isAuthenticated]);

  // Session activity tracking
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const handleActivity = () => {
      dispatch({ type: AUTH_ACTIONS.UPDATE_ACTIVITY });
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [state.isAuthenticated]);

  // Session timeout management
  useEffect(() => {
    if (!state.isAuthenticated || !state.lastActivity) return;

    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

    const checkSessionTimeout = () => {
      const now = new Date();
      const timeSinceActivity = now - new Date(state.lastActivity);

      if (timeSinceActivity >= SESSION_TIMEOUT) {
        dispatch({ type: AUTH_ACTIONS.SESSION_EXPIRED });
      } else if (timeSinceActivity >= SESSION_TIMEOUT - WARNING_TIME && state.sessionTimeout !== 'warning') {
        dispatch({ type: AUTH_ACTIONS.SESSION_TIMEOUT_WARNING });
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.lastActivity, state.sessionTimeout]);

  // Action creators
  const login = useCallback(async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const result = await authService.login(credentials);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: result.user,
          tokens: {
            access: authService.getAccessToken(),
            refresh: authService.getRefreshToken(),
            expiresAt: null,
          },
        },
      });

      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });

    try {
      const result = await authService.register(userData);
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: {
          user: result.user,
          tokens: {
            access: authService.getAccessToken(),
            refresh: authService.getRefreshToken(),
            expiresAt: null,
          },
        },
      });

      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT_START });

    try {
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT_SUCCESS });
      
      return { success: true };
    } catch (error) {
      // Even if logout fails, clear local state
      dispatch({ type: AUTH_ACTIONS.LOGOUT_SUCCESS });
      console.error('Logout error:', error);
      
      return { success: true };
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_PROFILE_START });

    try {
      const result = await authService.updateProfile(profileData);
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE_SUCCESS,
        payload: { user: result.user },
      });

      return { success: true, user: result.user };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const changePassword = useCallback(async (passwordData) => {
    try {
      await authService.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      throw error;
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE_SUCCESS,
        payload: { user },
      });

      return { success: true, user };
    } catch (error) {
      throw error;
    }
  }, []);

  const updateUsageStats = useCallback((usageStats) => {
    dispatch({
      type: AUTH_ACTIONS.USAGE_STATS_UPDATED,
      payload: { usageStats },
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const extendSession = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_ACTIVITY });
  }, []);

  // Helper functions
  const hasPermission = useCallback((permission) => {
    return state.permissions[permission] || false;
  }, [state.permissions]);

  const canPerformAction = useCallback((action, currentUsage = {}) => {
    const permissions = state.permissions;
    
    switch (action) {
      case 'create_chat':
        if (!permissions.canCreateChats) return false;
        const dailyChats = currentUsage.chatsToday || 0;
        return dailyChats < permissions.maxChatsPerDay;
        
      case 'send_message':
        const dailyMessages = currentUsage.messagesToday || 0;
        return permissions.hasUnlimitedMessages || dailyMessages < permissions.maxMessagesPerDay;
        
      case 'export_chat':
        return permissions.canExportChats;
        
      case 'access_analytics':
        return permissions.canAccessAnalytics;
        
      default:
        return true;
    }
  }, [state.permissions]);

  const getSubscriptionLimits = useCallback(() => {
    const tier = state.user?.subscription?.tier || SUBSCRIPTION_TIERS.FREE;
    
    return {
      tier,
      limits: {
        chatsPerDay: state.permissions.maxChatsPerDay,
        messagesPerDay: state.permissions.maxMessagesPerDay,
        hasAnalytics: state.permissions.canAccessAnalytics,
        hasExport: state.permissions.canExportChats,
        hasPrioritySupport: state.permissions.canAccessPrioritySupport,
      },
    };
  }, [state.user?.subscription?.tier, state.permissions]);

  const isSubscriptionExpired = useCallback(() => {
    const subscription = state.user?.subscription;
    if (!subscription || !subscription.expiresAt) return false;
    
    return new Date(subscription.expiresAt) < new Date();
  }, [state.user?.subscription]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUserData,
    updateUsageStats,
    clearError,
    extendSession,
    
    // Helper functions
    hasPermission,
    canPerformAction,
    getSubscriptionLimits,
    isSubscriptionExpired,
    
    // Computed values
    isLoggedIn: state.isAuthenticated,
    userDisplayName: state.user?.profile?.fullName || state.user?.email || 'User',
    subscriptionTier: state.user?.subscription?.tier || SUBSCRIPTION_TIERS.FREE,
    isSessionNearExpiry: state.sessionTimeout === 'warning',
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Higher-order component for protected routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return <div>Loading...</div>; // Replace with your loading component
    }
    
    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>; // Replace with redirect to login
    }
    
    return <Component {...props} />;
  };
};

// Permission-based component wrapper
export const withPermission = (permission) => (Component) => {
  return function PermissionComponent(props) {
    const { hasPermission } = useAuth();
    
    if (!hasPermission(permission)) {
      return <div>You don't have permission to access this feature.</div>;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;