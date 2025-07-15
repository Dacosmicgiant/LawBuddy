// src/contexts/WebSocketContext.js - Complete WebSocket connection state management
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import websocketService from '../services/websocketService.js';
import errorService from '../services/errorService.js';
import { useAuth } from './AuthContext.js';
import { 
  CONNECTION_STATES, 
  WS_MESSAGE_TYPES, 
  MESSAGE_ROLES,
  MESSAGE_STATUS 
} from '../services/constants.js';

// Initial state
const initialState = {
  // Connection status
  isConnected: false,
  connectionState: CONNECTION_STATES.DISCONNECTED,
  connectionId: null,
  
  // Connection health
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  lastConnected: null,
  lastDisconnected: null,
  connectionUptime: 0,
  
  // Error handling
  lastError: null,
  connectionErrors: [],
  
  // Chat room management
  currentChatRoom: null,
  activeUsers: {}, // { chatId: [userIds] }
  userPresence: {}, // { userId: { status, lastSeen } }
  
  // Real-time indicators
  typingUsers: {}, // { chatId: { userId: timestamp } }
  activeConnections: {}, // { userId: connectionCount }
  
  // Message queuing
  messageQueue: [],
  pendingAcknowledgments: new Map(), // messageId -> timeout
  
  // Performance metrics
  messagesSent: 0,
  messagesReceived: 0,
  averageLatency: 0,
  latencyHistory: [],
  
  // Features availability
  features: {
    realTimeMessaging: true,
    typingIndicators: true,
    presenceTracking: true,
    messageAcknowledgments: true,
    fileSharing: false,
    voiceMessages: false,
  },
  
  // Advanced features
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    permission: 'default', // 'granted', 'denied', 'default'
  },
  
  // Connection statistics
  statistics: {
    totalConnections: 0,
    totalReconnections: 0,
    totalMessages: 0,
    totalErrors: 0,
    sessionDuration: 0,
    dataTransferred: 0,
  },
};

// Action types
const WS_ACTIONS = {
  // Connection lifecycle
  CONNECTION_INIT: 'CONNECTION_INIT',
  CONNECTION_CONNECTING: 'CONNECTION_CONNECTING',
  CONNECTION_CONNECTED: 'CONNECTION_CONNECTED',
  CONNECTION_DISCONNECTED: 'CONNECTION_DISCONNECTED',
  CONNECTION_RECONNECTING: 'CONNECTION_RECONNECTING',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  
  // Room management
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  ROOM_USERS_UPDATED: 'ROOM_USERS_UPDATED',
  
  // User presence
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  PRESENCE_UPDATED: 'PRESENCE_UPDATED',
  
  // Typing indicators
  TYPING_START: 'TYPING_START',
  TYPING_STOP: 'TYPING_STOP',
  TYPING_TIMEOUT: 'TYPING_TIMEOUT',
  
  // Message handling
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_ACK_RECEIVED: 'MESSAGE_ACK_RECEIVED',
  MESSAGE_TIMEOUT: 'MESSAGE_TIMEOUT',
  
  // Streaming
  STREAM_START: 'STREAM_START',
  STREAM_CHUNK: 'STREAM_CHUNK',
  STREAM_COMPLETE: 'STREAM_COMPLETE',
  STREAM_ERROR: 'STREAM_ERROR',
  
  // Queue management
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
  CLEAR_QUEUE: 'CLEAR_QUEUE',
  PROCESS_QUEUE: 'PROCESS_QUEUE',
  
  // Error handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_CONNECTION_ERROR: 'ADD_CONNECTION_ERROR',
  
  // Performance tracking
  UPDATE_LATENCY: 'UPDATE_LATENCY',
  UPDATE_STATISTICS: 'UPDATE_STATISTICS',
  
  // Notifications
  UPDATE_NOTIFICATION_SETTINGS: 'UPDATE_NOTIFICATION_SETTINGS',
  REQUEST_NOTIFICATION_PERMISSION: 'REQUEST_NOTIFICATION_PERMISSION',
  
  // Features
  UPDATE_FEATURES: 'UPDATE_FEATURES',
  FEATURE_ENABLED: 'FEATURE_ENABLED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
};

// Helper functions
const calculateLatency = (sentTime, receivedTime) => {
  return receivedTime - sentTime;
};

const updateLatencyHistory = (history, newLatency, maxSize = 50) => {
  const updated = [...history, newLatency];
  return updated.length > maxSize ? updated.slice(-maxSize) : updated;
};

const calculateAverageLatency = (history) => {
  if (history.length === 0) return 0;
  return Math.round(history.reduce((sum, latency) => sum + latency, 0) / history.length);
};

// WebSocket reducer
const websocketReducer = (state, action) => {
  switch (action.type) {
    case WS_ACTIONS.CONNECTION_INIT:
      return {
        ...state,
        connectionState: CONNECTION_STATES.CONNECTING,
        lastError: null,
      };

    case WS_ACTIONS.CONNECTION_CONNECTING:
      return {
        ...state,
        connectionState: CONNECTION_STATES.CONNECTING,
        lastError: null,
      };

    case WS_ACTIONS.CONNECTION_CONNECTED:
      const connectionTime = new Date();
      return {
        ...state,
        isConnected: true,
        connectionState: CONNECTION_STATES.CONNECTED,
        connectionId: action.payload.connectionId,
        lastConnected: connectionTime,
        reconnectAttempts: 0,
        lastError: null,
        statistics: {
          ...state.statistics,
          totalConnections: state.statistics.totalConnections + 1,
        },
      };

    case WS_ACTIONS.CONNECTION_DISCONNECTED:
      const disconnectionTime = new Date();
      const sessionDuration = state.lastConnected 
        ? disconnectionTime.getTime() - state.lastConnected.getTime()
        : 0;

      return {
        ...state,
        isConnected: false,
        connectionState: CONNECTION_STATES.DISCONNECTED,
        connectionId: null,
        lastDisconnected: disconnectionTime,
        currentChatRoom: null,
        activeUsers: {},
        typingUsers: {},
        statistics: {
          ...state.statistics,
          sessionDuration: state.statistics.sessionDuration + sessionDuration,
        },
      };

    case WS_ACTIONS.CONNECTION_RECONNECTING:
      return {
        ...state,
        connectionState: CONNECTION_STATES.RECONNECTING,
        reconnectAttempts: action.payload.attempt,
        statistics: {
          ...state.statistics,
          totalReconnections: state.statistics.totalReconnections + 1,
        },
      };

    case WS_ACTIONS.CONNECTION_ERROR:
      const connectionError = {
        error: action.payload.error,
        timestamp: new Date(),
        attempt: state.reconnectAttempts,
      };

      return {
        ...state,
        connectionState: CONNECTION_STATES.ERROR,
        lastError: action.payload.error,
        connectionErrors: [...state.connectionErrors.slice(-9), connectionError], // Keep last 10 errors
        statistics: {
          ...state.statistics,
          totalErrors: state.statistics.totalErrors + 1,
        },
      };

    case WS_ACTIONS.CONNECTION_TIMEOUT:
      return {
        ...state,
        connectionState: CONNECTION_STATES.ERROR,
        lastError: 'Connection timeout',
      };

    case WS_ACTIONS.JOIN_ROOM:
      return {
        ...state,
        currentChatRoom: action.payload.chatId,
      };

    case WS_ACTIONS.LEAVE_ROOM:
      return {
        ...state,
        currentChatRoom: null,
        activeUsers: {
          ...state.activeUsers,
          [action.payload.chatId]: [],
        },
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: {},
        },
      };

    case WS_ACTIONS.ROOM_USERS_UPDATED:
      return {
        ...state,
        activeUsers: {
          ...state.activeUsers,
          [action.payload.chatId]: action.payload.users,
        },
      };

    case WS_ACTIONS.USER_JOINED:
      const { chatId: joinedChatId, userId: joinedUserId } = action.payload;
      const currentUsers = state.activeUsers[joinedChatId] || [];
      
      return {
        ...state,
        activeUsers: {
          ...state.activeUsers,
          [joinedChatId]: [...currentUsers.filter(id => id !== joinedUserId), joinedUserId],
        },
        userPresence: {
          ...state.userPresence,
          [joinedUserId]: {
            status: 'online',
            lastSeen: new Date(),
          },
        },
      };

    case WS_ACTIONS.USER_LEFT:
      const { chatId: leftChatId, userId: leftUserId } = action.payload;
      const usersAfterLeaving = (state.activeUsers[leftChatId] || []).filter(id => id !== leftUserId);
      
      return {
        ...state,
        activeUsers: {
          ...state.activeUsers,
          [leftChatId]: usersAfterLeaving,
        },
        userPresence: {
          ...state.userPresence,
          [leftUserId]: {
            status: 'offline',
            lastSeen: new Date(),
          },
        },
      };

    case WS_ACTIONS.PRESENCE_UPDATED:
      return {
        ...state,
        userPresence: {
          ...state.userPresence,
          [action.payload.userId]: {
            status: action.payload.status,
            lastSeen: action.payload.lastSeen,
          },
        },
      };

    case WS_ACTIONS.TYPING_START:
      const { chatId: typingChatId, userId: typingUserId } = action.payload;
      
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [typingChatId]: {
            ...state.typingUsers[typingChatId],
            [typingUserId]: new Date(),
          },
        },
      };

    case WS_ACTIONS.TYPING_STOP:
      const { chatId: stopTypingChatId, userId: stopTypingUserId } = action.payload;
      const updatedTypingUsers = { ...state.typingUsers };
      
      if (updatedTypingUsers[stopTypingChatId]) {
        delete updatedTypingUsers[stopTypingChatId][stopTypingUserId];
        
        // Clean up empty chat entries
        if (Object.keys(updatedTypingUsers[stopTypingChatId]).length === 0) {
          delete updatedTypingUsers[stopTypingChatId];
        }
      }

      return {
        ...state,
        typingUsers: updatedTypingUsers,
      };

    case WS_ACTIONS.MESSAGE_SENT:
      return {
        ...state,
        messagesSent: state.messagesSent + 1,
        statistics: {
          ...state.statistics,
          totalMessages: state.statistics.totalMessages + 1,
        },
      };

    case WS_ACTIONS.MESSAGE_RECEIVED:
      return {
        ...state,
        messagesReceived: state.messagesReceived + 1,
      };

    case WS_ACTIONS.MESSAGE_ACK_RECEIVED:
      const { messageId } = action.payload;
      const newPendingAcks = new Map(state.pendingAcknowledgments);
      
      if (newPendingAcks.has(messageId)) {
        const sentTime = newPendingAcks.get(messageId);
        const latency = calculateLatency(sentTime, Date.now());
        const updatedHistory = updateLatencyHistory(state.latencyHistory, latency);
        
        newPendingAcks.delete(messageId);

        return {
          ...state,
          pendingAcknowledgments: newPendingAcks,
          latencyHistory: updatedHistory,
          averageLatency: calculateAverageLatency(updatedHistory),
        };
      }

      return state;

    case WS_ACTIONS.ADD_TO_QUEUE:
      return {
        ...state,
        messageQueue: [...state.messageQueue, action.payload.message],
      };

    case WS_ACTIONS.REMOVE_FROM_QUEUE:
      return {
        ...state,
        messageQueue: state.messageQueue.filter(msg => msg.id !== action.payload.messageId),
      };

    case WS_ACTIONS.CLEAR_QUEUE:
      return {
        ...state,
        messageQueue: [],
      };

    case WS_ACTIONS.UPDATE_LATENCY:
      const newLatency = action.payload.latency;
      const newHistory = updateLatencyHistory(state.latencyHistory, newLatency);
      
      return {
        ...state,
        latencyHistory: newHistory,
        averageLatency: calculateAverageLatency(newHistory),
      };

    case WS_ACTIONS.UPDATE_STATISTICS:
      return {
        ...state,
        statistics: {
          ...state.statistics,
          ...action.payload.updates,
        },
      };

    case WS_ACTIONS.UPDATE_NOTIFICATION_SETTINGS:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          ...action.payload.settings,
        },
      };

    case WS_ACTIONS.REQUEST_NOTIFICATION_PERMISSION:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          permission: action.payload.permission,
        },
      };

    case WS_ACTIONS.UPDATE_FEATURES:
      return {
        ...state,
        features: {
          ...state.features,
          ...action.payload.features,
        },
      };

    case WS_ACTIONS.SET_ERROR:
      return {
        ...state,
        lastError: action.payload.error,
      };

    case WS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        lastError: null,
      };

    case WS_ACTIONS.ADD_CONNECTION_ERROR:
      const newError = {
        error: action.payload.error,
        timestamp: new Date(),
        context: action.payload.context,
      };

      return {
        ...state,
        connectionErrors: [...state.connectionErrors.slice(-9), newError],
      };

    default:
      return state;
  }
};

// Create context
const WebSocketContext = createContext();

// Provider component
export const WebSocketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(websocketReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Connect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !state.isConnected && state.connectionState !== CONNECTION_STATES.CONNECTING) {
      connectWebSocket();
    } else if (!isAuthenticated && state.isConnected) {
      disconnectWebSocket();
    }
  }, [isAuthenticated]);

  // Set up WebSocket event listeners
  useEffect(() => {
    // Connection events
    const unsubscribeConnection = websocketService.on('connection', (event) => {
      switch (event.type) {
        case 'connected':
          dispatch({
            type: WS_ACTIONS.CONNECTION_CONNECTED,
            payload: { connectionId: event.connectionId },
          });
          break;
        case 'state_change':
          handleConnectionStateChange(event.state, event.previousState);
          break;
      }
    });

    // Message events
    const unsubscribeMessage = websocketService.on('message', (data) => {
      handleWebSocketMessage(data);
    });

    // Specific message type listeners
    const unsubscribeAIStreamChunk = websocketService.on(WS_MESSAGE_TYPES.AI_STREAM_CHUNK, (data) => {
      handleStreamChunk(data);
    });

    const unsubscribeAIStreamComplete = websocketService.on(WS_MESSAGE_TYPES.AI_STREAM_COMPLETE, (data) => {
      handleStreamComplete(data);
    });

    const unsubscribeNewMessage = websocketService.on(WS_MESSAGE_TYPES.NEW_MESSAGE, (data) => {
      handleNewMessage(data);
    });

    const unsubscribeTypingIndicator = websocketService.on(WS_MESSAGE_TYPES.TYPING_INDICATOR, (data) => {
      handleTypingIndicator(data);
    });

    const unsubscribeError = websocketService.on(WS_MESSAGE_TYPES.ERROR, (data) => {
      handleWebSocketError(data);
    });

    // Error events
    const unsubscribeErrorEvent = websocketService.on('error', (error) => {
      dispatch({
        type: WS_ACTIONS.CONNECTION_ERROR,
        payload: { error: error.message },
      });
    });

    return () => {
      unsubscribeConnection();
      unsubscribeMessage();
      unsubscribeAIStreamChunk();
      unsubscribeAIStreamComplete();
      unsubscribeNewMessage();
      unsubscribeTypingIndicator();
      unsubscribeError();
      unsubscribeErrorEvent();
    };
  }, []);

  // Auto-cleanup typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const TYPING_TIMEOUT = 3000; // 3 seconds

      Object.entries(state.typingUsers).forEach(([chatId, typingUsersInChat]) => {
        Object.entries(typingUsersInChat).forEach(([userId, timestamp]) => {
          if (now - new Date(timestamp).getTime() > TYPING_TIMEOUT) {
            dispatch({
              type: WS_ACTIONS.TYPING_STOP,
              payload: { chatId, userId },
            });
          }
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.typingUsers]);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && state.notifications.permission === 'default') {
      requestNotificationPermission();
    }
  }, []);

  // Connection management functions
  const connectWebSocket = useCallback(async (chatId = null) => {
    if (state.connectionState === CONNECTION_STATES.CONNECTING) return;

    dispatch({ type: WS_ACTIONS.CONNECTION_INIT });

    try {
      await websocketService.connect(chatId);
    } catch (error) {
      dispatch({
        type: WS_ACTIONS.CONNECTION_ERROR,
        payload: { error: error.message },
      });
    }
  }, [state.connectionState]);

  const disconnectWebSocket = useCallback(() => {
    websocketService.disconnect();
    dispatch({ type: WS_ACTIONS.CONNECTION_DISCONNECTED });
  }, []);

  const reconnectWebSocket = useCallback(async () => {
    disconnectWebSocket();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await connectWebSocket(state.currentChatRoom);
  }, [connectWebSocket, disconnectWebSocket, state.currentChatRoom]);

  // Chat room management
  const joinChatRoom = useCallback(async (chatId) => {
    if (!state.isConnected) return;

    try {
      // Leave current room if any
      if (state.currentChatRoom && state.currentChatRoom !== chatId) {
        await websocketService.leaveChat(state.currentChatRoom);
        dispatch({
          type: WS_ACTIONS.LEAVE_ROOM,
          payload: { chatId: state.currentChatRoom },
        });
      }

      // Join new room
      await websocketService.joinChat(chatId);
      dispatch({
        type: WS_ACTIONS.JOIN_ROOM,
        payload: { chatId },
      });

    } catch (error) {
      dispatch({
        type: WS_ACTIONS.SET_ERROR,
        payload: { error: error.message },
      });
    }
  }, [state.isConnected, state.currentChatRoom]);

  const leaveChatRoom = useCallback(async (chatId) => {
    if (!state.isConnected) return;

    try {
      await websocketService.leaveChat(chatId);
      dispatch({
        type: WS_ACTIONS.LEAVE_ROOM,
        payload: { chatId },
      });
    } catch (error) {
      dispatch({
        type: WS_ACTIONS.SET_ERROR,
        payload: { error: error.message },
      });
    }
  }, [state.isConnected]);

  // Message handling
  const sendMessage = useCallback(async (chatId, content, options = {}) => {
    if (!state.isConnected) {
      // Queue message for later
      const queuedMessage = {
        id: `queued_${Date.now()}`,
        chatId,
        content,
        options,
        timestamp: new Date(),
      };

      dispatch({
        type: WS_ACTIONS.ADD_TO_QUEUE,
        payload: { message: queuedMessage },
      });

      return { success: false, queued: true };
    }

    try {
      const messageId = websocketService.sendChatMessage(chatId, content, options);
      
      dispatch({
        type: WS_ACTIONS.MESSAGE_SENT,
        payload: { messageId, chatId, content },
      });

      // Track acknowledgment
      state.pendingAcknowledgments.set(messageId, Date.now());

      return { success: true, messageId };
    } catch (error) {
      dispatch({
        type: WS_ACTIONS.SET_ERROR,
        payload: { error: error.message },
      });

      throw error;
    }
  }, [state.isConnected, state.pendingAcknowledgments]);

  const regenerateMessage = useCallback(async (chatId, messageId, options = {}) => {
    if (!state.isConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      const requestId = websocketService.regenerateMessage(chatId, messageId, options);
      return { success: true, requestId };
    } catch (error) {
      throw error;
    }
  }, [state.isConnected]);

  // Typing indicators
  const sendTypingIndicator = useCallback(async (chatId, isTyping) => {
    if (!state.isConnected || !state.features.typingIndicators) return;

    try {
      websocketService.sendTyping(chatId, isTyping);
      
      // Update local state
      if (isTyping) {
        dispatch({
          type: WS_ACTIONS.TYPING_START,
          payload: { chatId, userId: user?.id },
        });
      } else {
        dispatch({
          type: WS_ACTIONS.TYPING_STOP,
          payload: { chatId, userId: user?.id },
        });
      }
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [state.isConnected, state.features.typingIndicators, user?.id]);

  // Event handlers
  const handleConnectionStateChange = useCallback((newState, previousState) => {
    switch (newState) {
      case CONNECTION_STATES.CONNECTING:
        dispatch({ type: WS_ACTIONS.CONNECTION_CONNECTING });
        break;
      case CONNECTION_STATES.CONNECTED:
        // Process queued messages
        if (state.messageQueue.length > 0) {
          processMessageQueue();
        }
        break;
      case CONNECTION_STATES.DISCONNECTED:
        dispatch({ type: WS_ACTIONS.CONNECTION_DISCONNECTED });
        break;
      case CONNECTION_STATES.RECONNECTING:
        dispatch({
          type: WS_ACTIONS.CONNECTION_RECONNECTING,
          payload: { attempt: websocketService.reconnectAttempts },
        });
        break;
      case CONNECTION_STATES.ERROR:
        dispatch({
          type: WS_ACTIONS.CONNECTION_ERROR,
          payload: { error: 'Connection error' },
        });
        break;
    }
  }, [state.messageQueue]);

  const handleWebSocketMessage = useCallback((data) => {
    dispatch({
      type: WS_ACTIONS.MESSAGE_RECEIVED,
      payload: { data },
    });

    // Show notification if enabled and not in current chat
    if (
      state.notifications.enabled && 
      state.notifications.permission === 'granted' &&
      data.chat_session_id !== state.currentChatRoom
    ) {
      showNotification(data);
    }
  }, [state.notifications, state.currentChatRoom]);

  const handleStreamChunk = useCallback((data) => {
    dispatch({
      type: WS_ACTIONS.STREAM_CHUNK,
      payload: { data },
    });
  }, []);

  const handleStreamComplete = useCallback((data) => {
    dispatch({
      type: WS_ACTIONS.STREAM_COMPLETE,
      payload: { data },
    });
  }, []);

  const handleNewMessage = useCallback((data) => {
    dispatch({
      type: WS_ACTIONS.MESSAGE_RECEIVED,
      payload: { data },
    });
  }, []);

  const handleTypingIndicator = useCallback((data) => {
    const { user_id: userId, is_typing: isTyping, chat_id: chatId } = data.metadata || {};
    
    if (!userId || !chatId) return;

    if (isTyping) {
      dispatch({
        type: WS_ACTIONS.TYPING_START,
        payload: { chatId, userId },
      });
    } else {
      dispatch({
        type: WS_ACTIONS.TYPING_STOP,
        payload: { chatId, userId },
      });
    }
  }, []);

  const handleWebSocketError = useCallback((data) => {
    const error = data.error || 'Unknown WebSocket error';
    
    dispatch({
      type: WS_ACTIONS.SET_ERROR,
      payload: { error },
    });

    // Log error with context
    errorService.handleError(new Error(error), {
      context: { source: 'websocket', data },
      showNotification: false,
    });
  }, []);

  // Utility functions
  const processMessageQueue = useCallback(async () => {
    const queue = [...state.messageQueue];
    dispatch({ type: WS_ACTIONS.CLEAR_QUEUE });

    for (const queuedMessage of queue) {
      try {
        await sendMessage(queuedMessage.chatId, queuedMessage.content, queuedMessage.options);
      } catch (error) {
        // Re-queue failed messages
        dispatch({
          type: WS_ACTIONS.ADD_TO_QUEUE,
          payload: { message: queuedMessage },
        });
      }
    }
  }, [state.messageQueue, sendMessage]);

  const showNotification = useCallback((messageData) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const notification = new Notification('New Message - LawBuddy', {
      body: messageData.content?.substring(0, 100) + (messageData.content?.length > 100 ? '...' : ''),
      icon: '/favicon.ico',
      tag: `chat-${messageData.chat_session_id}`,
      requireInteraction: false,
      silent: !state.notifications.sound,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate to chat if needed
      if (messageData.chat_session_id !== state.currentChatRoom) {
        // This would trigger navigation in a real app
        console.log('Navigate to chat:', messageData.chat_session_id);
      }
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }, [state.notifications, state.currentChatRoom]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      dispatch({
        type: WS_ACTIONS.REQUEST_NOTIFICATION_PERMISSION,
        payload: { permission: 'denied' },
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      dispatch({
        type: WS_ACTIONS.REQUEST_NOTIFICATION_PERMISSION,
        payload: { permission },
      });
    } catch (error) {
      dispatch({
        type: WS_ACTIONS.REQUEST_NOTIFICATION_PERMISSION,
        payload: { permission: 'denied' },
      });
    }
  }, []);

  const updateNotificationSettings = useCallback((settings) => {
    dispatch({
      type: WS_ACTIONS.UPDATE_NOTIFICATION_SETTINGS,
      payload: { settings },
    });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: WS_ACTIONS.CLEAR_ERROR });
  }, []);

  const getConnectionHealth = useCallback(() => {
    const isHealthy = state.isConnected && state.lastError === null;
    const uptime = state.lastConnected ? Date.now() - state.lastConnected.getTime() : 0;
    
    return {
      isHealthy,
      connectionState: state.connectionState,
      uptime,
      reconnectAttempts: state.reconnectAttempts,
      averageLatency: state.averageLatency,
      lastError: state.lastError,
      queuedMessages: state.messageQueue.length,
    };
  }, [state]);

  const getPresenceInfo = useCallback((userId) => {
    return state.userPresence[userId] || null;
  }, [state.userPresence]);

  const getTypingUsersInChat = useCallback((chatId) => {
    const typingData = state.typingUsers[chatId] || {};
    return Object.keys(typingData);
  }, [state.typingUsers]);

  const getActiveUsersInChat = useCallback((chatId) => {
    return state.activeUsers[chatId] || [];
  }, [state.activeUsers]);

  const isUserOnline = useCallback((userId) => {
    const presence = getPresenceInfo(userId);
    return presence?.status === 'online';
  }, [getPresenceInfo]);

  const getConnectionStatistics = useCallback(() => {
    const currentUptime = state.lastConnected ? Date.now() - state.lastConnected.getTime() : 0;
    
    return {
      ...state.statistics,
      currentUptime,
      averageLatency: state.averageLatency,
      queuedMessages: state.messageQueue.length,
      pendingAcks: state.pendingAcknowledgments.size,
      connectionHealth: getConnectionHealth().isHealthy ? 'healthy' : 'unhealthy',
    };
  }, [state, getConnectionHealth]);

  // Context value
  const contextValue = {
    // Connection state
    ...state,
    
    // Connection management
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    reconnect: reconnectWebSocket,
    
    // Room management
    joinChatRoom,
    leaveChatRoom,
    
    // Messaging
    sendMessage,
    regenerateMessage,
    sendTypingIndicator,
    
    // Notifications
    requestNotificationPermission,
    updateNotificationSettings,
    
    // Utility functions
    clearError,
    getConnectionHealth,
    getPresenceInfo,
    getTypingUsersInChat,
    getActiveUsersInChat,
    isUserOnline,
    getConnectionStatistics,
    
    // Computed values
    isOnline: state.isConnected,
    isConnecting: state.connectionState === CONNECTION_STATES.CONNECTING,
    isReconnecting: state.connectionState === CONNECTION_STATES.RECONNECTING,
    hasError: !!state.lastError,
    canSendMessages: state.isConnected,
    hasQueuedMessages: state.messageQueue.length > 0,
    connectionQuality: state.averageLatency < 100 ? 'excellent' : 
                     state.averageLatency < 300 ? 'good' : 
                     state.averageLatency < 500 ? 'fair' : 'poor',
    typingUsersInCurrentChat: getTypingUsersInChat(state.currentChatRoom),
    activeUsersInCurrentChat: getActiveUsersInChat(state.currentChatRoom),
    isCurrentChatActive: (state.activeUsers[state.currentChatRoom] || []).length > 1,
    notificationPermission: state.notifications.permission,
    canShowNotifications: state.notifications.enabled && state.notifications.permission === 'granted',
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};

// Hook for connection status with automatic reconnection
export const useConnectionStatus = () => {
  const { 
    isConnected, 
    connectionState, 
    lastError, 
    reconnect, 
    getConnectionHealth 
  } = useWebSocket();

  const [autoReconnect, setAutoReconnect] = React.useState(true);

  React.useEffect(() => {
    if (!isConnected && autoReconnect && connectionState === CONNECTION_STATES.ERROR) {
      const timeout = setTimeout(() => {
        reconnect();
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(timeout);
    }
  }, [isConnected, autoReconnect, connectionState, reconnect]);

  return {
    isConnected,
    connectionState,
    lastError,
    autoReconnect,
    setAutoReconnect,
    connectionHealth: getConnectionHealth(),
    canRetry: connectionState === CONNECTION_STATES.ERROR,
  };
};

// Hook for real-time typing indicators
export const useTypingIndicators = (chatId) => {
  const { 
    sendTypingIndicator, 
    getTypingUsersInChat,
    features 
  } = useWebSocket();

  const [isTyping, setIsTyping] = React.useState(false);
  const typingTimeoutRef = React.useRef(null);

  const startTyping = React.useCallback(() => {
    if (!features.typingIndicators) return;

    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(chatId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(chatId, false);
    }, 1000);
  }, [chatId, isTyping, sendTypingIndicator, features.typingIndicators]);

  const stopTyping = React.useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(chatId, false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [chatId, isTyping, sendTypingIndicator]);

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    startTyping,
    stopTyping,
    typingUsers: getTypingUsersInChat(chatId),
    isEnabled: features.typingIndicators,
  };
};

// Hook for presence tracking
export const usePresence = () => {
  const { 
    userPresence, 
    activeUsers, 
    getPresenceInfo, 
    isUserOnline,
    features 
  } = useWebSocket();

  const getUsersInChat = React.useCallback((chatId) => {
    const users = activeUsers[chatId] || [];
    return users.map(userId => ({
      userId,
      presence: getPresenceInfo(userId),
      isOnline: isUserOnline(userId),
    }));
  }, [activeUsers, getPresenceInfo, isUserOnline]);

  const getOnlineCount = React.useCallback((chatId) => {
    const users = activeUsers[chatId] || [];
    return users.filter(userId => isUserOnline(userId)).length;
  }, [activeUsers, isUserOnline]);

  return {
    userPresence,
    activeUsers,
    getUsersInChat,
    getOnlineCount,
    isUserOnline,
    isEnabled: features.presenceTracking,
  };
};

// Hook for WebSocket performance monitoring
export const useWebSocketPerformance = () => {
  const { 
    averageLatency, 
    latencyHistory, 
    connectionQuality,
    getConnectionStatistics,
    messagesSent,
    messagesReceived,
  } = useWebSocket();

  const [performanceMetrics, setPerformanceMetrics] = React.useState({
    latency: {
      current: 0,
      average: 0,
      min: 0,
      max: 0,
    },
    throughput: {
      sentPerSecond: 0,
      receivedPerSecond: 0,
    },
    reliability: {
      uptime: 0,
      errorRate: 0,
      reconnectCount: 0,
    },
  });

  React.useEffect(() => {
    const calculateMetrics = () => {
      const stats = getConnectionStatistics();
      const currentLatency = latencyHistory[latencyHistory.length - 1] || 0;
      const minLatency = latencyHistory.length > 0 ? Math.min(...latencyHistory) : 0;
      const maxLatency = latencyHistory.length > 0 ? Math.max(...latencyHistory) : 0;
      
      // Calculate throughput (messages per second over last minute)
      const sessionDuration = stats.currentUptime / 1000; // in seconds
      const sentPerSecond = sessionDuration > 0 ? messagesSent / sessionDuration : 0;
      const receivedPerSecond = sessionDuration > 0 ? messagesReceived / sessionDuration : 0;
      
      // Calculate error rate
      const totalOperations = stats.totalMessages + stats.totalErrors;
      const errorRate = totalOperations > 0 ? (stats.totalErrors / totalOperations) * 100 : 0;

      setPerformanceMetrics({
        latency: {
          current: currentLatency,
          average: averageLatency,
          min: minLatency,
          max: maxLatency,
        },
        throughput: {
          sentPerSecond: Math.round(sentPerSecond * 100) / 100,
          receivedPerSecond: Math.round(receivedPerSecond * 100) / 100,
        },
        reliability: {
          uptime: Math.round((stats.currentUptime / 1000) * 100) / 100, // seconds
          errorRate: Math.round(errorRate * 100) / 100,
          reconnectCount: stats.totalReconnections,
        },
      });
    };

    const interval = setInterval(calculateMetrics, 5000); // Update every 5 seconds
    calculateMetrics(); // Initial calculation

    return () => clearInterval(interval);
  }, [latencyHistory, averageLatency, getConnectionStatistics, messagesSent, messagesReceived]);

  return {
    metrics: performanceMetrics,
    connectionQuality,
    isPerformant: connectionQuality === 'excellent' || connectionQuality === 'good',
    hasLatencyIssues: averageLatency > 500,
    hasReliabilityIssues: performanceMetrics.reliability.errorRate > 5,
  };
};

// Hook for real-time notifications
export const useWebSocketNotifications = () => {
  const {
    notifications,
    updateNotificationSettings,
    requestNotificationPermission,
    notificationPermission,
    canShowNotifications,
  } = useWebSocket();

  const [notificationQueue, setNotificationQueue] = React.useState([]);

  const showNotification = React.useCallback((title, body, options = {}) => {
    if (!canShowNotifications) {
      // Queue notification for when permission is granted
      setNotificationQueue(prev => [...prev, { title, body, options }]);
      return null;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      silent: !notifications.sound,
      requireInteraction: options.persistent || false,
      ...options,
    });

    // Auto-close after specified duration
    if (options.duration && options.duration > 0) {
      setTimeout(() => notification.close(), options.duration);
    }

    return notification;
  }, [canShowNotifications, notifications.sound]);

  const processNotificationQueue = React.useCallback(() => {
    if (canShowNotifications && notificationQueue.length > 0) {
      notificationQueue.forEach(({ title, body, options }) => {
        showNotification(title, body, options);
      });
      setNotificationQueue([]);
    }
  }, [canShowNotifications, notificationQueue, showNotification]);

  // Process queued notifications when permission is granted
  React.useEffect(() => {
    processNotificationQueue();
  }, [processNotificationQueue]);

  const enableNotifications = React.useCallback(async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      updateNotificationSettings({ enabled: true });
      processNotificationQueue();
    }
    return permission;
  }, [requestNotificationPermission, updateNotificationSettings, processNotificationQueue]);

  const disableNotifications = React.useCallback(() => {
    updateNotificationSettings({ enabled: false });
  }, [updateNotificationSettings]);

  const toggleSound = React.useCallback(() => {
    updateNotificationSettings({ sound: !notifications.sound });
  }, [notifications.sound, updateNotificationSettings]);

  return {
    notifications,
    notificationPermission,
    canShowNotifications,
    queuedNotifications: notificationQueue.length,
    showNotification,
    enableNotifications,
    disableNotifications,
    toggleSound,
    updateNotificationSettings,
  };
};

// Hook for connection diagnostics
export const useWebSocketDiagnostics = () => {
  const {
    connectionState,
    connectionErrors,
    lastError,
    getConnectionHealth,
    getConnectionStatistics,
    reconnectAttempts,
    maxReconnectAttempts,
  } = useWebSocket();

  const [diagnostics, setDiagnostics] = React.useState({
    status: 'unknown',
    issues: [],
    recommendations: [],
    lastCheck: null,
  });

  const runDiagnostics = React.useCallback(() => {
    const health = getConnectionHealth();
    const stats = getConnectionStatistics();
    const issues = [];
    const recommendations = [];

    // Check connection status
    if (!health.isHealthy) {
      issues.push({
        type: 'connection',
        severity: 'high',
        message: 'WebSocket connection is not healthy',
        details: lastError,
      });
      recommendations.push('Try refreshing the page or checking your internet connection');
    }

    // Check latency
    if (health.averageLatency > 1000) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        message: 'High latency detected',
        details: `Average latency: ${health.averageLatency}ms`,
      });
      recommendations.push('Check your internet connection stability');
    }

    // Check reconnection attempts
    if (reconnectAttempts > maxReconnectAttempts / 2) {
      issues.push({
        type: 'stability',
        severity: 'medium',
        message: 'Frequent reconnection attempts',
        details: `${reconnectAttempts}/${maxReconnectAttempts} attempts`,
      });
      recommendations.push('Your connection may be unstable');
    }

    // Check error rate
    if (connectionErrors.length > 5) {
      issues.push({
        type: 'errors',
        severity: 'high',
        message: 'Multiple connection errors detected',
        details: `${connectionErrors.length} recent errors`,
      });
      recommendations.push('There may be server-side issues');
    }

    // Check queued messages
    if (health.queuedMessages > 0) {
      issues.push({
        type: 'queue',
        severity: 'low',
        message: 'Messages waiting in queue',
        details: `${health.queuedMessages} queued messages`,
      });
      recommendations.push('Messages will be sent when connection is restored');
    }

    // Determine overall status
    let status = 'good';
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high');
    const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium');

    if (highSeverityIssues.length > 0) {
      status = 'critical';
    } else if (mediumSeverityIssues.length > 0) {
      status = 'warning';
    } else if (issues.length > 0) {
      status = 'minor';
    }

    setDiagnostics({
      status,
      issues,
      recommendations,
      lastCheck: new Date(),
    });

    return {
      status,
      issues,
      recommendations,
      health,
      stats,
    };
  }, [
    getConnectionHealth,
    getConnectionStatistics,
    lastError,
    reconnectAttempts,
    maxReconnectAttempts,
    connectionErrors,
  ]);

  // Auto-run diagnostics periodically
  React.useEffect(() => {
    const interval = setInterval(runDiagnostics, 30000); // Every 30 seconds
    runDiagnostics(); // Initial run

    return () => clearInterval(interval);
  }, [runDiagnostics]);

  const exportDiagnostics = React.useCallback(() => {
    const health = getConnectionHealth();
    const stats = getConnectionStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      connectionState,
      health,
      statistics: stats,
      diagnostics,
      connectionErrors: connectionErrors.slice(-10), // Last 10 errors
    };
  }, [getConnectionHealth, getConnectionStatistics, connectionState, diagnostics, connectionErrors]);

  return {
    diagnostics,
    runDiagnostics,
    exportDiagnostics,
    hasIssues: diagnostics.issues.length > 0,
    hasCriticalIssues: diagnostics.issues.some(issue => issue.severity === 'high'),
    statusColor: {
      good: 'green',
      minor: 'yellow',
      warning: 'orange',
      critical: 'red',
      unknown: 'gray',
    }[diagnostics.status],
  };
};

export default WebSocketContext;