// Error boundary
  SET_ERROR_BOUNDARY: 'SET_ERROR_BOUNDARY',
  CLEAR_ERROR_BOUNDARY: 'CLEAR_ERROR_BOUNDARY',
  
  // Features
  TOGGLE_FEATURE: 'TOGGLE_FEATURE',
  UPDATE_FEATURES: 'UPDATE_FEATURES',
  
  // Connection status
  UPDATE_CONNECTION_STATUS: 'UPDATE_CONNECTION_STATUS',
};

// Helper functions
const generateId = () => `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createNotification = (type, title, message, options = {}) => ({
  id: generateId(),
  type, // 'info', 'success', 'warning', 'error'
  title,
  message,
  duration: options.duration || (type === 'error' ? 0 : 5000), // 0 = persistent
  persistent: options.persistent || type === 'error',
  actions: options.actions || [],
  timestamp: new Date(),
  ...options,
});

const createToast = (type, message, options = {}) => ({
  id: generateId(),
  type, // 'info', 'success', 'warning', 'error'
  message,
  duration: options.duration || 3000,
  position: options.position || 'top-right',
  dismissible: options.dismissible !== false,
  timestamp: new Date(),
  ...options,
});

// UI reducer
const uiReducer = (state, action) => {
  switch (action.type) {
    case UI_ACTIONS.SET_GLOBAL_LOADING:
      return {
        ...state,
        globalLoading: action.payload.loading,
      };

    case UI_ACTIONS.SET_LOADING_STATE:
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [action.payload.operationId]: {
            loading: true,
            message: action.payload.message || 'Loading...',
            startTime: new Date(),
          },
        },
      };

    case UI_ACTIONS.CLEAR_LOADING_STATE:
      const newLoadingStates = { ...state.loadingStates };
      delete newLoadingStates[action.payload.operationId];
      
      return {
        ...state,
        loadingStates: newLoadingStates,
      };

    case UI_ACTIONS.CLEAR_ALL_LOADING:
      return {
        ...state,
        globalLoading: false,
        loadingStates: {},
      };

    case UI_ACTIONS.ADD_NOTIFICATION:
      const newNotification = action.payload.notification;
      let notifications = [...state.notifications, newNotification];
      
      // Remove oldest if exceeding max
      if (notifications.length > state.maxNotifications) {
        notifications = notifications.slice(-state.maxNotifications);
      }
      
      return {
        ...state,
        notifications,
      };

    case UI_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload.id),
      };

    case UI_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
      };

    case UI_ACTIONS.UPDATE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload.id 
            ? { ...n, ...action.payload.updates }
            : n
        ),
      };

    case UI_ACTIONS.ADD_TOAST:
      const newToast = action.payload.toast;
      return {
        ...state,
        toasts: [...state.toasts, newToast],
      };

    case UI_ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload.id),
      };

    case UI_ACTIONS.CLEAR_TOASTS:
      return {
        ...state,
        toasts: [],
      };

    case UI_ACTIONS.SET_TOAST_POSITION:
      return {
        ...state,
        toastPosition: action.payload.position,
      };

    case UI_ACTIONS.OPEN_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modalId]: {
            isOpen: true,
            data: action.payload.data,
            options: action.payload.options || {},
          },
        },
      };

    case UI_ACTIONS.CLOSE_MODAL:
      const updatedModals = { ...state.modals };
      if (updatedModals[action.payload.modalId]) {
        updatedModals[action.payload.modalId].isOpen = false;
      }
      
      return {
        ...state,
        modals: updatedModals,
      };

    case UI_ACTIONS.UPDATE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modalId]: {
            ...state.modals[action.payload.modalId],
            ...action.payload.updates,
          },
        },
      };

    case UI_ACTIONS.CLOSE_ALL_MODALS:
      const closedModals = {};
      Object.keys(state.modals).forEach(modalId => {
        closedModals[modalId] = {
          ...state.modals[modalId],
          isOpen: false,
        };
      });
      
      return {
        ...state,
        modals: closedModals,
      };

    case UI_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          isOpen: !state.sidebar.isOpen,
        },
      };

    case UI_ACTIONS.SET_SIDEBAR_STATE:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          isOpen: action.payload.isOpen,
        },
      };

    case UI_ACTIONS.TOGGLE_SIDEBAR_PIN:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          isPinned: !state.sidebar.isPinned,
        },
      };

    case UI_ACTIONS.SET_SIDEBAR_WIDTH:
      return {
        ...state,
        sidebar: {
          ...state.sidebar,
          width: action.payload.width,
        },
      };

    case UI_ACTIONS.SET_THEME_MODE:
      return {
        ...state,
        theme: {
          ...state.theme,
          mode: action.payload.mode,
        },
      };

    case UI_ACTIONS.SET_THEME_COLOR:
      return {
        ...state,
        theme: {
          ...state.theme,
          primaryColor: action.payload.color,
        },
      };

    case UI_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        theme: {
          ...state.theme,
          fontSize: action.payload.size,
        },
      };

    case UI_ACTIONS.SET_DENSITY:
      return {
        ...state,
        theme: {
          ...state.theme,
          density: action.payload.density,
        },
      };

    case UI_ACTIONS.TOGGLE_HIGH_CONTRAST:
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          highContrast: !state.accessibility.highContrast,
        },
      };

    case UI_ACTIONS.UPDATE_LAYOUT:
      return {
        ...state,
        layout: {
          ...state.layout,
          ...action.payload.updates,
        },
      };

    case UI_ACTIONS.RESET_LAYOUT:
      return {
        ...state,
        layout: initialState.layout,
      };

    case UI_ACTIONS.SET_FOCUS:
      return {
        ...state,
        focus: {
          ...state.focus,
          currentElement: action.payload.element,
        },
      };

    case UI_ACTIONS.CLEAR_FOCUS:
      return {
        ...state,
        focus: {
          ...state.focus,
          currentElement: null,
        },
      };

    case UI_ACTIONS.TOGGLE_FOCUS_TRAP:
      return {
        ...state,
        focus: {
          ...state.focus,
          trapFocus: !state.focus.trapFocus,
        },
      };

    case UI_ACTIONS.ADD_TO_FOCUS_HISTORY:
      return {
        ...state,
        focus: {
          ...state.focus,
          focusHistory: [...state.focus.focusHistory.slice(-9), action.payload.element],
        },
      };

    case UI_ACTIONS.UPDATE_ACCESSIBILITY:
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          ...action.payload.updates,
        },
      };

    case UI_ACTIONS.TOGGLE_REDUCE_MOTION:
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          reduceMotion: !state.accessibility.reduceMotion,
        },
        performance: {
          ...state.performance,
          enableAnimations: state.accessibility.reduceMotion, // Enable when reduce motion is off
        },
      };

    case UI_ACTIONS.UPDATE_PERFORMANCE:
      return {
        ...state,
        performance: {
          ...state.performance,
          ...action.payload.updates,
        },
      };

    case UI_ACTIONS.TOGGLE_ANIMATIONS:
      return {
        ...state,
        performance: {
          ...state.performance,
          enableAnimations: !state.performance.enableAnimations,
        },
      };

    case UI_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload.updates,
        },
      };

    case UI_ACTIONS.RESET_PREFERENCES:
      return {
        ...state,
        preferences: initialState.preferences,
      };

    case UI_ACTIONS.SET_ERROR_BOUNDARY:
      return {
        ...state,
        errorBoundary: {
          hasError: true,
          error: action.payload.error,
          errorInfo: action.payload.errorInfo,
          fallbackComponent: action.payload.fallbackComponent,
        },
      };

    case UI_ACTIONS.CLEAR_ERROR_BOUNDARY:
      return {
        ...state,
        errorBoundary: {
          hasError: false,
          error: null,
          errorInfo: null,
          fallbackComponent: null,
        },
      };

    case UI_ACTIONS.TOGGLE_FEATURE:
      return {
        ...state,
        features: {
          ...state.features,
          [action.payload.feature]: !state.features[action.payload.feature],
        },
      };

    case UI_ACTIONS.UPDATE_FEATURES:
      return {
        ...state,
        features: {
          ...state.features,
          ...action.payload.updates,
        },
      };

    case UI_ACTIONS.UPDATE_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: {
          ...state.connectionStatus,
          ...action.payload.updates,
        },
      };

    default:
      return state;
  }
};

// Create context
const UIContext = createContext();

// Provider component
export const UIProvider = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  const { isAuthenticated } = useAuth();
  const { connectionState, lastError: wsError } = useWebSocket();

  // Auto-remove toasts after their duration
  useEffect(() => {
    const timeouts = state.toasts.map(toast => {
      if (toast.duration > 0) {
        return setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration);
      }
      return null;
    }).filter(Boolean);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [state.toasts]);

  // Auto-remove notifications after their duration
  useEffect(() => {
    const timeouts = state.notifications.map(notification => {
      if (notification.duration > 0) {
        return setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration);
      }
      return null;
    }).filter(Boolean);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [state.notifications]);

  // Listen for error service events
  useEffect(() => {
    const unsubscribe = errorService.onError((error, options) => {
      if (options.showNotification !== false) {
        showErrorNotification(error);
      }
    });

    return unsubscribe;
  }, []);

  // Detect system theme changes
  useEffect(() => {
    if (state.theme.mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        // Apply system theme
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };

      handleChange(mediaQuery);
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      document.documentElement.setAttribute('data-theme', state.theme.mode);
    }
  }, [state.theme.mode]);

  // Apply accessibility preferences
  useEffect(() => {
    const { accessibility, performance } = state;
    
    // High contrast
    document.documentElement.classList.toggle('high-contrast', accessibility.highContrast);
    
    // Reduced motion
    document.documentElement.classList.toggle('reduce-motion', accessibility.reduceMotion);
    
    // Animations
    document.documentElement.classList.toggle('no-animations', !performance.enableAnimations);
    
    // Font size
    document.documentElement.setAttribute('data-font-size', state.theme.fontSize);
    
    // Density
    document.documentElement.setAttribute('data-density', state.theme.density);
  }, [state.accessibility, state.performance, state.theme]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape key closes modals
      if (event.key === 'Escape') {
        const openModals = Object.entries(state.modals).filter(([_, modal]) => modal.isOpen);
        if (openModals.length > 0) {
          const [lastModalId] = openModals[openModals.length - 1];
          closeModal(lastModalId);
          event.preventDefault();
        }
      }

      // Keyboard shortcuts (if enabled)
      if (state.features.keyboardShortcuts && (event.ctrlKey || event.metaKey)) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            toggleSidebar();
            break;
          case 'k':
            event.preventDefault();
            // Open command palette or search
            openModal('command-palette');
            break;
          case '/':
            event.preventDefault();
            // Focus search
            addToast('info', 'Search focused');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.modals, state.features.keyboardShortcuts]);

  // Action creators
  const setGlobalLoading = useCallback((loading) => {
    dispatch({
      type: UI_ACTIONS.SET_GLOBAL_LOADING,
      payload: { loading },
    });
  }, []);

  const setLoadingState = useCallback((operationId, message = 'Loading...') => {
    dispatch({
      type: UI_ACTIONS.SET_LOADING_STATE,
      payload: { operationId, message },
    });
  }, []);

  const clearLoadingState = useCallback((operationId) => {
    dispatch({
      type: UI_ACTIONS.CLEAR_LOADING_STATE,
      payload: { operationId },
    });
  }, []);

  const addNotification = useCallback((type, title, message, options = {}) => {
    const notification = createNotification(type, title, message, options);
    
    dispatch({
      type: UI_ACTIONS.ADD_NOTIFICATION,
      payload: { notification },
    });

    return notification.id;
  }, []);

  const removeNotification = useCallback((id) => {
    dispatch({
      type: UI_ACTIONS.REMOVE_NOTIFICATION,
      payload: { id },
    });
  }, []);

  const addToast = useCallback((type, message, options = {}) => {
    const toast = createToast(type, message, options);
    
    dispatch({
      type: UI_ACTIONS.ADD_TOAST,
      payload: { toast },
    });

    return toast.id;
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({
      type: UI_ACTIONS.REMOVE_TOAST,
      payload: { id },
    });
  }, []);

  const openModal = useCallback((modalId, data = null, options = {}) => {
    dispatch({
      type: UI_ACTIONS.OPEN_MODAL,
      payload: { modalId, data, options },
    });
  }, []);

  const closeModal = useCallback((modalId) => {
    dispatch({
      type: UI_ACTIONS.CLOSE_MODAL,
      payload: { modalId },
    });
  }, []);

  const updateModal = useCallback((modalId, updates) => {
    dispatch({
      type: UI_ACTIONS.UPDATE_MODAL,
      payload: { modalId, updates },
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: UI_ACTIONS.TOGGLE_SIDEBAR });
  }, []);

  const setSidebarState = useCallback((isOpen) => {
    dispatch({
      type: UI_ACTIONS.SET_SIDEBAR_STATE,
      payload: { isOpen },
    });
  }, []);

  const setThemeMode = useCallback((mode) => {
    dispatch({
      type: UI_ACTIONS.SET_THEME_MODE,
      payload: { mode },
    });
    
    // Save to localStorage
    localStorage.setItem('lawbuddy_theme_mode', mode);
  }, []);

  const setThemeColor = useCallback((color) => {
    dispatch({
      type: UI_ACTIONS.SET_THEME_COLOR,
      payload: { color },
    });
    
    localStorage.setItem('lawbuddy_theme_color', color);
  }, []);

  const updateAccessibility = useCallback((updates) => {
    dispatch({
      type: UI_ACTIONS.UPDATE_ACCESSIBILITY,
      payload: { updates },
    });
    
    // Save to localStorage
    localStorage.setItem('lawbuddy_accessibility', JSON.stringify(updates));
  }, []);

  const updatePreferences = useCallback((updates) => {
    dispatch({
      type: UI_ACTIONS.UPDATE_PREFERENCES,
      payload: { updates },
    });
    
    // Save to localStorage
    const currentPrefs = JSON.parse(localStorage.getItem('lawbuddy_preferences') || '{}');
    localStorage.setItem('lawbuddy_preferences', JSON.stringify({ ...currentPrefs, ...updates }));
  }, []);

  const showSuccessToast = useCallback((message, options = {}) => {
    return addToast('success', message, options);
  }, [addToast]);

  const showErrorToast = useCallback((message, options = {}) => {
    return addToast('error', message, { duration: 5000, ...options });
  }, [addToast]);

  const showInfoToast = useCallback((message, options = {}) => {
    return addToast('info', message, options);
  }, [addToast]);

  const showWarningToast = useCallback((message, options = {}) => {
    return addToast('warning', message, { duration: 4000, ...options });
  }, [addToast]);

  const showSuccessNotification = useCallback((title, message, options = {}) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const showErrorNotification = useCallback((error, options = {}) => {
    const title = options.title || 'Error';
    const message = typeof error === 'string' ? error : error.message || 'An error occurred';
    
    return addNotification('error', title, message, {
      persistent: true,
      actions: [
        {
          label: 'Retry',
          action: options.onRetry,
          variant: 'primary',
        },
        {
          label: 'Dismiss',
          action: (id) => removeNotification(id),
          variant: 'secondary',
        },
      ],
      ...options,
    });
  }, [addNotification, removeNotification]);

  const showInfoNotification = useCallback((title, message, options = {}) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  const showWarningNotification = useCallback((title, message, options = {}) => {
    return addNotification('warning', title, message, options);
  }, [addNotification]);

  const confirmAction = useCallback((title, message, onConfirm, onCancel = null) => {
    const modalId = 'confirm-dialog';
    
    openModal(modalId, {
      title,
      message,
      onConfirm: () => {
        closeModal(modalId);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        closeModal(modalId);
        if (onCancel) onCancel();
      },
    });
  }, [openModal, closeModal]);

  const setFocus = useCallback((element) => {
    dispatch({
      type: UI_ACTIONS.SET_FOCUS,
      payload: { element },
    });

    if (element) {
      dispatch({
        type: UI_ACTIONS.ADD_TO_FOCUS_HISTORY,
        payload: { element },
      });
    }
  }, []);

  const clearFocus = useCallback(() => {
    dispatch({ type: UI_ACTIONS.CLEAR_FOCUS });
  }, []);

  const toggleFeature = useCallback((feature) => {
    dispatch({
      type: UI_ACTIONS.TOGGLE_FEATURE,
      payload: { feature },
    });
  }, []);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedThemeMode = localStorage.getItem('lawbuddy_theme_mode');
      if (savedThemeMode) {
        setThemeMode(savedThemeMode);
      }

      const savedThemeColor = localStorage.getItem('lawbuddy_theme_color');
      if (savedThemeColor) {
        setThemeColor(savedThemeColor);
      }

      const savedAccessibility = localStorage.getItem('lawbuddy_accessibility');
      if (savedAccessibility) {
        updateAccessibility(JSON.parse(savedAccessibility));
      }

      const savedPreferences = localStorage.getItem('lawbuddy_preferences');
      if (savedPreferences) {
        updatePreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error('Error loading saved preferences:', error);
    }
  }, []);

  // Helper functions
  const isModalOpen = useCallback((modalId) => {
    return state.modals[modalId]?.isOpen || false;
  }, [state.modals]);

  const getModalData = useCallback((modalId) => {
    return state.modals[modalId]?.data || null;
  }, [state.modals]);

  const isLoading = useCallback((operationId = null) => {
    if (operationId) {
      return state.loadingStates[operationId]?.loading || false;
    }
    return state.globalLoading || Object.keys(state.loadingStates).length > 0;
  }, [state.globalLoading, state.loadingStates]);

  const getLoadingMessage = useCallback((operationId) => {
    return state.loadingStates[operationId]?.message || 'Loading...';
  }, [state.loadingStates]);

  const hasNotifications = useCallback(() => {
    return state.notifications.length > 0;
  }, [state.notifications]);

  const hasToasts = useCallback(() => {
    return state.toasts.length > 0;
  }, [state.toasts]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Loading actions
    setGlobalLoading,
    setLoadingState,
    clearLoadingState,
    isLoading,
    getLoadingMessage,
    
    // Notification actions
    addNotification,
    removeNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
    hasNotifications,
    
    // Toast actions
    addToast,
    removeToast,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
    hasToasts,
    
    // Modal actions
    openModal,
    closeModal,
    updateModal,
    confirmAction,
    isModalOpen,
    getModalData,
    
    // Sidebar actions
    toggleSidebar,
    setSidebarState,
    
    // Theme actions
    setThemeMode,
    setThemeColor,
    
    // Accessibility actions
    updateAccessibility,
    
    // Preferences actions
    updatePreferences,
    
    // Focus actions
    setFocus,
    clearFocus,
    
    // Feature actions
    toggleFeature,
    
    // Computed values
    isDarkMode: state.theme.mode === 'dark' || 
                (state.theme.mode === 'system' && 
                 window.matchMedia('(prefers-color-scheme: dark)').matches),
    isHighContrast: state.accessibility.highContrast,
    hasReducedMotion: state.accessibility.reduceMotion,
    isSidebarOpen: state.sidebar.isOpen,
    isSidebarPinned: state.sidebar.isPinned,
    hasError: state.errorBoundary.hasError,
    currentTheme: {
      mode: state.theme.mode,
      primaryColor: state.theme.primaryColor,
      fontSize: state.theme.fontSize,
      density: state.theme.density,
    },
    effectiveTheme: state.theme.mode === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : state.theme.mode,
  };

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
};

// Custom hook to use UI context
export const useUI = () => {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  
  return context;
};

// Specialized hooks
export const useLoading = (operationId = null) => {
  const { 
    isLoading, 
    setLoadingState, 
    clearLoadingState, 
    getLoadingMessage 
  } = useUI();

  const startLoading = useCallback((message = 'Loading...') => {
    if (operationId) {
      setLoadingState(operationId, message);
    }
  }, [operationId, setLoadingState]);

  const stopLoading = useCallback(() => {
    if (operationId) {
      clearLoadingState(operationId);
    }
  }, [operationId, clearLoadingState]);

  return {
    isLoading: isLoading(operationId),
    message: operationId ? getLoadingMessage(operationId) : 'Loading...',
    startLoading,
    stopLoading,
  };
};

export const useToasts = () => {
  const { 
    toasts, 
    addToast, 
    removeToast,
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
  } = useUI();

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess: showSuccessToast,
    showError: showErrorToast,
    showInfo: showInfoToast,
    showWarning: showWarningToast,
    hasToasts: toasts.length > 0,
  };
};

export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
    showWarningNotification,
  } = useUI();

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess: showSuccessNotification,
    showError: showErrorNotification,
    showInfo: showInfoNotification,
    showWarning: showWarningNotification,
    hasNotifications: notifications.length > 0,
  };
};

export const useModal = (modalId) => {
  const { 
    openModal, 
    closeModal, 
    updateModal, 
    isModalOpen, 
    getModalData 
  } = useUI();

  const open = useCallback((data = null, options = {}) => {
    openModal(modalId, data, options);
  }, [modalId, openModal]);

  const close = useCallback(() => {
    closeModal(modalId);
  }, [modalId, closeModal]);

  const update = useCallback((updates) => {
    updateModal(modalId, updates);
  }, [modalId, updateModal]);

  return {
    isOpen: isModalOpen(modalId),
    data: getModalData(modalId),
    open,
    close,
    update,
  };
};

export const useTheme = () => {
  const { 
    theme, 
    setThemeMode, 
    setThemeColor,
    isDarkMode,
    effectiveTheme,
    currentTheme,
  } = useUI();

  const toggleTheme = useCallback(() => {
    const newMode = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  }, [effectiveTheme, setThemeMode]);

  return {
    theme,
    currentTheme,
    isDarkMode,
    effectiveTheme,
    setMode: setThemeMode,
    setColor: setThemeColor,
    toggleTheme,
  };
};

export const useAccessibility = () => {
  const { 
    accessibility, 
    updateAccessibility,
    isHighContrast,
    hasReducedMotion,
  } = useUI();

  const toggleHighContrast = useCallback(() => {
    updateAccessibility({ highContrast: !accessibility.highContrast });
  }, [accessibility.highContrast, updateAccessibility]);

  const toggleReducedMotion = useCallback(() => {
    updateAccessibility({ reduceMotion: !accessibility.reduceMotion });
  }, [accessibility.reduceMotion, updateAccessibility]);

  const enableScreenReader = useCallback(() => {
    updateAccessibility({ screenReader: true });
  }, [updateAccessibility]);

  return {
    accessibility,
    isHighContrast,
    hasReducedMotion,
    updateAccessibility,
    toggleHighContrast,
    toggleReducedMotion,
    enableScreenReader,
  };
};

// Higher-order component for loading states
export const withLoading = (Component, operationId) => {
  return function LoadingComponent(props) {
    const { isLoading, startLoading, stopLoading } = useLoading(operationId);
    
    return (
      <Component 
        {...props} 
        isLoading={isLoading}
        startLoading={startLoading}
        stopLoading={stopLoading}
      />
    );
  };
};

// Higher-order component for modal management
export const withModal = (Component, modalId) => {
  return function ModalComponent(props) {
    const { isOpen, data, open, close, update } = useModal(modalId);
    
    return (
      <Component 
        {...props} 
        modal={{
          isOpen,
          data,
          open,
          close,
          update,
        }}
      />
    );
  };
};

// Error boundary component
export class UIErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Error Boundary caught an error:', error, errorInfo);
    
    // Report to error service
    errorService.handleError(error, {
      context: { 
        component: 'UIErrorBoundary',
        errorInfo 
      },
      showNotification: false,
    });

    // Update UI context if available
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-900">
                  Something went wrong
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    We're sorry, but something unexpected happened. Please try refreshing the page.
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Context provider wrapper with error boundary
export const UIProviderWithErrorBoundary = ({ children, fallback = null }) => {
  return (
    <UIErrorBoundary fallback={fallback}>
      <UIProvider>
        {children}
      </UIProvider>
    </UIErrorBoundary>
  );
};

// Hook for keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts = {}) => {
  const { features } = useUI();

  React.useEffect(() => {
    if (!features.keyboardShortcuts) return;

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build shortcut key
      let shortcutKey = '';
      if (modifier) shortcutKey += 'ctrl+';
      if (shift) shortcutKey += 'shift+';
      if (alt) shortcutKey += 'alt+';
      shortcutKey += key;

      // Execute shortcut if defined
      const shortcut = shortcuts[shortcutKey];
      if (shortcut && typeof shortcut === 'function') {
        event.preventDefault();
        shortcut(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, features.keyboardShortcuts]);
};

// Hook for responsive design
export const useResponsive = () => {
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;
  const isLargeDesktop = windowSize.width >= 1200;

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large',
  };
};

// Hook for offline detection
export const useOffline = () => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const { showWarningToast, showSuccessToast } = useToasts();

  React.useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      showWarningToast('You are currently offline', {
        persistent: true,
        id: 'offline-status',
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      showSuccessToast('You are back online', {
        duration: 3000,
        id: 'online-status',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showWarningToast, showSuccessToast]);

  return {
    isOffline,
    isOnline: !isOffline,
  };
};

// Hook for document title management
export const useDocumentTitle = (title, restore = true) => {
  const originalTitle = React.useRef(document.title);

  React.useEffect(() => {
    document.title = title;

    return () => {
      if (restore) {
        document.title = originalTitle.current;
      }
    };
  }, [title, restore]);
};

// Hook for local storage state
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = React.useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = React.useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  const removeStoredValue = React.useCallback(() => {
    try {
      setValue(defaultValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  return [value, setStoredValue, removeStoredValue];
};

// Hook for performance monitoring
export const usePerformance = () => {
  const [metrics, setMetrics] = React.useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
  });

  React.useEffect(() => {
    // Measure page load time
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, loadTime }));
    }

    // Measure memory usage (if available)
    if (performance.memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: performance.memory.usedJSHeapSize,
      }));
    }

    // Performance observer for render timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            setMetrics(prev => ({
              ...prev,
              renderTime: entry.duration,
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });

      return () => observer.disconnect();
    }
  }, []);

  const markStart = React.useCallback((name) => {
    performance.mark(`${name}-start`);
  }, []);

  const markEnd = React.useCallback((name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }, []);

  return {
    metrics,
    markStart,
    markEnd,
  };
};

// Development helpers
export const UIDevTools = () => {
  const ui = useUI();
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Expose UI context to window for debugging
      window.__LAWBUDDY_UI__ = ui;
      
      console.log('LawBuddy UI DevTools loaded. Access via window.__LAWBUDDY_UI__');
    }
  }, [ui]);

  return null;
};

export default UIContext;// src/contexts/UIContext.js - UI state management for loading, notifications, modals
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.js';
import { useWebSocket } from './WebSocketContext.js';
import errorService from '../services/errorService.js';

// Initial state
const initialState = {
  // Loading states
  globalLoading: false,
  loadingStates: {}, // { operationId: { loading: boolean, message: string } }
  
  // Notifications
  notifications: [], // { id, type, title, message, duration, actions, persistent }
  maxNotifications: 5,
  
  // Modals and dialogs
  modals: {}, // { modalId: { isOpen: boolean, data: any, options: any } }
  
  // Toasts (temporary notifications)
  toasts: [], // { id, type, message, duration, position }
  toastPosition: 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  
  // Global UI states
  sidebar: {
    isOpen: true,
    isPinned: false,
    width: 320,
  },
  
  theme: {
    mode: 'light', // 'light', 'dark', 'system'
    primaryColor: 'slate',
    fontSize: 'medium', // 'small', 'medium', 'large'
    density: 'comfortable', // 'compact', 'comfortable', 'spacious'
  },
  
  // Layout states
  layout: {
    headerHeight: 64,
    footerHeight: 0,
    contentPadding: 24,
    chatPanelWidth: 380,
    messageListHeight: 'auto',
  },
  
  // Focus and navigation
  focus: {
    currentElement: null,
    trapFocus: false,
    focusHistory: [],
  },
  
  // Accessibility
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    keyboardNavigation: false,
  },
  
  // Performance
  performance: {
    enableAnimations: true,
    lazyLoading: true,
    virtualScrolling: false,
    imageOptimization: true,
  },
  
  // User preferences
  preferences: {
    autoSaveInterval: 30000, // 30 seconds
    confirmBeforeDelete: true,
    showTutorials: true,
    compactView: false,
    soundEnabled: true,
  },
  
  // Error boundary
  errorBoundary: {
    hasError: false,
    error: null,
    errorInfo: null,
    fallbackComponent: null,
  },
  
  // Feature flags
  features: {
    betaFeatures: false,
    experimentalUI: false,
    advancedEditor: false,
    keyboardShortcuts: true,
  },
  
  // Connection indicators
  connectionStatus: {
    showIndicator: true,
    position: 'top-right',
    style: 'minimal', // 'minimal', 'detailed', 'hidden'
  },
};

// Action types
const UI_ACTIONS = {
  // Loading states
  SET_GLOBAL_LOADING: 'SET_GLOBAL_LOADING',
  SET_LOADING_STATE: 'SET_LOADING_STATE',
  CLEAR_LOADING_STATE: 'CLEAR_LOADING_STATE',
  CLEAR_ALL_LOADING: 'CLEAR_ALL_LOADING',
  
  // Notifications
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  UPDATE_NOTIFICATION: 'UPDATE_NOTIFICATION',
  
  // Toasts
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  CLEAR_TOASTS: 'CLEAR_TOASTS',
  SET_TOAST_POSITION: 'SET_TOAST_POSITION',
  
  // Modals
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',
  UPDATE_MODAL: 'UPDATE_MODAL',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',
  
  // Sidebar
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR_STATE: 'SET_SIDEBAR_STATE',
  TOGGLE_SIDEBAR_PIN: 'TOGGLE_SIDEBAR_PIN',
  SET_SIDEBAR_WIDTH: 'SET_SIDEBAR_WIDTH',
  
  // Theme
  SET_THEME_MODE: 'SET_THEME_MODE',
  SET_THEME_COLOR: 'SET_THEME_COLOR',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_DENSITY: 'SET_DENSITY',
  TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
  
  // Layout
  UPDATE_LAYOUT: 'UPDATE_LAYOUT',
  RESET_LAYOUT: 'RESET_LAYOUT',
  
  // Focus management
  SET_FOCUS: 'SET_FOCUS',
  CLEAR_FOCUS: 'CLEAR_FOCUS',
  TOGGLE_FOCUS_TRAP: 'TOGGLE_FOCUS_TRAP',
  ADD_TO_FOCUS_HISTORY: 'ADD_TO_FOCUS_HISTORY',
  
  // Accessibility
  UPDATE_ACCESSIBILITY: 'UPDATE_ACCESSIBILITY',
  TOGGLE_REDUCE_MOTION: 'TOGGLE_REDUCE_MOTION',
  ENABLE_SCREEN_READER: 'ENABLE_SCREEN_READER',
  ENABLE_KEYBOARD_NAV: 'ENABLE_KEYBOARD_NAV',
  
  // Performance
  UPDATE_PERFORMANCE: 'UPDATE_PERFORMANCE',
  TOGGLE_ANIMATIONS: 'TOGGLE_ANIMATIONS',
  
  // Preferences
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  RESET_PREFERENCES: 'RESET_PREFERENCES',
  
  // Error boundary
  SET_ERROR_BOUNDARY: 'SET_ERROR_BOUNDARY',
  CLEAR_ERROR_BOUNDARY: 'CLEAR_