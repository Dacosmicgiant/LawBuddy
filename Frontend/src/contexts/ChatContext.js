// src/contexts/ChatContext.js - Chat sessions state management
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import chatService from '../services/chatService.js';
import errorService from '../services/errorService.js';
import { useAuth } from './AuthContext.js';
import { CHAT_STATUS, PAGINATION, LEGAL_CATEGORIES } from '../services/constants.js';

// Initial state
const initialState = {
  // Chat list management
  chatList: [],
  totalChats: 0,
  pagination: {
    page: PAGINATION.DEFAULT_PAGE,
    size: PAGINATION.DEFAULT_PAGE_SIZE,
    hasNext: false,
    total: 0,
  },
  
  // Current chat
  currentChat: null,
  currentChatId: null,
  
  // Chat analytics
  chatAnalytics: {},
  userStatistics: null,
  
  // Filters and search
  filters: {
    status: null,
    tags: [],
    legalCategories: [],
    dateRange: { from: null, to: null },
    searchQuery: '',
  },
  sortBy: 'updated_at',
  sortOrder: 'desc',
  
  // UI states
  isLoading: false,
  isLoadingChat: false,
  isCreatingChat: false,
  isUpdatingChat: false,
  isDeletingChat: false,
  isExporting: false,
  
  // Error handling
  chatError: null,
  operationErrors: {},
  
  // Cache and optimization
  lastFetched: null,
  cacheValid: false,
  selectedChatIds: [],
  
  // Advanced features
  recentChats: [],
  favoriteChats: [],
  archivedChats: [],
  sharedChats: [],
  
  // Chat operations
  batchOperations: {
    inProgress: false,
    type: null,
    progress: 0,
    total: 0,
  },
};

// Action types
const CHAT_ACTIONS = {
  // List operations
  FETCH_CHATS_START: 'FETCH_CHATS_START',
  FETCH_CHATS_SUCCESS: 'FETCH_CHATS_SUCCESS',
  FETCH_CHATS_FAILURE: 'FETCH_CHATS_FAILURE',
  
  // Current chat operations
  SET_CURRENT_CHAT: 'SET_CURRENT_CHAT',
  CLEAR_CURRENT_CHAT: 'CLEAR_CURRENT_CHAT',
  FETCH_CHAT_START: 'FETCH_CHAT_START',
  FETCH_CHAT_SUCCESS: 'FETCH_CHAT_SUCCESS',
  FETCH_CHAT_FAILURE: 'FETCH_CHAT_FAILURE',
  
  // CRUD operations
  CREATE_CHAT_START: 'CREATE_CHAT_START',
  CREATE_CHAT_SUCCESS: 'CREATE_CHAT_SUCCESS',
  CREATE_CHAT_FAILURE: 'CREATE_CHAT_FAILURE',
  
  UPDATE_CHAT_START: 'UPDATE_CHAT_START',
  UPDATE_CHAT_SUCCESS: 'UPDATE_CHAT_SUCCESS',
  UPDATE_CHAT_FAILURE: 'UPDATE_CHAT_FAILURE',
  
  DELETE_CHAT_START: 'DELETE_CHAT_START',
  DELETE_CHAT_SUCCESS: 'DELETE_CHAT_SUCCESS',
  DELETE_CHAT_FAILURE: 'DELETE_CHAT_FAILURE',
  
  // Batch operations
  BATCH_OPERATION_START: 'BATCH_OPERATION_START',
  BATCH_OPERATION_PROGRESS: 'BATCH_OPERATION_PROGRESS',
  BATCH_OPERATION_SUCCESS: 'BATCH_OPERATION_SUCCESS',
  BATCH_OPERATION_FAILURE: 'BATCH_OPERATION_FAILURE',
  
  // Analytics and statistics
  FETCH_ANALYTICS_START: 'FETCH_ANALYTICS_START',
  FETCH_ANALYTICS_SUCCESS: 'FETCH_ANALYTICS_SUCCESS',
  FETCH_ANALYTICS_FAILURE: 'FETCH_ANALYTICS_FAILURE',
  
  FETCH_STATISTICS_SUCCESS: 'FETCH_STATISTICS_SUCCESS',
  
  // Filters and search
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SORT: 'SET_SORT',
  
  // Selection
  SELECT_CHAT: 'SELECT_CHAT',
  DESELECT_CHAT: 'DESELECT_CHAT',
  SELECT_ALL_CHATS: 'SELECT_ALL_CHATS',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  
  // Export
  EXPORT_START: 'EXPORT_START',
  EXPORT_SUCCESS: 'EXPORT_SUCCESS',
  EXPORT_FAILURE: 'EXPORT_FAILURE',
  
  // Cache management
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  UPDATE_CACHE: 'UPDATE_CACHE',
  
  // Error handling
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_ERROR: 'SET_ERROR',
  CLEAR_OPERATION_ERROR: 'CLEAR_OPERATION_ERROR',
  
  // Real-time updates
  CHAT_UPDATED_REALTIME: 'CHAT_UPDATED_REALTIME',
  CHAT_DELETED_REALTIME: 'CHAT_DELETED_REALTIME',
  NEW_CHAT_REALTIME: 'NEW_CHAT_REALTIME',
};

// Helper functions
const sortChats = (chats, sortBy, sortOrder) => {
  return [...chats].sort((a, b) => {
    let valueA, valueB;

    switch (sortBy) {
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      case 'created_at':
        valueA = new Date(a.created_at);
        valueB = new Date(b.created_at);
        break;
      case 'updated_at':
        valueA = new Date(a.updated_at);
        valueB = new Date(b.updated_at);
        break;
      case 'last_message_at':
        valueA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        valueB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        break;
      case 'message_count':
        valueA = a.metadata?.message_count || 0;
        valueB = b.metadata?.message_count || 0;
        break;
      default:
        valueA = new Date(a.updated_at);
        valueB = new Date(b.updated_at);
    }

    if (sortOrder === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });
};

const filterChats = (chats, filters) => {
  return chats.filter(chat => {
    // Status filter
    if (filters.status && chat.status !== filters.status) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasRequiredTag = filters.tags.some(tag => chat.tags.includes(tag));
      if (!hasRequiredTag) {
        return false;
      }
    }

    // Legal categories filter
    if (filters.legalCategories && filters.legalCategories.length > 0) {
      const chatCategories = chat.metadata?.legal_categories || [];
      const hasRequiredCategory = filters.legalCategories.some(cat => 
        chatCategories.includes(cat)
      );
      if (!hasRequiredCategory) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange.from) {
      const chatDate = new Date(chat.created_at);
      const fromDate = new Date(filters.dateRange.from);
      if (chatDate < fromDate) {
        return false;
      }
    }

    if (filters.dateRange.to) {
      const chatDate = new Date(chat.created_at);
      const toDate = new Date(filters.dateRange.to);
      if (chatDate > toDate) {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const titleMatch = chat.title.toLowerCase().includes(query);
      const previewMatch = chat.preview.toLowerCase().includes(query);
      if (!titleMatch && !previewMatch) {
        return false;
      }
    }

    return true;
  });
};

// Chat reducer
const chatReducer = (state, action) => {
  switch (action.type) {
    case CHAT_ACTIONS.FETCH_CHATS_START:
      return {
        ...state,
        isLoading: true,
        chatError: null,
      };

    case CHAT_ACTIONS.FETCH_CHATS_SUCCESS:
      const sortedChats = sortChats(action.payload.chats, state.sortBy, state.sortOrder);
      const filteredChats = filterChats(sortedChats, state.filters);
      
      return {
        ...state,
        chatList: filteredChats,
        totalChats: action.payload.pagination.total,
        pagination: action.payload.pagination,
        isLoading: false,
        chatError: null,
        lastFetched: new Date(),
        cacheValid: true,
        
        // Update specialized lists
        recentChats: sortedChats.slice(0, 10),
        archivedChats: sortedChats.filter(chat => chat.status === CHAT_STATUS.ARCHIVED),
      };

    case CHAT_ACTIONS.FETCH_CHATS_FAILURE:
      return {
        ...state,
        isLoading: false,
        chatError: action.payload.error,
        cacheValid: false,
      };

    case CHAT_ACTIONS.SET_CURRENT_CHAT:
      return {
        ...state,
        currentChat: action.payload.chat,
        currentChatId: action.payload.chat?.id || null,
      };

    case CHAT_ACTIONS.CLEAR_CURRENT_CHAT:
      return {
        ...state,
        currentChat: null,
        currentChatId: null,
      };

    case CHAT_ACTIONS.FETCH_CHAT_START:
      return {
        ...state,
        isLoadingChat: true,
        chatError: null,
      };

    case CHAT_ACTIONS.FETCH_CHAT_SUCCESS:
      return {
        ...state,
        currentChat: action.payload.chat,
        currentChatId: action.payload.chat.id,
        isLoadingChat: false,
        chatError: null,
      };

    case CHAT_ACTIONS.FETCH_CHAT_FAILURE:
      return {
        ...state,
        isLoadingChat: false,
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.CREATE_CHAT_START:
      return {
        ...state,
        isCreatingChat: true,
        chatError: null,
      };

    case CHAT_ACTIONS.CREATE_CHAT_SUCCESS:
      const newChat = action.payload.chat;
      return {
        ...state,
        chatList: [newChat, ...state.chatList],
        currentChat: newChat,
        currentChatId: newChat.id,
        totalChats: state.totalChats + 1,
        isCreatingChat: false,
        chatError: null,
        recentChats: [newChat, ...state.recentChats.slice(0, 9)],
      };

    case CHAT_ACTIONS.CREATE_CHAT_FAILURE:
      return {
        ...state,
        isCreatingChat: false,
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.UPDATE_CHAT_START:
      return {
        ...state,
        isUpdatingChat: true,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.chatId]: null,
        },
      };

    case CHAT_ACTIONS.UPDATE_CHAT_SUCCESS:
      const updatedChat = action.payload.chat;
      return {
        ...state,
        chatList: state.chatList.map(chat => 
          chat.id === updatedChat.id ? updatedChat : chat
        ),
        currentChat: state.currentChatId === updatedChat.id ? updatedChat : state.currentChat,
        isUpdatingChat: false,
        operationErrors: {
          ...state.operationErrors,
          [updatedChat.id]: null,
        },
        // Update specialized lists
        recentChats: state.recentChats.map(chat => 
          chat.id === updatedChat.id ? updatedChat : chat
        ),
        archivedChats: updatedChat.status === CHAT_STATUS.ARCHIVED 
          ? [...state.archivedChats.filter(chat => chat.id !== updatedChat.id), updatedChat]
          : state.archivedChats.filter(chat => chat.id !== updatedChat.id),
      };

    case CHAT_ACTIONS.UPDATE_CHAT_FAILURE:
      return {
        ...state,
        isUpdatingChat: false,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.chatId]: action.payload.error,
        },
      };

    case CHAT_ACTIONS.DELETE_CHAT_START:
      return {
        ...state,
        isDeletingChat: true,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.chatId]: null,
        },
      };

    case CHAT_ACTIONS.DELETE_CHAT_SUCCESS:
      const deletedChatId = action.payload.chatId;
      return {
        ...state,
        chatList: state.chatList.filter(chat => chat.id !== deletedChatId),
        currentChat: state.currentChatId === deletedChatId ? null : state.currentChat,
        currentChatId: state.currentChatId === deletedChatId ? null : state.currentChatId,
        totalChats: Math.max(0, state.totalChats - 1),
        isDeletingChat: false,
        selectedChatIds: state.selectedChatIds.filter(id => id !== deletedChatId),
        operationErrors: {
          ...state.operationErrors,
          [deletedChatId]: null,
        },
        // Update specialized lists
        recentChats: state.recentChats.filter(chat => chat.id !== deletedChatId),
        archivedChats: state.archivedChats.filter(chat => chat.id !== deletedChatId),
        favoriteChats: state.favoriteChats.filter(chat => chat.id !== deletedChatId),
      };

    case CHAT_ACTIONS.DELETE_CHAT_FAILURE:
      return {
        ...state,
        isDeletingChat: false,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.chatId]: action.payload.error,
        },
      };

    case CHAT_ACTIONS.BATCH_OPERATION_START:
      return {
        ...state,
        batchOperations: {
          inProgress: true,
          type: action.payload.type,
          progress: 0,
          total: action.payload.total,
        },
      };

    case CHAT_ACTIONS.BATCH_OPERATION_PROGRESS:
      return {
        ...state,
        batchOperations: {
          ...state.batchOperations,
          progress: action.payload.progress,
        },
      };

    case CHAT_ACTIONS.BATCH_OPERATION_SUCCESS:
      const { results, operation } = action.payload;
      let updatedChatList = [...state.chatList];
      
      results.forEach(result => {
        if (result.success) {
          switch (operation) {
            case 'delete':
              updatedChatList = updatedChatList.filter(chat => chat.id !== result.chatId);
              break;
            case 'archive':
            case 'restore':
            case 'tag':
              const index = updatedChatList.findIndex(chat => chat.id === result.chatId);
              if (index !== -1 && result.result?.chat) {
                updatedChatList[index] = result.result.chat;
              }
              break;
          }
        }
      });

      return {
        ...state,
        chatList: updatedChatList,
        batchOperations: {
          inProgress: false,
          type: null,
          progress: 0,
          total: 0,
        },
        selectedChatIds: [], // Clear selection after batch operation
      };

    case CHAT_ACTIONS.BATCH_OPERATION_FAILURE:
      return {
        ...state,
        batchOperations: {
          inProgress: false,
          type: null,
          progress: 0,
          total: 0,
        },
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.FETCH_ANALYTICS_START:
      return {
        ...state,
        isLoading: true,
      };

    case CHAT_ACTIONS.FETCH_ANALYTICS_SUCCESS:
      return {
        ...state,
        chatAnalytics: {
          ...state.chatAnalytics,
          [action.payload.chatId]: action.payload.analytics,
        },
        isLoading: false,
      };

    case CHAT_ACTIONS.FETCH_ANALYTICS_FAILURE:
      return {
        ...state,
        isLoading: false,
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.FETCH_STATISTICS_SUCCESS:
      return {
        ...state,
        userStatistics: action.payload.statistics,
      };

    case CHAT_ACTIONS.SET_FILTERS:
      const newFilters = { ...state.filters, ...action.payload.filters };
      const filteredChatList = filterChats(
        sortChats(state.chatList, state.sortBy, state.sortOrder),
        newFilters
      );
      
      return {
        ...state,
        filters: newFilters,
        chatList: filteredChatList,
      };

    case CHAT_ACTIONS.CLEAR_FILTERS:
      const clearedFilters = {
        status: null,
        tags: [],
        legalCategories: [],
        dateRange: { from: null, to: null },
        searchQuery: '',
      };
      
      return {
        ...state,
        filters: clearedFilters,
        chatList: sortChats(state.chatList, state.sortBy, state.sortOrder),
      };

    case CHAT_ACTIONS.SET_SORT:
      const sortedChatList = sortChats(state.chatList, action.payload.sortBy, action.payload.sortOrder);
      
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
        chatList: sortedChatList,
      };

    case CHAT_ACTIONS.SELECT_CHAT:
      return {
        ...state,
        selectedChatIds: [...state.selectedChatIds, action.payload.chatId],
      };

    case CHAT_ACTIONS.DESELECT_CHAT:
      return {
        ...state,
        selectedChatIds: state.selectedChatIds.filter(id => id !== action.payload.chatId),
      };

    case CHAT_ACTIONS.SELECT_ALL_CHATS:
      return {
        ...state,
        selectedChatIds: state.chatList.map(chat => chat.id),
      };

    case CHAT_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selectedChatIds: [],
      };

    case CHAT_ACTIONS.EXPORT_START:
      return {
        ...state,
        isExporting: true,
        chatError: null,
      };

    case CHAT_ACTIONS.EXPORT_SUCCESS:
      return {
        ...state,
        isExporting: false,
        chatError: null,
      };

    case CHAT_ACTIONS.EXPORT_FAILURE:
      return {
        ...state,
        isExporting: false,
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.INVALIDATE_CACHE:
      return {
        ...state,
        cacheValid: false,
        lastFetched: null,
      };

    case CHAT_ACTIONS.UPDATE_CACHE:
      return {
        ...state,
        cacheValid: true,
        lastFetched: new Date(),
      };

    case CHAT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        chatError: null,
      };

    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        chatError: action.payload.error,
      };

    case CHAT_ACTIONS.CLEAR_OPERATION_ERROR:
      return {
        ...state,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.chatId]: null,
        },
      };

    // Real-time updates
    case CHAT_ACTIONS.CHAT_UPDATED_REALTIME:
      const realtimeUpdatedChat = action.payload.chat;
      return {
        ...state,
        chatList: state.chatList.map(chat => 
          chat.id === realtimeUpdatedChat.id ? realtimeUpdatedChat : chat
        ),
        currentChat: state.currentChatId === realtimeUpdatedChat.id 
          ? realtimeUpdatedChat 
          : state.currentChat,
      };

    case CHAT_ACTIONS.CHAT_DELETED_REALTIME:
      const realtimeDeletedChatId = action.payload.chatId;
      return {
        ...state,
        chatList: state.chatList.filter(chat => chat.id !== realtimeDeletedChatId),
        currentChat: state.currentChatId === realtimeDeletedChatId ? null : state.currentChat,
        currentChatId: state.currentChatId === realtimeDeletedChatId ? null : state.currentChatId,
      };

    case CHAT_ACTIONS.NEW_CHAT_REALTIME:
      const realtimeNewChat = action.payload.chat;
      return {
        ...state,
        chatList: [realtimeNewChat, ...state.chatList],
        totalChats: state.totalChats + 1,
      };

    default:
      return state;
  }
};

// Create context
const ChatContext = createContext();

// Provider component
export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Load chats when user authenticates
  useEffect(() => {
    if (isAuthenticated && !state.cacheValid) {
      loadChats();
    }
  }, [isAuthenticated]);

  // Listen for chat service changes
  useEffect(() => {
    const unsubscribe = chatService.onChatChange((event) => {
      switch (event.action) {
        case 'created':
          dispatch({
            type: CHAT_ACTIONS.NEW_CHAT_REALTIME,
            payload: { chat: event.chat },
          });
          break;
        case 'updated':
          dispatch({
            type: CHAT_ACTIONS.CHAT_UPDATED_REALTIME,
            payload: { chat: event.chat },
          });
          break;
        case 'deleted':
          dispatch({
            type: CHAT_ACTIONS.CHAT_DELETED_REALTIME,
            payload: { chatId: event.chat.id },
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Action creators
  const loadChats = useCallback(async (options = {}) => {
    dispatch({ type: CHAT_ACTIONS.FETCH_CHATS_START });

    try {
      const result = await chatService.getChats({
        page: state.pagination.page,
        size: state.pagination.size,
        useCache: state.cacheValid,
        ...options,
      });

      dispatch({
        type: CHAT_ACTIONS.FETCH_CHATS_SUCCESS,
        payload: {
          chats: result.chats,
          pagination: result.pagination,
        },
      });

      return { success: true, chats: result.chats };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_CHATS_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, [state.pagination.page, state.pagination.size, state.cacheValid]);

  const createChat = useCallback(async (chatData) => {
    dispatch({ type: CHAT_ACTIONS.CREATE_CHAT_START });

    try {
      const result = await chatService.createChat(chatData);
      
      dispatch({
        type: CHAT_ACTIONS.CREATE_CHAT_SUCCESS,
        payload: { chat: result.chat },
      });

      return { success: true, chat: result.chat };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.CREATE_CHAT_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const updateChat = useCallback(async (chatId, updateData) => {
    dispatch({ 
      type: CHAT_ACTIONS.UPDATE_CHAT_START,
      payload: { chatId },
    });

    try {
      const result = await chatService.updateChat(chatId, updateData);
      
      dispatch({
        type: CHAT_ACTIONS.UPDATE_CHAT_SUCCESS,
        payload: { chat: result.chat },
      });

      return { success: true, chat: result.chat };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.UPDATE_CHAT_FAILURE,
        payload: { chatId, error: errorMessage },
      });

      throw error;
    }
  }, []);

  const deleteChat = useCallback(async (chatId, hardDelete = false) => {
    dispatch({ 
      type: CHAT_ACTIONS.DELETE_CHAT_START,
      payload: { chatId },
    });

    try {
      await chatService.deleteChat(chatId, hardDelete);
      
      dispatch({
        type: CHAT_ACTIONS.DELETE_CHAT_SUCCESS,
        payload: { chatId },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.DELETE_CHAT_FAILURE,
        payload: { chatId, error: errorMessage },
      });

      throw error;
    }
  }, []);

  const loadChat = useCallback(async (chatId) => {
    dispatch({ type: CHAT_ACTIONS.FETCH_CHAT_START });

    try {
      const result = await chatService.getChat(chatId);
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_CHAT_SUCCESS,
        payload: { chat: result.chat },
      });

      return { success: true, chat: result.chat };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_CHAT_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const setCurrentChat = useCallback((chat) => {
    dispatch({
      type: CHAT_ACTIONS.SET_CURRENT_CHAT,
      payload: { chat },
    });
  }, []);

  const clearCurrentChat = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_CURRENT_CHAT });
  }, []);

  const batchOperation = useCallback(async (operation, chatIds, parameters = {}, onProgress = null) => {
    dispatch({
      type: CHAT_ACTIONS.BATCH_OPERATION_START,
      payload: { type: operation, total: chatIds.length },
    });

    try {
      const result = await chatService.batchOperationWithProgress(
        operation,
        chatIds,
        parameters,
        (progress) => {
          dispatch({
            type: CHAT_ACTIONS.BATCH_OPERATION_PROGRESS,
            payload: { progress: progress.percentage },
          });
          
          if (onProgress) {
            onProgress(progress);
          }
        }
      );

      dispatch({
        type: CHAT_ACTIONS.BATCH_OPERATION_SUCCESS,
        payload: { results: result.results, operation },
      });

      return result;
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.BATCH_OPERATION_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const loadChatAnalytics = useCallback(async (chatId) => {
    dispatch({ type: CHAT_ACTIONS.FETCH_ANALYTICS_START });

    try {
      const result = await chatService.getChatAnalytics(chatId);
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_ANALYTICS_SUCCESS,
        payload: { chatId, analytics: result.analytics },
      });

      return { success: true, analytics: result.analytics };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_ANALYTICS_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const loadUserStatistics = useCallback(async () => {
    try {
      const result = await chatService.getChatStatistics();
      
      dispatch({
        type: CHAT_ACTIONS.FETCH_STATISTICS_SUCCESS,
        payload: { statistics: result.statistics },
      });

      return { success: true, statistics: result.statistics };
    } catch (error) {
      throw error;
    }
  }, []);

  const exportChat = useCallback(async (chatId, options = {}) => {
    dispatch({ type: CHAT_ACTIONS.EXPORT_START });

    try {
      const result = await chatService.exportChat(chatId, options);
      
      // Download the exported content
      chatService.downloadExportedContent(result.content, result.filename, result.format);
      
      dispatch({ type: CHAT_ACTIONS.EXPORT_SUCCESS });

      return { success: true, filename: result.filename };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: CHAT_ACTIONS.EXPORT_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({
      type: CHAT_ACTIONS.SET_FILTERS,
      payload: { filters },
    });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_FILTERS });
  }, []);

  const setSorting = useCallback((sortBy, sortOrder) => {
    dispatch({
      type: CHAT_ACTIONS.SET_SORT,
      payload: { sortBy, sortOrder },
    });
  }, []);

  const selectChat = useCallback((chatId) => {
    if (!state.selectedChatIds.includes(chatId)) {
      dispatch({
        type: CHAT_ACTIONS.SELECT_CHAT,
        payload: { chatId },
      });
    }
  }, [state.selectedChatIds]);

  const deselectChat = useCallback((chatId) => {
    dispatch({
      type: CHAT_ACTIONS.DESELECT_CHAT,
      payload: { chatId },
    });
  }, []);

  const selectAllChats = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.SELECT_ALL_CHATS });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_SELECTION });
  }, []);

  const refreshChats = useCallback(async () => {
    dispatch({ type: CHAT_ACTIONS.INVALIDATE_CACHE });
    return loadChats({ useCache: false });
  }, [loadChats]);

  const archiveChat = useCallback(async (chatId) => {
    return updateChat(chatId, { status: CHAT_STATUS.ARCHIVED });
  }, [updateChat]);

  const restoreChat = useCallback(async (chatId) => {
    return updateChat(chatId, { status: CHAT_STATUS.ACTIVE });
  }, [updateChat]);

  const duplicateChat = useCallback(async (chatId, newTitle = null) => {
    try {
      const result = await chatService.duplicateChat(chatId, newTitle);
      
      dispatch({
        type: CHAT_ACTIONS.CREATE_CHAT_SUCCESS,
        payload: { chat: result.chat },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const searchChats = useCallback(async (query, options = {}) => {
    try {
      const result = await chatService.searchChats(query, options);
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_ERROR });
  }, []);

  const clearOperationError = useCallback((chatId) => {
    dispatch({
      type: CHAT_ACTIONS.CLEAR_OPERATION_ERROR,
      payload: { chatId },
    });
  }, []);

  // Helper functions
  const getChatById = useCallback((chatId) => {
    return state.chatList.find(chat => chat.id === chatId) || null;
  }, [state.chatList]);

  const getChatAnalytics = useCallback((chatId) => {
    return state.chatAnalytics[chatId] || null;
  }, [state.chatAnalytics]);

  const getFilteredChats = useCallback(() => {
    return filterChats(
      sortChats(state.chatList, state.sortBy, state.sortOrder),
      state.filters
    );
  }, [state.chatList, state.sortBy, state.sortOrder, state.filters]);

  const isChatSelected = useCallback((chatId) => {
    return state.selectedChatIds.includes(chatId);
  }, [state.selectedChatIds]);

  const getOperationError = useCallback((chatId) => {
    return state.operationErrors[chatId] || null;
  }, [state.operationErrors]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    loadChats,
    createChat,
    updateChat,
    deleteChat,
    loadChat,
    setCurrentChat,
    clearCurrentChat,
    batchOperation,
    loadChatAnalytics,
    loadUserStatistics,
    exportChat,
    setFilters,
    clearFilters,
    setSorting,
    selectChat,
    deselectChat,
    selectAllChats,
    clearSelection,
    refreshChats,
    archiveChat,
    restoreChat,
    duplicateChat,
    searchChats,
    clearError,
    clearOperationError,
    
    // Helper functions
    getChatById,
    getChatAnalytics,
    getFilteredChats,
    isChatSelected,
    getOperationError,
    
    // Computed values
    hasChats: state.chatList.length > 0,
    selectedCount: state.selectedChatIds.length,
    canBatchDelete: state.selectedChatIds.length > 0,
    canBatchArchive: state.selectedChatIds.length > 0,
    isFilterActive: Object.values(state.filters).some(value => 
      value && (Array.isArray(value) ? value.length > 0 : true)
    ),
    filteredChatCount: getFilteredChats().length,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
};

// Higher-order component for chat-dependent components
export const withChat = (Component) => {
  return function ChatComponent(props) {
    const { currentChat, isLoadingChat } = useChat();
    
    if (isLoadingChat) {
      return <div>Loading chat...</div>; // Replace with your loading component
    }
    
    if (!currentChat) {
      return <div>No chat selected.</div>; // Replace with appropriate message
    }
    
    return <Component {...props} />;
  };
};

export default ChatContext;