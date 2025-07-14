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

    case MESSAGE_ACTIONS.SEARCH