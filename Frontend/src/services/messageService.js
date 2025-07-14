// src/services/messageService.js - Message operations and management
import apiService from './api.js';
import errorService, { ValidationError } from './errorService.js';
import { 
  API_ENDPOINTS, 
  MESSAGE_ROLES, 
  MESSAGE_TYPES, 
  MESSAGE_STATUS,
  RESPONSE_FORMATS,
  PAGINATION,
  VALIDATION
} from './constants.js';

class MessageService {
  constructor() {
    this.messageListeners = [];
    this.messageCache = new Map(); // chatId -> messages[]
    this.streamingMessages = new Map(); // streamId -> message data
    this.messageStatuses = new Map(); // messageId -> status
  }

  /**
   * Send message to chat
   */
  async sendMessage(chatId, content, options = {}) {
    try {
      this.validateChatId(chatId);
      this.validateMessageContent(content);
      
      const payload = {
        content: content.trim(),
        role: options.role || MESSAGE_ROLES.USER,
        message_type: options.messageType || MESSAGE_TYPES.TEXT,
        response_format: options.responseFormat || RESPONSE_FORMATS.MARKDOWN,
      };

      const response = await apiService.post(
        API_ENDPOINTS.CHATS.MESSAGES(chatId),
        payload,
        {
          params: {
            regenerate: options.regenerate || false,
          }
        }
      );

      // Add to cache
      this.addMessageToCache(chatId, response);
      
      // Track message status
      this.setMessageStatus(response.id, response.status || MESSAGE_STATUS.COMPLETE);
      
      // Notify listeners
      this.notifyMessageChange('sent', response, chatId);
      
      return {
        success: true,
        message: response,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'sendMessage', chatId, contentLength: content.length }
      });
    }
  }

  /**
   * Get messages for a chat
   */
  async getMessages(chatId, options = {}) {
    try {
      this.validateChatId(chatId);
      
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedMessages(chatId);
        if (cached && cached.length > 0) {
          return {
            success: true,
            messages: cached,
            fromCache: true,
            pagination: {
              total: cached.length,
              page: 1,
              size: cached.length,
              hasNext: false,
            },
          };
        }
      }

      const params = {
        page: options.page || PAGINATION.DEFAULT_PAGE,
        size: options.size || 50,
      };

      if (options.branchId) {
        params.branch_id = options.branchId;
      }

      if (options.includeInactive) {
        params.include_inactive = options.includeInactive;
      }

      const response = await apiService.get(
        API_ENDPOINTS.CHATS.MESSAGES(chatId),
        { params }
      );

      // Cache messages
      this.setCachedMessages(chatId, response.messages);
      
      // Update message statuses
      response.messages.forEach(message => {
        this.setMessageStatus(message.id, message.status || MESSAGE_STATUS.COMPLETE);
      });
      
      return {
        success: true,
        messages: response.messages,
        fromCache: false,
        pagination: {
          total: response.total,
          page: response.page,
          size: response.size,
          hasNext: response.has_next,
        },
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getMessages', chatId, options }
      });
    }
  }

  /**
   * Regenerate message
   */
  async regenerateMessage(chatId, messageId, options = {}) {
    try {
      this.validateChatId(chatId);
      this.validateMessageId(messageId);
      
      const params = {
        response_format: options.responseFormat || RESPONSE_FORMATS.MARKDOWN,
      };

      const response = await apiService.post(
        API_ENDPOINTS.CHATS.REGENERATE(chatId, messageId),
        null,
        { params }
      );

      // Add to cache
      this.addMessageToCache(chatId, response);
      
      // Track message status
      this.setMessageStatus(response.id, response.status || MESSAGE_STATUS.PENDING);
      
      // Notify listeners
      this.notifyMessageChange('regenerated', response, chatId);
      
      return {
        success: true,
        message: response,
        originalMessageId: messageId,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'regenerateMessage', chatId, messageId }
      });
    }
  }

  /**
   * Update message interaction (rating, feedback, bookmark)
   */
  async updateMessageInteraction(chatId, messageId, interactionData) {
    try {
      this.validateChatId(chatId);
      this.validateMessageId(messageId);
      this.validateInteractionData(interactionData);
      
      await apiService.post(
        API_ENDPOINTS.CHATS.INTERACT(chatId, messageId),
        interactionData
      );

      // Update cached message if available
      this.updateCachedMessageInteraction(chatId, messageId, interactionData);
      
      // Notify listeners
      this.notifyMessageChange('interaction_updated', { 
        id: messageId, 
        interaction: interactionData 
      }, chatId);
      
      return {
        success: true,
        message: 'Message interaction updated successfully',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'updateMessageInteraction', chatId, messageId, interactionData }
      });
    }
  }

  /**
   * Rate message (1-5 stars)
   */
  async rateMessage(chatId, messageId, rating) {
    this.validateRating(rating);
    
    return this.updateMessageInteraction(chatId, messageId, {
      helpful_rating: rating,
    });
  }

  /**
   * Bookmark message
   */
  async bookmarkMessage(chatId, messageId, bookmarked = true) {
    return this.updateMessageInteraction(chatId, messageId, {
      bookmarked,
    });
  }

  /**
   * Add feedback to message
   */
  async addMessageFeedback(chatId, messageId, feedback) {
    this.validateFeedback(feedback);
    
    return this.updateMessageInteraction(chatId, messageId, {
      feedback: feedback.trim(),
    });
  }

  /**
   * Share message
   */
  async shareMessage(chatId, messageId, shared = true) {
    return this.updateMessageInteraction(chatId, messageId, {
      shared,
    });
  }

  /**
   * Search messages
   */
  async searchMessages(query, options = {}) {
    try {
      this.validateSearchQuery(query);
      
      const params = {
        query: query.trim(),
        page: options.page || PAGINATION.DEFAULT_PAGE,
        size: options.size || PAGINATION.DEFAULT_PAGE_SIZE,
      };

      if (options.chatId) {
        params.chat_id = options.chatId;
      }

      if (options.role) {
        params.role = options.role;
      }

      if (options.messageType) {
        params.message_type = options.messageType;
      }

      if (options.status) {
        params.status = options.status;
      }

      if (options.dateFrom) {
        params.date_from = options.dateFrom;
      }

      if (options.dateTo) {
        params.date_to = options.dateTo;
      }

      if (options.includeBranches) {
        params.include_branches = options.includeBranches;
      }

      const response = await apiService.get(API_ENDPOINTS.CHATS.SEARCH, {
        params,
        useCache: true,
        cacheTTL: 180000, // 3 minutes cache
      });
      
      return {
        success: true,
        messages: response.messages,
        pagination: {
          total: response.total,
          page: response.page,
          size: response.size,
          hasNext: response.has_next,
        },
        searchMetadata: response.search_metadata,
        query: query.trim(),
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'searchMessages', query, options }
      });
    }
  }

  /**
   * Get bookmarked messages
   */
  async getBookmarkedMessages(options = {}) {
    try {
      // This would need to be implemented in the backend
      // For now, we'll use search with a placeholder
      const response = await this.searchMessages('*', {
        ...options,
        // Add filter for bookmarked messages when backend supports it
      });
      
      // Filter bookmarked messages on client side for now
      const bookmarkedMessages = response.messages.filter(
        message => message.user_interaction?.bookmarked
      );
      
      return {
        success: true,
        messages: bookmarkedMessages,
        total: bookmarkedMessages.length,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getBookmarkedMessages', options }
      });
    }
  }

  /**
   * Message streaming support
   */
  startStreaming(messageId, streamId) {
    this.streamingMessages.set(streamId, {
      messageId,
      content: '',
      status: MESSAGE_STATUS.STREAMING,
      startTime: Date.now(),
    });
    
    this.setMessageStatus(messageId, MESSAGE_STATUS.STREAMING);
  }

  updateStreamingContent(streamId, chunk) {
    const streaming = this.streamingMessages.get(streamId);
    if (streaming) {
      streaming.content += chunk;
      streaming.lastUpdate = Date.now();
      
      // Notify listeners of streaming update
      this.notifyMessageChange('streaming_update', {
        messageId: streaming.messageId,
        streamId,
        content: streaming.content,
        chunk,
      });
    }
  }

  completeStreaming(streamId, finalContent, metadata = {}) {
    const streaming = this.streamingMessages.get(streamId);
    if (streaming) {
      this.streamingMessages.delete(streamId);
      
      this.setMessageStatus(streaming.messageId, MESSAGE_STATUS.COMPLETE);
      
      // Notify listeners of completion
      this.notifyMessageChange('streaming_complete', {
        messageId: streaming.messageId,
        streamId,
        content: finalContent,
        metadata,
        duration: Date.now() - streaming.startTime,
      });
    }
  }

  failStreaming(streamId, error) {
    const streaming = this.streamingMessages.get(streamId);
    if (streaming) {
      this.streamingMessages.delete(streamId);
      
      this.setMessageStatus(streaming.messageId, MESSAGE_STATUS.FAILED);
      
      // Notify listeners of failure
      this.notifyMessageChange('streaming_failed', {
        messageId: streaming.messageId,
        streamId,
        error,
      });
    }
  }

  /**
   * Message status tracking
   */
  setMessageStatus(messageId, status) {
    this.messageStatuses.set(messageId, {
      status,
      timestamp: Date.now(),
    });
  }

  getMessageStatus(messageId) {
    const statusData = this.messageStatuses.get(messageId);
    return statusData?.status || MESSAGE_STATUS.COMPLETE;
  }

  isMessageStreaming(messageId) {
    return this.getMessageStatus(messageId) === MESSAGE_STATUS.STREAMING;
  }

  isMessagePending(messageId) {
    return this.getMessageStatus(messageId) === MESSAGE_STATUS.PENDING;
  }

  /**
   * Cache management
   */
  addMessageToCache(chatId, message) {
    if (!this.messageCache.has(chatId)) {
      this.messageCache.set(chatId, []);
    }
    
    const messages = this.messageCache.get(chatId);
    
    // Check if message already exists (update instead of duplicate)
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex !== -1) {
      messages[existingIndex] = { ...message, cached_at: Date.now() };
    } else {
      messages.push({ ...message, cached_at: Date.now() });
    }
    
    // Sort by timestamp
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Limit cache size per chat
    if (messages.length > 200) {
      messages.splice(0, messages.length - 200);
    }
  }

  getCachedMessages(chatId) {
    const messages = this.messageCache.get(chatId);
    if (!messages) return null;
    
    // Check if cache is still valid (5 minutes)
    const now = Date.now();
    const validMessages = messages.filter(message => {
      return now - (message.cached_at || 0) < 300000;
    });
    
    if (validMessages.length !== messages.length) {
      this.messageCache.set(chatId, validMessages);
    }
    
    return validMessages.length > 0 ? validMessages : null;
  }

  setCachedMessages(chatId, messages) {
    const messagesWithCache = messages.map(message => ({
      ...message,
      cached_at: Date.now(),
    }));
    
    this.messageCache.set(chatId, messagesWithCache);
  }

  updateCachedMessageInteraction(chatId, messageId, interactionData) {
    const messages = this.messageCache.get(chatId);
    if (messages) {
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        messages[messageIndex].user_interaction = {
          ...messages[messageIndex].user_interaction,
          ...interactionData,
        };
      }
    }
  }

  clearMessageCache(chatId = null) {
    if (chatId) {
      this.messageCache.delete(chatId);
    } else {
      this.messageCache.clear();
    }
  }

  /**
   * Event listeners
   */
  onMessageChange(callback) {
    this.messageListeners.push(callback);
    
    return () => {
      this.messageListeners = this.messageListeners.filter(listener => listener !== callback);
    };
  }

  notifyMessageChange(action, message, chatId = null) {
    this.messageListeners.forEach(listener => {
      try {
        listener({ 
          action, 
          message, 
          chatId, 
          timestamp: new Date().toISOString() 
        });
      } catch (error) {
        console.error('Error in message change listener:', error);
      }
    });
  }

  /**
   * Validation methods
   */
  validateChatId(chatId) {
    if (!chatId || typeof chatId !== 'string') {
      throw new ValidationError('Valid chat ID is required', 'chatId');
    }
  }

  validateMessageId(messageId) {
    if (!messageId || typeof messageId !== 'string') {
      throw new ValidationError('Valid message ID is required', 'messageId');
    }
  }

  validateMessageContent(content) {
    if (!content || !content.trim()) {
      throw new ValidationError('Message content is required', 'content');
    }
    
    if (content.length > VALIDATION.MESSAGE_MAX_LENGTH) {
      throw new ValidationError(
        `Message must be no more than ${VALIDATION.MESSAGE_MAX_LENGTH} characters`,
        'content'
      );
    }
  }

  validateSearchQuery(query) {
    if (!query || !query.trim()) {
      throw new ValidationError('Search query is required', 'query');
    }
    
    if (query.trim().length < 3) {
      throw new ValidationError('Search query must be at least 3 characters long', 'query');
    }
  }

  validateInteractionData(data) {
    if (data.helpful_rating !== undefined) {
      this.validateRating(data.helpful_rating);
    }
    
    if (data.feedback !== undefined) {
      this.validateFeedback(data.feedback);
    }
  }

  validateRating(rating) {
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be a number between 1 and 5', 'rating');
    }
  }

  validateFeedback(feedback) {
    if (typeof feedback !== 'string') {
      throw new ValidationError('Feedback must be a string', 'feedback');
    }
    
    if (feedback.length > 1000) {
      throw new ValidationError('Feedback must be no more than 1000 characters', 'feedback');
    }
  }

  /**
   * Utility methods
   */
  getStreamingMessages() {
    return Array.from(this.streamingMessages.entries()).map(([streamId, data]) => ({
      streamId,
      ...data,
    }));
  }

  getMessageCount(chatId) {
    const messages = this.getCachedMessages(chatId);
    return messages ? messages.length : 0;
  }

  getLatestMessage(chatId) {
    const messages = this.getCachedMessages(chatId);
    return messages && messages.length > 0 ? messages[messages.length - 1] : null;
  }

  /**
   * Statistics and health
   */
  getServiceStatistics() {
    return {
      cachedChats: this.messageCache.size,
      totalCachedMessages: Array.from(this.messageCache.values()).reduce(
        (total, messages) => total + messages.length, 0
      ),
      activeStreams: this.streamingMessages.size,
      trackedStatuses: this.messageStatuses.size,
      listenerCount: this.messageListeners.length,
    };
  }

  healthCheck() {
    return {
      isOperational: true,
      cacheSize: this.messageCache.size,
      activeStreams: this.streamingMessages.size,
      hasActiveListeners: this.messageListeners.length > 0,
      statusTracking: this.messageStatuses.size,
    };
  }

  /**
   * Reset service state
   */
  reset() {
    this.messageCache.clear();
    this.streamingMessages.clear();
    this.messageStatuses.clear();
    this.messageListeners = [];
  }

  /**
   * Batch message operations
   */
  async batchUpdateInteractions(chatId, updates) {
    try {
      this.validateChatId(chatId);
      
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new ValidationError('Updates array is required and cannot be empty', 'updates');
      }
      
      const results = [];
      const errors = [];
      
      for (const update of updates) {
        try {
          const result = await this.updateMessageInteraction(
            chatId, 
            update.messageId, 
            update.interactionData
          );
          results.push({ messageId: update.messageId, success: true, result });
        } catch (error) {
          errors.push({ messageId: update.messageId, error: error.message });
        }
      }
      
      return {
        success: errors.length === 0,
        results,
        errors,
        total: updates.length,
        successful: results.length,
        failed: errors.length,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'batchUpdateInteractions', chatId, updateCount: updates.length }
      });
    }
  }

  /**
   * Export messages
   */
  exportMessages(chatId, format = 'json') {
    const messages = this.getCachedMessages(chatId);
    if (!messages || messages.length === 0) {
      throw new ValidationError('No messages found to export', 'messages');
    }
    
    let content;
    let mimeType;
    let extension;
    
    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify(messages, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
        
      case 'txt':
        content = messages.map(msg => 
          `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`
        ).join('\n\n');
        mimeType = 'text/plain';
        extension = 'txt';
        break;
        
      case 'markdown':
        content = messages.map(msg => {
          const role = msg.role === MESSAGE_ROLES.USER ? '**You**' : '**LawBuddy**';
          const timestamp = new Date(msg.timestamp).toLocaleString();
          return `### ${role} (${timestamp})\n\n${msg.content}\n`;
        }).join('\n---\n\n');
        mimeType = 'text/markdown';
        extension = 'md';
        break;
        
      default:
        throw new ValidationError('Invalid export format. Supported: json, txt, markdown', 'format');
    }
    
    return {
      content,
      mimeType,
      filename: `messages_${chatId}_${new Date().toISOString().split('T')[0]}.${extension}`,
    };
  }

  /**
   * Download exported messages
   */
  downloadMessages(chatId, format = 'json') {
    const exported = this.exportMessages(chatId, format);
    
    const blob = new Blob([exported.content], { type: exported.mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      filename: exported.filename,
      size: exported.content.length,
    };
  }

  /**
   * Message analytics
   */
  getMessageAnalytics(chatId) {
    const messages = this.getCachedMessages(chatId);
    if (!messages || messages.length === 0) {
      return null;
    }
    
    const analytics = {
      total: messages.length,
      byRole: {},
      byType: {},
      byStatus: {},
      averageLength: 0,
      totalLength: 0,
      firstMessage: messages[0]?.timestamp,
      lastMessage: messages[messages.length - 1]?.timestamp,
      ratings: {
        total: 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      interactions: {
        bookmarked: 0,
        shared: 0,
        withFeedback: 0,
      },
    };
    
    let totalLength = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    
    messages.forEach(message => {
      // Count by role
      analytics.byRole[message.role] = (analytics.byRole[message.role] || 0) + 1;
      
      // Count by type
      const msgType = message.message_type || MESSAGE_TYPES.TEXT;
      analytics.byType[msgType] = (analytics.byType[msgType] || 0) + 1;
      
      // Count by status
      const status = this.getMessageStatus(message.id);
      analytics.byStatus[status] = (analytics.byStatus[status] || 0) + 1;
      
      // Calculate length
      totalLength += message.content.length;
      
      // Process interactions
      const interaction = message.user_interaction;
      if (interaction) {
        if (interaction.bookmarked) {
          analytics.interactions.bookmarked++;
        }
        if (interaction.shared) {
          analytics.interactions.shared++;
        }
        if (interaction.feedback) {
          analytics.interactions.withFeedback++;
        }
        if (interaction.helpful_rating) {
          ratingSum += interaction.helpful_rating;
          ratingCount++;
          analytics.ratings.distribution[interaction.helpful_rating]++;
        }
      }
    });
    
    analytics.totalLength = totalLength;
    analytics.averageLength = Math.round(totalLength / messages.length);
    
    if (ratingCount > 0) {
      analytics.ratings.total = ratingCount;
      analytics.ratings.average = Math.round((ratingSum / ratingCount) * 100) / 100;
    }
    
    return analytics;
  }

  /**
   * Get message threads (conversation branching)
   */
  getMessageThreads(chatId) {
    const messages = this.getCachedMessages(chatId);
    if (!messages || messages.length === 0) {
      return [];
    }
    
    const threads = [];
    const messageMap = new Map();
    
    // Create message map
    messages.forEach(message => {
      messageMap.set(message.id, message);
    });
    
    // Build thread structure
    messages.forEach(message => {
      if (!message.parent_message_id) {
        // This is a root message
        threads.push(this.buildThread(message, messageMap));
      }
    });
    
    return threads;
  }

  buildThread(rootMessage, messageMap, visited = new Set()) {
    if (visited.has(rootMessage.id)) {
      return null; // Prevent infinite loops
    }
    
    visited.add(rootMessage.id);
    
    const thread = {
      id: rootMessage.id,
      message: rootMessage,
      children: [],
    };
    
    // Find child messages
    if (rootMessage.child_message_ids && rootMessage.child_message_ids.length > 0) {
      rootMessage.child_message_ids.forEach(childId => {
        const childMessage = messageMap.get(childId);
        if (childMessage) {
          const childThread = this.buildThread(childMessage, messageMap, visited);
          if (childThread) {
            thread.children.push(childThread);
          }
        }
      });
    }
    
    return thread;
  }

  /**
   * Message search with highlighting
   */
  searchAndHighlight(chatId, query) {
    const messages = this.getCachedMessages(chatId);
    if (!messages || messages.length === 0) {
      return [];
    }
    
    const searchTerm = query.trim().toLowerCase();
    const results = [];
    
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      const index = content.indexOf(searchTerm);
      
      if (index !== -1) {
        // Extract context around the match
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + searchTerm.length + 50);
        const context = message.content.substring(start, end);
        
        // Highlight the search term
        const highlightedContext = this.highlightSearchTerm(context, query);
        
        results.push({
          message,
          context: highlightedContext,
          matchIndex: index,
        });
      }
    });
    
    return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
  }

  highlightSearchTerm(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Message validation and cleanup
   */
  cleanupExpiredStatuses() {
    const now = Date.now();
    const expireTime = 60 * 60 * 1000; // 1 hour
    
    for (const [messageId, statusData] of this.messageStatuses.entries()) {
      if (now - statusData.timestamp > expireTime) {
        this.messageStatuses.delete(messageId);
      }
    }
  }

  cleanupExpiredStreams() {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5 minutes
    
    for (const [streamId, streamData] of this.streamingMessages.entries()) {
      if (now - streamData.startTime > expireTime) {
        this.failStreaming(streamId, 'Stream expired due to timeout');
      }
    }
  }

  /**
   * Auto-cleanup routine
   */
  startAutoCleanup() {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStatuses();
      this.cleanupExpiredStreams();
    }, 10 * 60 * 1000);
  }

  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create and export singleton instance
const messageService = new MessageService();

// Start auto-cleanup
messageService.startAutoCleanup();

export default messageService;