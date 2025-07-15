// src/contexts/MessageContext.js - Complete message state management with real-time updates
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import messageService from '../services/messageService.js';
import errorService from '../services/errorService.js';
import { useAuth } from './AuthContext.js';
import { useChat } from './ChatContext.js';
import { 
  MESSAGE_ROLES, 
  MESSAGE_TYPES, 
  MESSAGE_STATUS, 
  RESPONSE_FORMATS,
  PAGINATION 
} from '../services/constants.js';

// Initial state
const initialState = {
  // Messages by chat
  messagesByChat: {}, // { chatId: { messages: [], pagination: {}, lastFetched: Date } }
  
  // Current chat messages
  currentChatMessages: [],
  currentChatId: null,
  
  // Streaming and real-time
  streamingMessages: {}, // { streamId: { messageId, content, status, metadata } }
  activeStreams: new Set(),
  
  // Conversation branching
  activeBranch: null,
  branches: [],
  branchHistory: {},
  
  // Message interactions
  messageInteractions: {}, // { messageId: { rating, feedback, bookmarked, etc. } }
  
  // Search and filtering
  searchResults: [],
  searchQuery: '',
  searchMetadata: null,
  messageFilters: {
    role: null,
    type: null,
    status: null,
    dateRange: { from: null, to: null },
    hasInteractions: false,
  },
  
  // UI states
  isLoading: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  isSearching: false,
  isRegenerating: false,
  
  // Error handling
  messageError: null,
  streamingErrors: {},
  operationErrors: {},
  
  // Message composition
  composingMessage: {
    content: '',
    type: MESSAGE_TYPES.TEXT,
    responseFormat: RESPONSE_FORMATS.MARKDOWN,
    isDirty: false,
  },
  
  // Analytics and insights
  messageAnalytics: {}, // { chatId: analytics }
  typingIndicators: {}, // { chatId: { userId: timestamp } }
  
  // Offline support
  pendingMessages: [], // Messages waiting to be sent when online
  failedMessages: [], // Messages that failed to send
  
  // Performance optimization
  messageCache: {}, // Cached message content for quick access
  unreadCounts: {}, // { chatId: count }
  lastSeenTimestamps: {}, // { chatId: timestamp }
  
  // Message queue management
  sendQueue: [], // Queue for outgoing messages
  processingQueue: false,
  
  // Advanced features
  messageThreads: {}, // { chatId: threadStructure }
  editHistory: {}, // { messageId: [edits] }
  messageReactions: {}, // { messageId: { emoji: count } }
  attachments: {}, // { messageId: [attachments] }
  
  // Conversation context
  conversationMemory: {}, // { chatId: contextData }
  messageTokens: {}, // { messageId: tokenCount }
  
  // Real-time collaboration
  collaborativeEdits: {}, // { messageId: editSessions }
  messageSelection: {}, // Selected messages for batch operations
  
  // Performance metrics
  messageStats: {
    totalSent: 0,
    totalReceived: 0,
    totalStreamed: 0,
    totalTokens: 0,
    averageResponseTime: 0,
  },
  
  // Export and backup
  exportStatus: {
    inProgress: false,
    progress: 0,
    format: null,
  },
};

// Action types
const MESSAGE_ACTIONS = {
  // Loading states
  SET_LOADING: 'SET_LOADING',
  SET_LOADING_MESSAGES: 'SET_LOADING_MESSAGES',
  SET_SENDING_MESSAGE: 'SET_SENDING_MESSAGE',
  
  // Message CRUD
  FETCH_MESSAGES_START: 'FETCH_MESSAGES_START',
  FETCH_MESSAGES_SUCCESS: 'FETCH_MESSAGES_SUCCESS',
  FETCH_MESSAGES_FAILURE: 'FETCH_MESSAGES_FAILURE',
  
  SEND_MESSAGE_START: 'SEND_MESSAGE_START',
  SEND_MESSAGE_SUCCESS: 'SEND_MESSAGE_SUCCESS',
  SEND_MESSAGE_FAILURE: 'SEND_MESSAGE_FAILURE',
  
  // Real-time message updates
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_READ: 'MESSAGE_READ',
  
  // Streaming
  STREAM_START: 'STREAM_START',
  STREAM_CHUNK: 'STREAM_CHUNK',
  STREAM_COMPLETE: 'STREAM_COMPLETE',
  STREAM_ERROR: 'STREAM_ERROR',
  STREAM_CANCELLED: 'STREAM_CANCELLED',
  
  // Message interactions
  UPDATE_MESSAGE_INTERACTION: 'UPDATE_MESSAGE_INTERACTION',
  RATE_MESSAGE: 'RATE_MESSAGE',
  BOOKMARK_MESSAGE: 'BOOKMARK_MESSAGE',
  ADD_REACTION: 'ADD_REACTION',
  REMOVE_REACTION: 'REMOVE_REACTION',
  
  // Message editing
  EDIT_MESSAGE_START: 'EDIT_MESSAGE_START',
  EDIT_MESSAGE_SUCCESS: 'EDIT_MESSAGE_SUCCESS',
  EDIT_MESSAGE_FAILURE: 'EDIT_MESSAGE_FAILURE',
  
  // Message regeneration
  REGENERATE_START: 'REGENERATE_START',
  REGENERATE_SUCCESS: 'REGENERATE_SUCCESS',
  REGENERATE_FAILURE: 'REGENERATE_FAILURE',
  
  // Conversation branching
  SET_ACTIVE_BRANCH: 'SET_ACTIVE_BRANCH',
  LOAD_BRANCHES: 'LOAD_BRANCHES',
  CREATE_BRANCH: 'CREATE_BRANCH',
  SWITCH_BRANCH: 'SWITCH_BRANCH',
  DELETE_BRANCH: 'DELETE_BRANCH',
  
  // Search
  SEARCH_START: 'SEARCH_START',
  SEARCH_SUCCESS: 'SEARCH_SUCCESS',
  SEARCH_FAILURE: 'SEARCH_FAILURE',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  
  // Filters
  SET_MESSAGE_FILTERS: 'SET_MESSAGE_FILTERS',
  CLEAR_MESSAGE_FILTERS: 'CLEAR_MESSAGE_FILTERS',
  
  // Message composition
  UPDATE_COMPOSING_MESSAGE: 'UPDATE_COMPOSING_MESSAGE',
  CLEAR_COMPOSING_MESSAGE: 'CLEAR_COMPOSING_MESSAGE',
  SAVE_DRAFT: 'SAVE_DRAFT',
  LOAD_DRAFT: 'LOAD_DRAFT',
  
  // Chat switching
  SET_CURRENT_CHAT: 'SET_CURRENT_CHAT',
  CLEAR_CURRENT_CHAT: 'CLEAR_CURRENT_CHAT',
  
  // Typing indicators
  TYPING_START: 'TYPING_START',
  TYPING_STOP: 'TYPING_STOP',
  TYPING_TIMEOUT: 'TYPING_TIMEOUT',
  
  // Offline support
  ADD_PENDING_MESSAGE: 'ADD_PENDING_MESSAGE',
  REMOVE_PENDING_MESSAGE: 'REMOVE_PENDING_MESSAGE',
  ADD_FAILED_MESSAGE: 'ADD_FAILED_MESSAGE',
  RETRY_FAILED_MESSAGE: 'RETRY_FAILED_MESSAGE',
  CLEAR_FAILED_MESSAGES: 'CLEAR_FAILED_MESSAGES',
  
  // Queue management
  ADD_TO_SEND_QUEUE: 'ADD_TO_SEND_QUEUE',
  REMOVE_FROM_SEND_QUEUE: 'REMOVE_FROM_SEND_QUEUE',
  PROCESS_SEND_QUEUE: 'PROCESS_SEND_QUEUE',
  CLEAR_SEND_QUEUE: 'CLEAR_SEND_QUEUE',
  
  // Analytics
  UPDATE_MESSAGE_ANALYTICS: 'UPDATE_MESSAGE_ANALYTICS',
  UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
  MARK_MESSAGES_READ: 'MARK_MESSAGES_READ',
  UPDATE_MESSAGE_STATS: 'UPDATE_MESSAGE_STATS',
  
  // Attachments
  ADD_ATTACHMENT: 'ADD_ATTACHMENT',
  REMOVE_ATTACHMENT: 'REMOVE_ATTACHMENT',
  UPDATE_ATTACHMENT: 'UPDATE_ATTACHMENT',
  
  // Message selection
  SELECT_MESSAGE: 'SELECT_MESSAGE',
  DESELECT_MESSAGE: 'DESELECT_MESSAGE',
  SELECT_ALL_MESSAGES: 'SELECT_ALL_MESSAGES',
  CLEAR_MESSAGE_SELECTION: 'CLEAR_MESSAGE_SELECTION',
  
  // Export
  EXPORT_START: 'EXPORT_START',
  EXPORT_PROGRESS: 'EXPORT_PROGRESS',
  EXPORT_SUCCESS: 'EXPORT_SUCCESS',
  EXPORT_FAILURE: 'EXPORT_FAILURE',
  
  // Error handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_STREAMING_ERROR: 'SET_STREAMING_ERROR',
  CLEAR_STREAMING_ERROR: 'CLEAR_STREAMING_ERROR',
  SET_OPERATION_ERROR: 'SET_OPERATION_ERROR',
  CLEAR_OPERATION_ERROR: 'CLEAR_OPERATION_ERROR',
  
  // Cache management
  UPDATE_MESSAGE_CACHE: 'UPDATE_MESSAGE_CACHE',
  CLEAR_MESSAGE_CACHE: 'CLEAR_MESSAGE_CACHE',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  
  // Advanced features
  UPDATE_CONVERSATION_MEMORY: 'UPDATE_CONVERSATION_MEMORY',
  UPDATE_MESSAGE_THREADS: 'UPDATE_MESSAGE_THREADS',
  START_COLLABORATIVE_EDIT: 'START_COLLABORATIVE_EDIT',
  END_COLLABORATIVE_EDIT: 'END_COLLABORATIVE_EDIT',
};

// Helper functions
const addMessageToChat = (state, chatId, message) => {
  const chatMessages = state.messagesByChat[chatId] || { messages: [], pagination: {}, lastFetched: null };
  
  // Check if message already exists (prevent duplicates)
  const existingIndex = chatMessages.messages.findIndex(m => m.id === message.id);
  
  if (existingIndex !== -1) {
    // Update existing message
    chatMessages.messages[existingIndex] = { ...chatMessages.messages[existingIndex], ...message };
  } else {
    // Add new message and sort by timestamp
    chatMessages.messages.push(message);
    chatMessages.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }
  
  return {
    ...state.messagesByChat,
    [chatId]: {
      ...chatMessages,
      lastFetched: new Date(),
    },
  };
};

const removeMessageFromChat = (state, chatId, messageId) => {
  const chatMessages = state.messagesByChat[chatId];
  if (!chatMessages) return state.messagesByChat;
  
  return {
    ...state.messagesByChat,
    [chatId]: {
      ...chatMessages,
      messages: chatMessages.messages.filter(m => m.id !== messageId),
    },
  };
};

const updateMessageInChat = (state, chatId, messageId, updates) => {
  const chatMessages = state.messagesByChat[chatId];
  if (!chatMessages) return state.messagesByChat;
  
  return {
    ...state.messagesByChat,
    [chatId]: {
      ...chatMessages,
      messages: chatMessages.messages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      ),
    },
  };
};

const getCurrentChatMessages = (state) => {
  if (!state.currentChatId) return [];
  
  const chatMessages = state.messagesByChat[state.currentChatId];
  return chatMessages ? chatMessages.messages : [];
};

const buildMessageThreads = (messages) => {
  const messageMap = new Map();
  const threads = [];
  
  // Create message map
  messages.forEach(message => messageMap.set(message.id, message));
  
  // Build thread structure
  const buildThread = (message, visited = new Set()) => {
    if (visited.has(message.id)) return null;
    visited.add(message.id);
    
    const thread = {
      id: message.id,
      message,
      children: [],
      depth: 0,
    };
    
    if (message.child_message_ids && message.child_message_ids.length > 0) {
      message.child_message_ids.forEach(childId => {
        const childMessage = messageMap.get(childId);
        if (childMessage) {
          const childThread = buildThread(childMessage, visited);
          if (childThread) {
            childThread.depth = thread.depth + 1;
            thread.children.push(childThread);
          }
        }
      });
    }
    
    return thread;
  };
  
  // Find root messages and build threads
  messages.forEach(message => {
    if (!message.parent_message_id) {
      const thread = buildThread(message);
      if (thread) {
        threads.push(thread);
      }
    }
  });
  
  return threads;
};

const calculateMessageStats = (state) => {
  const allMessages = Object.values(state.messagesByChat).flatMap(chat => chat.messages);
  
  return {
    totalMessages: allMessages.length,
    totalByRole: allMessages.reduce((acc, msg) => {
      acc[msg.role] = (acc[msg.role] || 0) + 1;
      return acc;
    }, {}),
    totalByType: allMessages.reduce((acc, msg) => {
      acc[msg.message_type] = (acc[msg.message_type] || 0) + 1;
      return acc;
    }, {}),
    totalByStatus: allMessages.reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {}),
    averageLength: allMessages.length > 0 
      ? Math.round(allMessages.reduce((sum, msg) => sum + msg.content.length, 0) / allMessages.length)
      : 0,
    withInteractions: Object.keys(state.messageInteractions).length,
    bookmarked: Object.values(state.messageInteractions).filter(i => i.bookmarked).length,
    rated: Object.values(state.messageInteractions).filter(i => i.helpful_rating).length,
  };
};

// Message reducer
const messageReducer = (state, action) => {
  switch (action.type) {
    case MESSAGE_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.loading,
      };

    case MESSAGE_ACTIONS.SET_LOADING_MESSAGES:
      return {
        ...state,
        isLoadingMessages: action.payload.loading,
      };

    case MESSAGE_ACTIONS.SET_SENDING_MESSAGE:
      return {
        ...state,
        isSendingMessage: action.payload.sending,
      };

    case MESSAGE_ACTIONS.FETCH_MESSAGES_START:
      return {
        ...state,
        isLoadingMessages: true,
        messageError: null,
      };

    case MESSAGE_ACTIONS.FETCH_MESSAGES_SUCCESS:
      const { chatId, messages, pagination, fromCache } = action.payload;
      const updatedMessagesByChat = {
        ...state.messagesByChat,
        [chatId]: {
          messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
          pagination,
          lastFetched: fromCache ? state.messagesByChat[chatId]?.lastFetched : new Date(),
        },
      };

      // Update message threads
      const threads = buildMessageThreads(messages);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat,
        currentChatMessages: chatId === state.currentChatId ? messages : state.currentChatMessages,
        messageThreads: {
          ...state.messageThreads,
          [chatId]: threads,
        },
        isLoadingMessages: false,
        messageError: null,
      };

    case MESSAGE_ACTIONS.FETCH_MESSAGES_FAILURE:
      return {
        ...state,
        isLoadingMessages: false,
        messageError: action.payload.error,
      };

    case MESSAGE_ACTIONS.SEND_MESSAGE_START:
      return {
        ...state,
        isSendingMessage: true,
        messageError: null,
      };

    case MESSAGE_ACTIONS.SEND_MESSAGE_SUCCESS:
      const sentMessage = action.payload.message;
      const updatedMessagesByChat1 = addMessageToChat(state, sentMessage.chat_session_id, sentMessage);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat1,
        currentChatMessages: sentMessage.chat_session_id === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat1 })
          : state.currentChatMessages,
        isSendingMessage: false,
        messageError: null,
        composingMessage: {
          content: '',
          type: MESSAGE_TYPES.TEXT,
          responseFormat: RESPONSE_FORMATS.MARKDOWN,
          isDirty: false,
        },
        messageStats: {
          ...state.messageStats,
          totalSent: state.messageStats.totalSent + 1,
        },
      };

    case MESSAGE_ACTIONS.SEND_MESSAGE_FAILURE:
      return {
        ...state,
        isSendingMessage: false,
        messageError: action.payload.error,
        failedMessages: [...state.failedMessages, action.payload.message],
      };

    case MESSAGE_ACTIONS.MESSAGE_RECEIVED:
      const receivedMessage = action.payload.message;
      const updatedMessagesByChat2 = addMessageToChat(state, receivedMessage.chat_session_id, receivedMessage);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat2,
        currentChatMessages: receivedMessage.chat_session_id === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat2 })
          : state.currentChatMessages,
        unreadCounts: {
          ...state.unreadCounts,
          [receivedMessage.chat_session_id]: (state.unreadCounts[receivedMessage.chat_session_id] || 0) + 1,
        },
        messageStats: {
          ...state.messageStats,
          totalReceived: state.messageStats.totalReceived + 1,
        },
      };

    case MESSAGE_ACTIONS.MESSAGE_UPDATED:
      const updatedMessage = action.payload.message;
      const updatedMessagesByChat3 = updateMessageInChat(
        state, 
        updatedMessage.chat_session_id, 
        updatedMessage.id, 
        updatedMessage
      );

      return {
        ...state,
        messagesByChat: updatedMessagesByChat3,
        currentChatMessages: updatedMessage.chat_session_id === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat3 })
          : state.currentChatMessages,
      };

    case MESSAGE_ACTIONS.MESSAGE_DELETED:
      const { chatId: deletedChatId, messageId: deletedMessageId } = action.payload;
      const updatedMessagesByChat4 = removeMessageFromChat(state, deletedChatId, deletedMessageId);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat4,
        currentChatMessages: deletedChatId === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat4 })
          : state.currentChatMessages,
        messageSelection: {
          ...state.messageSelection,
          [deletedChatId]: (state.messageSelection[deletedChatId] || []).filter(id => id !== deletedMessageId),
        },
      };

    case MESSAGE_ACTIONS.MESSAGE_READ:
      const { chatId: readChatId, messageId: readMessageId } = action.payload;
      return {
        ...state,
        lastSeenTimestamps: {
          ...state.lastSeenTimestamps,
          [readChatId]: new Date(),
        },
      };

    case MESSAGE_ACTIONS.STREAM_START:
      const { streamId, messageId, chatId: streamChatId } = action.payload;
      return {
        ...state,
        streamingMessages: {
          ...state.streamingMessages,
          [streamId]: {
            messageId,
            chatId: streamChatId,
            content: '',
            status: MESSAGE_STATUS.STREAMING,
            startTime: new Date(),
            chunks: [],
            metadata: null,
          },
        },
        activeStreams: new Set([...state.activeStreams, streamId]),
      };

    case MESSAGE_ACTIONS.STREAM_CHUNK:
      const { streamId: chunkStreamId, chunk, fullContent } = action.payload;
      const streamingMessage = state.streamingMessages[chunkStreamId];
      
      if (!streamingMessage) return state;

      // Update the message in the chat as well
      const updatedMessagesByChat5 = updateMessageInChat(
        state,
        streamingMessage.chatId,
        streamingMessage.messageId,
        {
          content: fullContent || streamingMessage.content + chunk,
          status: MESSAGE_STATUS.STREAMING,
        }
      );

      return {
        ...state,
        messagesByChat: updatedMessagesByChat5,
        currentChatMessages: streamingMessage.chatId === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat5 })
          : state.currentChatMessages,
        streamingMessages: {
          ...state.streamingMessages,
          [chunkStreamId]: {
            ...streamingMessage,
            content: fullContent || streamingMessage.content + chunk,
            chunks: [...streamingMessage.chunks, { chunk, timestamp: new Date() }],
            lastUpdate: new Date(),
          },
        },
      };

    case MESSAGE_ACTIONS.STREAM_COMPLETE:
      const { streamId: completeStreamId, finalContent, metadata } = action.payload;
      const completedStreamingMessage = state.streamingMessages[completeStreamId];
      
      if (!completedStreamingMessage) return state;

      // Update the actual message in the chat
      const updatedMessagesByChat6 = updateMessageInChat(
        state,
        completedStreamingMessage.chatId,
        completedStreamingMessage.messageId,
        {
          content: finalContent,
          status: MESSAGE_STATUS.COMPLETE,
          ai_metadata: metadata,
        }
      );

      const newStreamingMessages = { ...state.streamingMessages };
      delete newStreamingMessages[completeStreamId];

      const newActiveStreams = new Set(state.activeStreams);
      newActiveStreams.delete(completeStreamId);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat6,
        currentChatMessages: completedStreamingMessage.chatId === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat6 })
          : state.currentChatMessages,
        streamingMessages: newStreamingMessages,
        activeStreams: newActiveStreams,
        messageStats: {
          ...state.messageStats,
          totalStreamed: state.messageStats.totalStreamed + 1,
        },
      };

    case MESSAGE_ACTIONS.STREAM_ERROR:
      const { streamId: errorStreamId, error } = action.payload;
      const errorStreamingMessage = state.streamingMessages[errorStreamId];
      
      if (!errorStreamingMessage) return state;

      // Update message status to failed
      const updatedMessagesByChat7 = updateMessageInChat(
        state,
        errorStreamingMessage.chatId,
        errorStreamingMessage.messageId,
        {
          status: MESSAGE_STATUS.FAILED,
          content: `Error: ${error}`,
        }
      );

      const newStreamingMessagesError = { ...state.streamingMessages };
      delete newStreamingMessagesError[errorStreamId];

      const newActiveStreamsError = new Set(state.activeStreams);
      newActiveStreamsError.delete(errorStreamId);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat7,
        currentChatMessages: errorStreamingMessage.chatId === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat7 })
          : state.currentChatMessages,
        streamingMessages: newStreamingMessagesError,
        activeStreams: newActiveStreamsError,
        streamingErrors: {
          ...state.streamingErrors,
          [errorStreamingMessage.messageId]: error,
        },
      };

    case MESSAGE_ACTIONS.STREAM_CANCELLED:
      const { streamId: cancelledStreamId } = action.payload;
      const cancelledStreamingMessage = state.streamingMessages[cancelledStreamId];
      
      if (!cancelledStreamingMessage) return state;

      // Update message status to cancelled
      const updatedMessagesByChat8 = updateMessageInChat(
        state,
        cancelledStreamingMessage.chatId,
        cancelledStreamingMessage.messageId,
        {
          status: MESSAGE_STATUS.CANCELLED,
        }
      );

      const newStreamingMessagesCancelled = { ...state.streamingMessages };
      delete newStreamingMessagesCancelled[cancelledStreamId];

      const newActiveStreamsCancelled = new Set(state.activeStreams);
      newActiveStreamsCancelled.delete(cancelledStreamId);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat8,
        currentChatMessages: cancelledStreamingMessage.chatId === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat8 })
          : state.currentChatMessages,
        streamingMessages: newStreamingMessagesCancelled,
        activeStreams: newActiveStreamsCancelled,
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_INTERACTION:
      const { messageId: interactionMessageId, interaction } = action.payload;
      return {
        ...state,
        messageInteractions: {
          ...state.messageInteractions,
          [interactionMessageId]: {
            ...state.messageInteractions[interactionMessageId],
            ...interaction,
            updatedAt: new Date(),
          },
        },
      };

    case MESSAGE_ACTIONS.ADD_REACTION:
      const { messageId: reactionMessageId, emoji, userId } = action.payload;
      const currentReactions = state.messageReactions[reactionMessageId] || {};
      const emojiReactions = currentReactions[emoji] || [];
      
      return {
        ...state,
        messageReactions: {
          ...state.messageReactions,
          [reactionMessageId]: {
            ...currentReactions,
            [emoji]: [...emojiReactions.filter(id => id !== userId), userId],
          },
        },
      };

    case MESSAGE_ACTIONS.REMOVE_REACTION:
      const { messageId: removeReactionMessageId, emoji: removeEmoji, userId: removeUserId } = action.payload;
      const currentRemoveReactions = state.messageReactions[removeReactionMessageId] || {};
      const removeEmojiReactions = currentRemoveReactions[removeEmoji] || [];
      
      return {
        ...state,
        messageReactions: {
          ...state.messageReactions,
          [removeReactionMessageId]: {
            ...currentRemoveReactions,
            [removeEmoji]: removeEmojiReactions.filter(id => id !== removeUserId),
          },
        },
      };

    case MESSAGE_ACTIONS.EDIT_MESSAGE_START:
      return {
        ...state,
        operationErrors: {
          ...state.operationErrors,
          [`edit_${action.payload.messageId}`]: null,
        },
      };

    case MESSAGE_ACTIONS.EDIT_MESSAGE_SUCCESS:
      const { messageId: editMessageId, newContent, editHistory } = action.payload;
      const editedMessage = state.currentChatMessages.find(m => m.id === editMessageId);
      
      if (!editedMessage) return state;

      // Update message content and edit history
      const updatedMessagesByChat9 = updateMessageInChat(
        state,
        editedMessage.chat_session_id,
        editMessageId,
        {
          content: newContent,
          edited: true,
          editedAt: new Date(),
        }
      );

      return {
        ...state,
        messagesByChat: updatedMessagesByChat9,
        currentChatMessages: editedMessage.chat_session_id === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat9 })
          : state.currentChatMessages,
        editHistory: {
          ...state.editHistory,
          [editMessageId]: editHistory,
        },
      };

    case MESSAGE_ACTIONS.REGENERATE_START:
      return {
        ...state,
        isRegenerating: true,
        messageError: null,
      };

    case MESSAGE_ACTIONS.REGENERATE_SUCCESS:
      const regeneratedMessage = action.payload.message;
      const updatedMessagesByChat10 = addMessageToChat(state, regeneratedMessage.chat_session_id, regeneratedMessage);

      return {
        ...state,
        messagesByChat: updatedMessagesByChat10,
        currentChatMessages: regeneratedMessage.chat_session_id === state.currentChatId 
          ? getCurrentChatMessages({ ...state, messagesByChat: updatedMessagesByChat10 })
          : state.currentChatMessages,
        isRegenerating: false,
        messageError: null,
      };

    case MESSAGE_ACTIONS.REGENERATE_FAILURE:
      return {
        ...state,
        isRegenerating: false,
        messageError: action.payload.error,
      };

    case MESSAGE_ACTIONS.SET_ACTIVE_BRANCH:
      return {
        ...state,
        activeBranch: action.payload.branchId,
      };

    case MESSAGE_ACTIONS.LOAD_BRANCHES:
      return {
        ...state,
        branches: action.payload.branches,
      };

    case MESSAGE_ACTIONS.CREATE_BRANCH:
      const newBranch = action.payload.branch;
      return {
        ...state,
        branches: [...state.branches, newBranch],
        activeBranch: newBranch.id,
      };

    case MESSAGE_ACTIONS.SWITCH_BRANCH:
      const { branchId, messages: branchMessages } = action.payload;
      return {
        ...state,
        activeBranch: branchId,
        currentChatMessages: branchMessages,
      };

    case MESSAGE_ACTIONS.DELETE_BRANCH:
      const deletedBranchId = action.payload.branchId;
      return {
        ...state,
        branches: state.branches.filter(b => b.id !== deletedBranchId),
        activeBranch: state.activeBranch === deletedBranchId ? null : state.activeBranch,
      };

    case MESSAGE_ACTIONS.SEARCH_START:
      return {
        ...state,
        isSearching: true,
        searchResults: [],
        searchMetadata: null,
      };

    case MESSAGE_ACTIONS.SEARCH_SUCCESS:
      return {
        ...state,
        isSearching: false,
        searchResults: action.payload.messages,
        searchQuery: action.payload.query,
        searchMetadata: action.payload.metadata,
      };

    case MESSAGE_ACTIONS.SEARCH_FAILURE:
      return {
        ...state,
        isSearching: false,
        messageError: action.payload.error,
      };

    case MESSAGE_ACTIONS.CLEAR_SEARCH:
      return {
        ...state,
        searchResults: [],
        searchQuery: '',
        searchMetadata: null,
        isSearching: false,
      };

    case MESSAGE_ACTIONS.SET_MESSAGE_FILTERS:
      return {
        ...state,
        messageFilters: {
          ...state.messageFilters,
          ...action.payload.filters,
        },
      };

    case MESSAGE_ACTIONS.CLEAR_MESSAGE_FILTERS:
      return {
        ...state,
        messageFilters: {
          role: null,
          type: null,
          status: null,
          dateRange: { from: null, to: null },
          hasInteractions: false,
        },
      };

    case MESSAGE_ACTIONS.UPDATE_COMPOSING_MESSAGE:
      return {
        ...state,
        composingMessage: {
          ...state.composingMessage,
          ...action.payload.updates,
          isDirty: true,
        },
      };

    case MESSAGE_ACTIONS.CLEAR_COMPOSING_MESSAGE:
      return {
        ...state,
        composingMessage: {
          content: '',
          type: MESSAGE_TYPES.TEXT,
          responseFormat: RESPONSE_FORMATS.MARKDOWN,
          isDirty: false,
        },
      };

    case MESSAGE_ACTIONS.SAVE_DRAFT:
      // Save to localStorage or service
      const draftKey = `message_draft_${action.payload.chatId}`;
      localStorage.setItem(draftKey, JSON.stringify(state.composingMessage));
      return {
        ...state,
        composingMessage: {
          ...state.composingMessage,
          isDirty: false,
        },
      };

    case MESSAGE_ACTIONS.LOAD_DRAFT:
      const loadDraftKey = `message_draft_${action.payload.chatId}`;
      const savedDraft = localStorage.getItem(loadDraftKey);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          return {
            ...state,
            composingMessage: {
              ...draft,
              isDirty: !!draft.content,
            },
          };
        } catch (error) {
          console.error('Failed to load draft:', error);
          localStorage.removeItem(loadDraftKey);
        }
      }
      return state;

    case MESSAGE_ACTIONS.SET_CURRENT_CHAT:
      const newChatId = action.payload.chatId;
      return {
        ...state,
        currentChatId: newChatId,
        currentChatMessages: getCurrentChatMessages({ ...state, currentChatId: newChatId }),
      };

    case MESSAGE_ACTIONS.CLEAR_CURRENT_CHAT:
      return {
        ...state,
        currentChatId: null,
        currentChatMessages: [],
        activeBranch: null,
        composingMessage: {
          content: '',
          type: MESSAGE_TYPES.TEXT,
          responseFormat: RESPONSE_FORMATS.MARKDOWN,
          isDirty: false,
        },
      };

    case MESSAGE_ACTIONS.TYPING_START:
      const { chatId: typingChatId, userId: typingUserId } = action.payload;
      return {
        ...state,
        typingIndicators: {
          ...state.typingIndicators,
          [typingChatId]: {
            ...state.typingIndicators[typingChatId],
            [typingUserId]: new Date(),
          },
        },
      };

    case MESSAGE_ACTIONS.TYPING_STOP:
      const { chatId: stopTypingChatId, userId: stopTypingUserId } = action.payload;
      const updatedTypingIndicators = { ...state.typingIndicators };
      
      if (updatedTypingIndicators[stopTypingChatId]) {
        delete updatedTypingIndicators[stopTypingChatId][stopTypingUserId];
        
        // Clean up empty chat entries
        if (Object.keys(updatedTypingIndicators[stopTypingChatId]).length === 0) {
          delete updatedTypingIndicators[stopTypingChatId];
        }
      }

      return {
        ...state,
        typingIndicators: updatedTypingIndicators,
      };

    case MESSAGE_ACTIONS.TYPING_TIMEOUT:
      const { chatId: timeoutChatId, userId: timeoutUserId } = action.payload;
      const timeoutTypingIndicators = { ...state.typingIndicators };
      
      if (timeoutTypingIndicators[timeoutChatId] && timeoutTypingIndicators[timeoutChatId][timeoutUserId]) {
        delete timeoutTypingIndicators[timeoutChatId][timeoutUserId];
        
        if (Object.keys(timeoutTypingIndicators[timeoutChatId]).length === 0) {
          delete timeoutTypingIndicators[timeoutChatId];
        }
      }

      return {
        ...state,
        typingIndicators: timeoutTypingIndicators,
      };

    case MESSAGE_ACTIONS.ADD_PENDING_MESSAGE:
      return {
        ...state,
        pendingMessages: [...state.pendingMessages, action.payload.message],
      };

    case MESSAGE_ACTIONS.REMOVE_PENDING_MESSAGE:
      return {
        ...state,
        pendingMessages: state.pendingMessages.filter(m => m.id !== action.payload.messageId),
      };

    case MESSAGE_ACTIONS.ADD_FAILED_MESSAGE:
      return {
        ...state,
        failedMessages: [...state.failedMessages, action.payload.message],
      };

    case MESSAGE_ACTIONS.RETRY_FAILED_MESSAGE:
      const retryMessageId = action.payload.messageId;
      const messageToRetry = state.failedMessages.find(m => m.id === retryMessageId);
      
      if (messageToRetry) {
        return {
          ...state,
          failedMessages: state.failedMessages.filter(m => m.id !== retryMessageId),
          pendingMessages: [...state.pendingMessages, messageToRetry],
        };
      }
      return state;

    case MESSAGE_ACTIONS.CLEAR_FAILED_MESSAGES:
      return {
        ...state,
        failedMessages: [],
      };

    case MESSAGE_ACTIONS.ADD_TO_SEND_QUEUE:
      return {
        ...state,
        sendQueue: [...state.sendQueue, action.payload.message],
      };

    case MESSAGE_ACTIONS.REMOVE_FROM_SEND_QUEUE:
      return {
        ...state,
        sendQueue: state.sendQueue.filter(m => m.id !== action.payload.messageId),
      };

    case MESSAGE_ACTIONS.PROCESS_SEND_QUEUE:
      return {
        ...state,
        processingQueue: action.payload.processing,
      };

    case MESSAGE_ACTIONS.CLEAR_SEND_QUEUE:
      return {
        ...state,
        sendQueue: [],
        processingQueue: false,
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_ANALYTICS:
      return {
        ...state,
        messageAnalytics: {
          ...state.messageAnalytics,
          [action.payload.chatId]: action.payload.analytics,
        },
      };

    case MESSAGE_ACTIONS.UPDATE_UNREAD_COUNT:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.chatId]: action.payload.count,
        },
      };

    case MESSAGE_ACTIONS.MARK_MESSAGES_READ:
      const { chatId: readChatIdMark } = action.payload;
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [readChatIdMark]: 0,
        },
        lastSeenTimestamps: {
          ...state.lastSeenTimestamps,
          [readChatIdMark]: new Date(),
        },
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_STATS:
      return {
        ...state,
        messageStats: {
          ...state.messageStats,
          ...action.payload.stats,
        },
      };

    case MESSAGE_ACTIONS.ADD_ATTACHMENT:
      const { messageId: attachMessageId, attachment } = action.payload;
      return {
        ...state,
        attachments: {
          ...state.attachments,
          [attachMessageId]: [...(state.attachments[attachMessageId] || []), attachment],
        },
      };

    case MESSAGE_ACTIONS.REMOVE_ATTACHMENT:
      const { messageId: removeAttachMessageId, attachmentId } = action.payload;
      return {
        ...state,
        attachments: {
          ...state.attachments,
          [removeAttachMessageId]: (state.attachments[removeAttachMessageId] || []).filter(
            att => att.id !== attachmentId
          ),
        },
      };

    case MESSAGE_ACTIONS.UPDATE_ATTACHMENT:
      const { messageId: updateAttachMessageId, attachmentId: updateAttachmentId, updates } = action.payload;
      return {
        ...state,
        attachments: {
          ...state.attachments,
          [updateAttachMessageId]: (state.attachments[updateAttachMessageId] || []).map(
            att => att.id === updateAttachmentId ? { ...att, ...updates } : att
          ),
        },
      };

    case MESSAGE_ACTIONS.SELECT_MESSAGE:
      const { chatId: selectChatId, messageId: selectMessageId } = action.payload;
      const currentSelection = state.messageSelection[selectChatId] || [];
      
      if (!currentSelection.includes(selectMessageId)) {
        return {
          ...state,
          messageSelection: {
            ...state.messageSelection,
            [selectChatId]: [...currentSelection, selectMessageId],
          },
        };
      }
      return state;

    case MESSAGE_ACTIONS.DESELECT_MESSAGE:
      const { chatId: deselectChatId, messageId: deselectMessageId } = action.payload;
      return {
        ...state,
        messageSelection: {
          ...state.messageSelection,
          [deselectChatId]: (state.messageSelection[deselectChatId] || []).filter(
            id => id !== deselectMessageId
          ),
        },
      };

    case MESSAGE_ACTIONS.SELECT_ALL_MESSAGES:
      const { chatId: selectAllChatId } = action.payload;
      const chatMessages = state.messagesByChat[selectAllChatId];
      
      if (chatMessages) {
        return {
          ...state,
          messageSelection: {
            ...state.messageSelection,
            [selectAllChatId]: chatMessages.messages.map(m => m.id),
          },
        };
      }
      return state;

    case MESSAGE_ACTIONS.CLEAR_MESSAGE_SELECTION:
      const { chatId: clearSelectionChatId } = action.payload;
      
      if (clearSelectionChatId) {
        return {
          ...state,
          messageSelection: {
            ...state.messageSelection,
            [clearSelectionChatId]: [],
          },
        };
      } else {
        return {
          ...state,
          messageSelection: {},
        };
      }

    case MESSAGE_ACTIONS.EXPORT_START:
      return {
        ...state,
        exportStatus: {
          inProgress: true,
          progress: 0,
          format: action.payload.format,
        },
      };

    case MESSAGE_ACTIONS.EXPORT_PROGRESS:
      return {
        ...state,
        exportStatus: {
          ...state.exportStatus,
          progress: action.payload.progress,
        },
      };

    case MESSAGE_ACTIONS.EXPORT_SUCCESS:
      return {
        ...state,
        exportStatus: {
          inProgress: false,
          progress: 100,
          format: null,
        },
      };

    case MESSAGE_ACTIONS.EXPORT_FAILURE:
      return {
        ...state,
        exportStatus: {
          inProgress: false,
          progress: 0,
          format: null,
        },
        messageError: action.payload.error,
      };

    case MESSAGE_ACTIONS.SET_ERROR:
      return {
        ...state,
        messageError: action.payload.error,
      };

    case MESSAGE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        messageError: null,
      };

    case MESSAGE_ACTIONS.SET_STREAMING_ERROR:
      return {
        ...state,
        streamingErrors: {
          ...state.streamingErrors,
          [action.payload.streamId]: action.payload.error,
        },
      };

    case MESSAGE_ACTIONS.CLEAR_STREAMING_ERROR:
      const { streamId: clearStreamId } = action.payload;
      const newStreamingErrors = { ...state.streamingErrors };
      delete newStreamingErrors[clearStreamId];
      
      return {
        ...state,
        streamingErrors: newStreamingErrors,
      };

    case MESSAGE_ACTIONS.SET_OPERATION_ERROR:
      return {
        ...state,
        operationErrors: {
          ...state.operationErrors,
          [action.payload.operation]: action.payload.error,
        },
      };

    case MESSAGE_ACTIONS.CLEAR_OPERATION_ERROR:
      const { operation } = action.payload;
      const newOperationErrors = { ...state.operationErrors };
      delete newOperationErrors[operation];
      
      return {
        ...state,
        operationErrors: newOperationErrors,
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_CACHE:
      return {
        ...state,
        messageCache: {
          ...state.messageCache,
          [action.payload.messageId]: action.payload.content,
        },
      };

    case MESSAGE_ACTIONS.CLEAR_MESSAGE_CACHE:
      const { messageId: clearCacheMessageId } = action.payload;
      
      if (clearCacheMessageId) {
        const newMessageCache = { ...state.messageCache };
        delete newMessageCache[clearCacheMessageId];
        
        return {
          ...state,
          messageCache: newMessageCache,
        };
      } else {
        return {
          ...state,
          messageCache: {},
        };
      }

    case MESSAGE_ACTIONS.INVALIDATE_CACHE:
      const { chatId: invalidateChatId } = action.payload;
      
      if (invalidateChatId) {
        return {
          ...state,
          messagesByChat: {
            ...state.messagesByChat,
            [invalidateChatId]: {
              ...state.messagesByChat[invalidateChatId],
              lastFetched: null,
            },
          },
        };
      } else {
        const invalidatedMessagesByChat = {};
        Object.keys(state.messagesByChat).forEach(chatId => {
          invalidatedMessagesByChat[chatId] = {
            ...state.messagesByChat[chatId],
            lastFetched: null,
          };
        });
        
        return {
          ...state,
          messagesByChat: invalidatedMessagesByChat,
        };
      }

    case MESSAGE_ACTIONS.UPDATE_CONVERSATION_MEMORY:
      return {
        ...state,
        conversationMemory: {
          ...state.conversationMemory,
          [action.payload.chatId]: action.payload.memory,
        },
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_THREADS:
      return {
        ...state,
        messageThreads: {
          ...state.messageThreads,
          [action.payload.chatId]: action.payload.threads,
        },
      };

    case MESSAGE_ACTIONS.START_COLLABORATIVE_EDIT:
      return {
        ...state,
        collaborativeEdits: {
          ...state.collaborativeEdits,
          [action.payload.messageId]: {
            isActive: true,
            participants: action.payload.participants,
            startTime: new Date(),
          },
        },
      };

    case MESSAGE_ACTIONS.END_COLLABORATIVE_EDIT:
      const endEditMessageId = action.payload.messageId;
      const newCollaborativeEdits = { ...state.collaborativeEdits };
      delete newCollaborativeEdits[endEditMessageId];
      
      return {
        ...state,
        collaborativeEdits: newCollaborativeEdits,
      };

    default:
      return state;
  }
};

// Create context
const MessageContext = createContext();

// Provider component
export const MessageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(messageReducer, initialState);
  const { isAuthenticated, user } = useAuth();
  const { currentChatId } = useChat();

  // Set current chat when it changes
  useEffect(() => {
    if (currentChatId !== state.currentChatId) {
      dispatch({
        type: MESSAGE_ACTIONS.SET_CURRENT_CHAT,
        payload: { chatId: currentChatId },
      });
      
      // Load draft for this chat
      if (currentChatId) {
        dispatch({
          type: MESSAGE_ACTIONS.LOAD_DRAFT,
          payload: { chatId: currentChatId },
        });
      }
    }
  }, [currentChatId, state.currentChatId]);

  // Listen for message service changes
  useEffect(() => {
    const unsubscribe = messageService.onMessageChange((event) => {
      switch (event.action) {
        case 'sent':
          dispatch({
            type: MESSAGE_ACTIONS.SEND_MESSAGE_SUCCESS,
            payload: { message: event.message },
          });
          break;
        case 'received':
          dispatch({
            type: MESSAGE_ACTIONS.MESSAGE_RECEIVED,
            payload: { message: event.message },
          });
          break;
        case 'streaming_update':
          dispatch({
            type: MESSAGE_ACTIONS.STREAM_CHUNK,
            payload: {
              streamId: event.message.streamId,
              chunk: event.message.chunk,
              fullContent: event.message.content,
            },
          });
          break;
        case 'streaming_complete':
          dispatch({
            type: MESSAGE_ACTIONS.STREAM_COMPLETE,
            payload: {
              streamId: event.message.streamId,
              finalContent: event.message.content,
              metadata: event.message.metadata,
            },
          });
          break;
        case 'streaming_failed':
          dispatch({
            type: MESSAGE_ACTIONS.STREAM_ERROR,
            payload: {
              streamId: event.message.streamId,
              error: event.message.error,
            },
          });
          break;
        case 'regenerated':
          dispatch({
            type: MESSAGE_ACTIONS.REGENERATE_SUCCESS,
            payload: { message: event.message },
          });
          break;
        case 'interaction_updated':
          dispatch({
            type: MESSAGE_ACTIONS.UPDATE_MESSAGE_INTERACTION,
            payload: {
              messageId: event.message.id,
              interaction: event.message.interaction,
            },
          });
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Auto-save drafts
  useEffect(() => {
    if (state.composingMessage.isDirty && state.currentChatId) {
      const saveTimeout = setTimeout(() => {
        dispatch({
          type: MESSAGE_ACTIONS.SAVE_DRAFT,
          payload: { chatId: state.currentChatId },
        });
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(saveTimeout);
    }
  }, [state.composingMessage, state.currentChatId]);

  // Action creators
  const sendMessage = useCallback(async (chatId, content, options = {}) => {
    dispatch({ type: MESSAGE_ACTIONS.SEND_MESSAGE_START });

    try {
      const result = await messageService.sendMessage(chatId, content, options);
      
      // Success will be handled by the message service listener
      return { success: true, message: result.message };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: MESSAGE_ACTIONS.SEND_MESSAGE_FAILURE,
        payload: { 
          error: errorMessage,
          message: { chatId, content, options, timestamp: new Date() },
        },
      });

      throw error;
    }
  }, []);

  const loadMessages = useCallback(async (chatId, options = {}) => {
    dispatch({ type: MESSAGE_ACTIONS.FETCH_MESSAGES_START });

    try {
      const result = await messageService.getMessages(chatId, options);
      
      dispatch({
        type: MESSAGE_ACTIONS.FETCH_MESSAGES_SUCCESS,
        payload: {
          chatId,
          messages: result.messages,
          pagination: result.pagination,
          fromCache: result.fromCache,
        },
      });

      return { success: true, messages: result.messages };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: MESSAGE_ACTIONS.FETCH_MESSAGES_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const regenerateMessage = useCallback(async (chatId, messageId, options = {}) => {
    dispatch({ type: MESSAGE_ACTIONS.REGENERATE_START });

    try {
      const result = await messageService.regenerateMessage(chatId, messageId, options);
      
      // Success will be handled by the message service listener
      return { success: true, message: result.message };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: MESSAGE_ACTIONS.REGENERATE_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const updateMessageInteraction = useCallback(async (chatId, messageId, interaction) => {
    try {
      await messageService.updateMessageInteraction(chatId, messageId, interaction);
      
      // Update will be handled by the message service listener
      return { success: true };
    } catch (error) {
      throw error;
    }
  }, []);

  const searchMessages = useCallback(async (query, options = {}) => {
    dispatch({ type: MESSAGE_ACTIONS.SEARCH_START });

    try {
      const result = await messageService.searchMessages(query, options);
      
      dispatch({
        type: MESSAGE_ACTIONS.SEARCH_SUCCESS,
        payload: {
          messages: result.messages,
          query: result.query,
          metadata: result.searchMetadata,
        },
      });

      return { success: true, results: result };
    } catch (error) {
      const errorMessage = errorService.getUserFriendlyMessage(error);
      
      dispatch({
        type: MESSAGE_ACTIONS.SEARCH_FAILURE,
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_SEARCH });
  }, []);

  const setMessageFilters = useCallback((filters) => {
    dispatch({
      type: MESSAGE_ACTIONS.SET_MESSAGE_FILTERS,
      payload: { filters },
    });
  }, []);

  const clearMessageFilters = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGE_FILTERS });
  }, []);

  const updateComposingMessage = useCallback((updates) => {
    dispatch({
      type: MESSAGE_ACTIONS.UPDATE_COMPOSING_MESSAGE,
      payload: { updates },
    });
  }, []);

  const clearComposingMessage = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_COMPOSING_MESSAGE });
  }, []);

  const setTypingIndicator = useCallback((chatId, userId, isTyping) => {
    if (isTyping) {
      dispatch({
        type: MESSAGE_ACTIONS.TYPING_START,
        payload: { chatId, userId },
      });
    } else {
      dispatch({
        type: MESSAGE_ACTIONS.TYPING_STOP,
        payload: { chatId, userId },
      });
    }
  }, []);

  const startStreaming = useCallback((messageId, streamId) => {
    dispatch({
      type: MESSAGE_ACTIONS.STREAM_START,
      payload: { messageId, streamId, chatId: state.currentChatId },
    });
  }, [state.currentChatId]);

  const markMessagesAsRead = useCallback((chatId) => {
    dispatch({
      type: MESSAGE_ACTIONS.MARK_MESSAGES_READ,
      payload: { chatId },
    });
  }, []);

  const selectMessage = useCallback((chatId, messageId) => {
    dispatch({
      type: MESSAGE_ACTIONS.SELECT_MESSAGE,
      payload: { chatId, messageId },
    });
  }, []);

  const deselectMessage = useCallback((chatId, messageId) => {
    dispatch({
      type: MESSAGE_ACTIONS.DESELECT_MESSAGE,
      payload: { chatId, messageId },
    });
  }, []);

  const selectAllMessages = useCallback((chatId) => {
    dispatch({
      type: MESSAGE_ACTIONS.SELECT_ALL_MESSAGES,
      payload: { chatId },
    });
  }, []);

  const clearMessageSelection = useCallback((chatId = null) => {
    dispatch({
      type: MESSAGE_ACTIONS.CLEAR_MESSAGE_SELECTION,
      payload: { chatId },
    });
  }, []);

  const retryFailedMessage = useCallback((messageId) => {
    dispatch({
      type: MESSAGE_ACTIONS.RETRY_FAILED_MESSAGE,
      payload: { messageId },
    });
  }, []);

  const clearFailedMessages = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_FAILED_MESSAGES });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_ERROR });
  }, []);

  // Helper functions
  const getMessagesForChat = useCallback((chatId) => {
    const chatMessages = state.messagesByChat[chatId];
    return chatMessages ? chatMessages.messages : [];
  }, [state.messagesByChat]);

  const getMessageById = useCallback((messageId) => {
    for (const chatData of Object.values(state.messagesByChat)) {
      const message = chatData.messages.find(m => m.id === messageId);
      if (message) return message;
    }
    return null;
  }, [state.messagesByChat]);

  const getUnreadCount = useCallback((chatId) => {
    return state.unreadCounts[chatId] || 0;
  }, [state.unreadCounts]);

  const isMessageSelected = useCallback((chatId, messageId) => {
    const selection = state.messageSelection[chatId] || [];
    return selection.includes(messageId);
  }, [state.messageSelection]);

  const getSelectedMessages = useCallback((chatId) => {
    return state.messageSelection[chatId] || [];
  }, [state.messageSelection]);

  const getTypingUsers = useCallback((chatId) => {
    const typing = state.typingIndicators[chatId] || {};
    return Object.keys(typing);
  }, [state.typingIndicators]);

  const isStreamingActive = useCallback((messageId) => {
    return Object.values(state.streamingMessages).some(stream => stream.messageId === messageId);
  }, [state.streamingMessages]);

  const getStreamingContent = useCallback((streamId) => {
    return state.streamingMessages[streamId]?.content || '';
  }, [state.streamingMessages]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    sendMessage,
    loadMessages,
    regenerateMessage,
    updateMessageInteraction,
    searchMessages,
    clearSearch,
    setMessageFilters,
    clearMessageFilters,
    updateComposingMessage,
    clearComposingMessage,
    setTypingIndicator,
    startStreaming,
    markMessagesAsRead,
    selectMessage,
    deselectMessage,
    selectAllMessages,
    clearMessageSelection,
    retryFailedMessage,
    clearFailedMessages,
    clearError,
    
    // Helper functions
    getMessagesForChat,
    getMessageById,
    getUnreadCount,
    isMessageSelected,
    getSelectedMessages,
    getTypingUsers,
    isStreamingActive,
    getStreamingContent,
    
    // Computed values
    hasMessages: state.currentChatMessages.length > 0,
    hasUnreadMessages: Object.values(state.unreadCounts).some(count => count > 0),
    totalUnreadCount: Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0),
    hasSelectedMessages: Object.values(state.messageSelection).some(selection => selection.length > 0),
    isSearchActive: !!state.searchQuery,
    hasSearchResults: state.searchResults.length > 0,
    hasTypingUsers: Object.keys(state.typingIndicators).length > 0,
    hasActiveStreams: state.activeStreams.size > 0,
    hasPendingMessages: state.pendingMessages.length > 0,
    hasFailedMessages: state.failedMessages.length > 0,
    isComposingMessageDirty: state.composingMessage.isDirty,
    currentChatMessageCount: state.currentChatMessages.length,
    currentChatSelectedCount: getSelectedMessages(state.currentChatId).length,
    currentChatUnreadCount: getUnreadCount(state.currentChatId),
    currentChatTypingUsers: getTypingUsers(state.currentChatId),
  };

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
};

// Custom hook to use message context
export const useMessage = () => {
  const context = useContext(MessageContext);
  
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  
  return context;
};

// Hook for message streaming
export const useMessageStreaming = (messageId) => {
  const { 
    streamingMessages, 
    activeStreams, 
    isStreamingActive, 
    getStreamingContent 
  } = useMessage();

  const isStreaming = isStreamingActive(messageId);
  const streamId = Object.keys(streamingMessages).find(
    id => streamingMessages[id].messageId === messageId
  );
  const content = streamId ? getStreamingContent(streamId) : '';
  const streamData = streamId ? streamingMessages[streamId] : null;

  return {
    isStreaming,
    content,
    streamId,
    streamData,
    chunks: streamData?.chunks || [],
    startTime: streamData?.startTime,
    lastUpdate: streamData?.lastUpdate,
  };
};

// Hook for message interactions
export const useMessageInteractions = (messageId) => {
  const { 
    messageInteractions, 
    updateMessageInteraction,
    currentChatId 
  } = useMessage();

  const interaction = messageInteractions[messageId] || {};

  const rateMessage = useCallback(async (rating) => {
    if (!currentChatId) return;
    return updateMessageInteraction(currentChatId, messageId, { helpful_rating: rating });
  }, [currentChatId, messageId, updateMessageInteraction]);

  const bookmarkMessage = useCallback(async (bookmarked = true) => {
    if (!currentChatId) return;
    return updateMessageInteraction(currentChatId, messageId, { bookmarked });
  }, [currentChatId, messageId, updateMessageInteraction]);

  const addFeedback = useCallback(async (feedback) => {
    if (!currentChatId) return;
    return updateMessageInteraction(currentChatId, messageId, { feedback });
  }, [currentChatId, messageId, updateMessageInteraction]);

  return {
    interaction,
    rating: interaction.helpful_rating,
    isBookmarked: interaction.bookmarked || false,
    feedback: interaction.feedback,
    rateMessage,
    bookmarkMessage,
    addFeedback,
  };
};

// Hook for message composition
export const useMessageComposition = () => {
  const {
    composingMessage,
    updateComposingMessage,
    clearComposingMessage,
    sendMessage,
    currentChatId,
    isSendingMessage,
  } = useMessage();

  const updateContent = useCallback((content) => {
    updateComposingMessage({ content });
  }, [updateComposingMessage]);

  const updateType = useCallback((type) => {
    updateComposingMessage({ type });
  }, [updateComposingMessage]);

  const updateResponseFormat = useCallback((responseFormat) => {
    updateComposingMessage({ responseFormat });
  }, [updateComposingMessage]);

  const send = useCallback(async (options = {}) => {
    if (!currentChatId || !composingMessage.content.trim()) {
      throw new Error('Cannot send empty message or no chat selected');
    }

    const messageOptions = {
      messageType: composingMessage.type,
      responseFormat: composingMessage.responseFormat,
      ...options,
    };

    const result = await sendMessage(currentChatId, composingMessage.content, messageOptions);
    
    if (result.success) {
      clearComposingMessage();
    }
    
    return result;
  }, [currentChatId, composingMessage, sendMessage, clearComposingMessage]);

  const canSend = composingMessage.content.trim().length > 0 && 
                  currentChatId && 
                  !isSendingMessage;

  return {
    composingMessage,
    updateContent,
    updateType,
    updateResponseFormat,
    clearComposingMessage,
    send,
    canSend,
    isDirty: composingMessage.isDirty,
    isSending: isSendingMessage,
  };
};

// Hook for message search
export const useMessageSearch = () => {
  const {
    searchResults,
    searchQuery,
    searchMetadata,
    isSearching,
    searchMessages,
    clearSearch,
  } = useMessage();

  const search = useCallback(async (query, options = {}) => {
    if (!query.trim()) {
      clearSearch();
      return;
    }

    return searchMessages(query, options);
  }, [searchMessages, clearSearch]);

  return {
    results: searchResults,
    query: searchQuery,
    metadata: searchMetadata,
    isSearching,
    search,
    clearSearch,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length,
  };
};

// Hook for typing indicators
export const useTypingIndicators = (chatId) => {
  const { 
    getTypingUsers, 
    setTypingIndicator,
    user 
  } = useMessage();
  const { isAuthenticated } = useAuth();

  const [isTyping, setIsTyping] = React.useState(false);
  const typingTimeoutRef = React.useRef(null);

  const startTyping = useCallback(() => {
    if (!isAuthenticated || !user?.id || !chatId) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingIndicator(chatId, user.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingIndicator(chatId, user.id, false);
    }, 1000);
  }, [chatId, isTyping, setTypingIndicator, user?.id, isAuthenticated]);

  const stopTyping = useCallback(() => {
    if (isTyping && user?.id) {
      setIsTyping(false);
      setTypingIndicator(chatId, user.id, false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [chatId, isTyping, setTypingIndicator, user?.id]);

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const typingUsers = getTypingUsers(chatId).filter(userId => userId !== user?.id);

  return {
    isTyping,
    startTyping,
    stopTyping,
    typingUsers,
    hasTypingUsers: typingUsers.length > 0,
    typingCount: typingUsers.length,
  };
};

// Hook for message selection
export const useMessageSelection = (chatId) => {
  const {
    getSelectedMessages,
    isMessageSelected,
    selectMessage,
    deselectMessage,
    selectAllMessages,
    clearMessageSelection,
    getMessagesForChat,
  } = useMessage();

  const selectedMessages = getSelectedMessages(chatId);
  const allMessages = getMessagesForChat(chatId);

  const toggleMessage = useCallback((messageId) => {
    if (isMessageSelected(chatId, messageId)) {
      deselectMessage(chatId, messageId);
    } else {
      selectMessage(chatId, messageId);
    }
  }, [chatId, isMessageSelected, selectMessage, deselectMessage]);

  const selectAll = useCallback(() => {
    selectAllMessages(chatId);
  }, [chatId, selectAllMessages]);

  const clearSelection = useCallback(() => {
    clearMessageSelection(chatId);
  }, [chatId, clearMessageSelection]);

  const isSelected = useCallback((messageId) => {
    return isMessageSelected(chatId, messageId);
  }, [chatId, isMessageSelected]);

  return {
    selectedMessages,
    selectedCount: selectedMessages.length,
    hasSelection: selectedMessages.length > 0,
    isAllSelected: selectedMessages.length === allMessages.length && allMessages.length > 0,
    toggleMessage,
    selectAll,
    clearSelection,
    isSelected,
  };
};

// Hook for message analytics
export const useMessageAnalytics = (chatId) => {
  const { messageAnalytics } = useMessage();

  const analytics = chatId ? messageAnalytics[chatId] : null;

  const getMessageStats = useCallback(() => {
    if (!analytics) return null;

    return {
      totalMessages: analytics.total || 0,
      userMessages: analytics.byRole?.user || 0,
      assistantMessages: analytics.byRole?.assistant || 0,
      averageLength: analytics.averageLength || 0,
      totalLength: analytics.totalLength || 0,
      ratingsCount: analytics.ratings?.total || 0,
      averageRating: analytics.ratings?.average || 0,
      bookmarkedCount: analytics.interactions?.bookmarked || 0,
      withFeedbackCount: analytics.interactions?.withFeedback || 0,
    };
  }, [analytics]);

  return {
    analytics,
    stats: getMessageStats(),
    hasAnalytics: !!analytics,
  };
};

// Higher-order component for message-dependent components
export const withMessages = (Component) => {
  return function MessageComponent(props) {
    const { hasMessages, isLoadingMessages } = useMessage();
    
    if (isLoadingMessages) {
      return <div>Loading messages...</div>; // Replace with your loading component
    }
    
    if (!hasMessages) {
      return <div>No messages yet. Start a conversation!</div>; // Replace with appropriate message
    }
    
    return <Component {...props} />;
  };
};

// Higher-order component for streaming messages
export const withStreaming = (Component) => {
  return function StreamingComponent(props) {
    const { hasActiveStreams } = useMessage();
    
    return <Component {...props} hasActiveStreams={hasActiveStreams} />;
  };
};

// Hook for message export
export const useMessageExport = () => {
  const { 
    exportStatus,
    currentChatId,
    getMessagesForChat 
  } = useMessage();

  const exportMessages = useCallback(async (format = 'json', options = {}) => {
    if (!currentChatId) {
      throw new Error('No chat selected for export');
    }

    try {
      const messages = getMessagesForChat(currentChatId);
      const exported = messageService.exportMessages(currentChatId, format);
      
      return {
        success: true,
        ...exported,
      };
    } catch (error) {
      throw error;
    }
  }, [currentChatId, getMessagesForChat]);

  const downloadExport = useCallback(async (format = 'json') => {
    if (!currentChatId) {
      throw new Error('No chat selected for download');
    }

    try {
      const result = messageService.downloadMessages(currentChatId, format);
      return result;
    } catch (error) {
      throw error;
    }
  }, [currentChatId]);

  return {
    exportStatus,
    exportMessages,
    downloadExport,
    isExporting: exportStatus.inProgress,
    exportProgress: exportStatus.progress,
    canExport: !!currentChatId,
  };
};

// Hook for offline message handling
export const useOfflineMessages = () => {
  const {
    pendingMessages,
    failedMessages,
    retryFailedMessage,
    clearFailedMessages,
  } = useMessage();

  const retryMessage = useCallback((messageId) => {
    retryFailedMessage(messageId);
  }, [retryFailedMessage]);

  const retryAllFailed = useCallback(() => {
    failedMessages.forEach(message => {
      retryFailedMessage(message.id);
    });
  }, [failedMessages, retryFailedMessage]);

  const clearFailed = useCallback(() => {
    clearFailedMessages();
  }, [clearFailedMessages]);

  return {
    pendingMessages,
    failedMessages,
    hasPendingMessages: pendingMessages.length > 0,
    hasFailedMessages: failedMessages.length > 0,
    pendingCount: pendingMessages.length,
    failedCount: failedMessages.length,
    retryMessage,
    retryAllFailed,
    clearFailed,
  };
};

// Development helpers
export const MessageDevTools = () => {
  const message = useMessage();
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Expose message context to window for debugging
      window.__LAWBUDDY_MESSAGE__ = message;
      
      console.log('LawBuddy Message DevTools loaded. Access via window.__LAWBUDDY_MESSAGE__');
    }
  }, [message]);

  return null;
};

export default MessageContext;