// src/services/constants.js - API endpoints and configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    REFRESH: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    DEACTIVATE: '/api/v1/auth/deactivate',
  },
  
  // Chat Management
  CHATS: {
    BASE: '/api/v1/chats',
    DETAIL: (chatId) => `/api/v1/chats/${chatId}`,
    MESSAGES: (chatId) => `/api/v1/chats/${chatId}/messages`,
    MESSAGE_DETAIL: (chatId, messageId) => `/api/v1/chats/${chatId}/messages/${messageId}`,
    REGENERATE: (chatId, messageId) => `/api/v1/chats/${chatId}/messages/${messageId}/regenerate`,
    INTERACT: (chatId, messageId) => `/api/v1/chats/${chatId}/messages/${messageId}/interact`,
    BRANCHES: (chatId) => `/api/v1/chats/${chatId}/branches`,
    SWITCH_BRANCH: (chatId, branchId) => `/api/v1/chats/${chatId}/branches/${branchId}/switch`,
    ANALYTICS: (chatId) => `/api/v1/chats/${chatId}/analytics`,
    EXPORT: (chatId) => `/api/v1/chats/${chatId}/export`,
    SEARCH: '/api/v1/chats/search',
    STATISTICS: '/api/v1/chats/statistics',
  },
  
  // WebSocket
  WEBSOCKET: {
    CHAT: '/ws/chat',
    STATS: '/ws/stats',
    HEALTH: '/ws/health',
    BROADCAST: (chatId) => `/ws/broadcast/${chatId}`,
    NOTIFY: (userId) => `/ws/notify/${userId}`,
    CONNECTIONS: '/ws/connections',
    CHAT_USERS: (chatId) => `/ws/chat/${chatId}/users`,
    TYPING: (chatId) => `/ws/chat/${chatId}/typing`,
  },
  
  // System
  SYSTEM: {
    HEALTH: '/health',
    VERSION: '/version',
    LEGAL_INFO: '/api/v1/legal-info',
    STATS: '/api/v1/stats',
  },
};

// WebSocket Message Types
export const WS_MESSAGE_TYPES = {
  // Outgoing (Client -> Server)
  SEND_MESSAGE: 'send_message',
  REGENERATE_MESSAGE: 'regenerate_message',
  EDIT_MESSAGE: 'edit_message',
  CANCEL_GENERATION: 'cancel_generation',
  SWITCH_BRANCH: 'switch_branch',
  GET_BRANCHES: 'get_branches',
  GET_MESSAGES: 'get_messages',
  CREATE_CHAT: 'create_chat',
  GET_CHAT_LIST: 'get_chat_list',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  TYPING: 'typing',
  PING: 'ping',
  
  // Incoming (Server -> Client)
  CONNECTION_ESTABLISHED: 'connection_established',
  MESSAGE_SENT: 'message_sent',
  NEW_MESSAGE: 'new_message',
  AI_STREAM_START: 'ai_stream_start',
  AI_STREAM_CHUNK: 'ai_stream_chunk',
  AI_STREAM_COMPLETE: 'ai_stream_complete',
  AI_STREAM_ERROR: 'ai_stream_error',
  MESSAGE_REGENERATED: 'message_regenerated',
  MESSAGE_EDITED: 'message_edited',
  GENERATION_CANCELLED: 'generation_cancelled',
  BRANCH_SWITCHED: 'branch_switched',
  CONVERSATION_BRANCHES: 'conversation_branches',
  MESSAGES_LIST: 'messages_list',
  CHAT_CREATED: 'chat_created',
  CHAT_LIST: 'chat_list',
  JOINED_CHAT: 'joined_chat',
  TYPING_INDICATOR: 'typing_indicator',
  PONG: 'pong',
  ERROR: 'error',
  AI_UNAVAILABLE: 'ai_unavailable',
  NOTIFICATION: 'notification',
  BROADCAST: 'broadcast',
};

// Response Format Options
export const RESPONSE_FORMATS = {
  TEXT: 'text',
  MARKDOWN: 'markdown',
  JSON: 'json',
  CODE: 'code',
};

// Message Roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  DOCUMENT: 'document',
  CODE: 'code',
  MARKDOWN: 'markdown',
};

// Message Status
export const MESSAGE_STATUS = {
  PENDING: 'pending',
  STREAMING: 'streaming',
  COMPLETE: 'complete',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REGENERATING: 'regenerating',
};

// Chat Status
export const CHAT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
};

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  PROFESSIONAL: 'professional',
};

// Rate Limits
export const RATE_LIMITS = {
  GENERAL_REQUESTS_PER_MINUTE: 60,
  AI_REQUESTS_PER_MINUTE: 20,
  WEBSOCKET_MESSAGES_PER_MINUTE: 100,
};

// Error Types
export const ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  VALIDATION_ERROR: 'validation_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  SERVER_ERROR: 'server_error',
  WEBSOCKET_ERROR: 'websocket_error',
  AI_SERVICE_ERROR: 'ai_service_error',
  UNKNOWN_ERROR: 'unknown_error',
};

// Connection States
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// Export Formats
export const EXPORT_FORMATS = {
  JSON: 'json',
  MARKDOWN: 'markdown',
  TXT: 'txt',
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  CHAT_LIST: 'chat_list',
  CHAT_DETAIL: (chatId) => `chat_detail_${chatId}`,
  MESSAGES: (chatId) => `messages_${chatId}`,
  BRANCHES: (chatId) => `branches_${chatId}`,
  ANALYTICS: (chatId) => `analytics_${chatId}`,
  SEARCH_RESULTS: (query) => `search_${query}`,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'lawbuddy_access_token',
  REFRESH_TOKEN: 'lawbuddy_refresh_token',
  USER_PROFILE: 'lawbuddy_user_profile',
  CHAT_PREFERENCES: 'lawbuddy_chat_preferences',
  UI_SETTINGS: 'lawbuddy_ui_settings',
  OFFLINE_MESSAGES: 'lawbuddy_offline_messages',
  CONNECTION_ID: 'lawbuddy_connection_id',
};

// Feature Flags
export const FEATURES = {
  AI_STREAMING: true,
  CONVERSATION_BRANCHING: true,
  MESSAGE_REGENERATION: true,
  CHAT_EXPORT: true,
  ADVANCED_ANALYTICS: true,
  VOICE_MESSAGES: false,
  FILE_ATTACHMENTS: false,
  VIDEO_CALLS: false,
  SCREEN_SHARING: false,
};

// Legal Categories (from backend analysis)
export const LEGAL_CATEGORIES = [
  'traffic_violations',
  'fines_penalties', 
  'license_registration',
  'insurance',
  'accidents',
  'documents',
  'police_procedures',
  'court_legal',
];

// Common HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// WebSocket Ready States
export const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// Timeouts and Intervals
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  WEBSOCKET_CONNECT: 10000, // 10 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  RECONNECT_INTERVAL: 5000, // 5 seconds
  TYPING_DEBOUNCE: 300, // 300ms
  SEARCH_DEBOUNCE: 500, // 500ms
  AUTO_SAVE_INTERVAL: 10000, // 10 seconds
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  MESSAGE_MAX_LENGTH: 10000,
  CHAT_TITLE_MAX_LENGTH: 100,
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
};

// UI Constants
export const UI = {
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1200,
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 64,
  MESSAGE_INPUT_MAX_HEIGHT: 200,
  TOAST_DURATION: 5000,
  LOADING_DELAY: 300,
};

// Theme Colors (integrating with existing Colors.jsx)
export const THEME_COLORS = {
  PRIMARY: 'slate',
  SECONDARY: 'amber',
  SUCCESS: 'green',
  WARNING: 'yellow',
  ERROR: 'red',
  INFO: 'blue',
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  WS_MESSAGE_TYPES,
  RESPONSE_FORMATS,
  MESSAGE_ROLES,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  CHAT_STATUS,
  SUBSCRIPTION_TIERS,
  RATE_LIMITS,
  ERROR_TYPES,
  CONNECTION_STATES,
  EXPORT_FORMATS,
  PAGINATION,
  CACHE_KEYS,
  STORAGE_KEYS,
  FEATURES,
  LEGAL_CATEGORIES,
  HTTP_STATUS,
  WS_READY_STATES,
  TIMEOUTS,
  VALIDATION,
  UI,
  THEME_COLORS,
};