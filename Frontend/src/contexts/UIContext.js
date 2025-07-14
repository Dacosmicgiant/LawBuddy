// src/contexts/UIContext.js - UI state management for loading, notifications, modals
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
  
  