// src/services/chatService.js - Chat CRUD operations and management
import apiService from './api.js';
import errorService, { ValidationError } from './errorService.js';
import { 
  API_ENDPOINTS, 
  CHAT_STATUS, 
  EXPORT_FORMATS, 
  PAGINATION,
  VALIDATION,
  CACHE_KEYS
} from './constants.js';

class ChatService {
  constructor() {
    this.chatListeners = [];
    this.currentChat = null;
    this.chatCache = new Map();
    this.lastFetchedChats = null;
  }

  /**
   * Create new chat session
   */
  async createChat(chatData) {
    try {
      this.validateChatData(chatData);
      
      const response = await apiService.post(API_ENDPOINTS.CHATS.BASE, {
        title: chatData.title.trim(),
        initial_message: chatData.initialMessage?.trim(),
        context_window_size: chatData.contextWindowSize || 10,
        tags: chatData.tags || [],
      });

      // Cache the new chat
      this.cacheChat(response);
      
      // Notify listeners
      this.notifyChatChange('created', response);
      
      return {
        success: true,
        chat: response,
        message: 'Chat created successfully',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'createChat', title: chatData.title }
      });
    }
  }

  /**
   * Get user's chat sessions with pagination and filtering
   */
  async getChats(options = {}) {
    try {
      const params = {
        page: options.page || PAGINATION.DEFAULT_PAGE,
        size: options.size || PAGINATION.DEFAULT_PAGE_SIZE,
      };

      // Add filters
      if (options.status) {
        params.status_filter = options.status;
      }

      const response = await apiService.get(API_ENDPOINTS.CHATS.BASE, {
        params,
        useCache: options.useCache,
        cacheTTL: 60000, // 1 minute cache
      });

      // Cache individual chats
      response.chat_sessions.forEach(chat => this.cacheChat(chat));
      
      // Store last fetched result
      this.lastFetchedChats = response;
      
      return {
        success: true,
        chats: response.chat_sessions,
        pagination: {
          total: response.total,
          page: response.page,
          size: response.size,
          hasNext: response.has_next,
        },
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getChats', options }
      });
    }
  }

  /**
   * Get specific chat session
   */
  async getChat(chatId) {
    try {
      this.validateChatId(chatId);
      
      // Check cache first
      const cached = this.getCachedChat(chatId);
      if (cached) {
        return {
          success: true,
          chat: cached,
          fromCache: true,
        };
      }

      const response = await apiService.get(API_ENDPOINTS.CHATS.DETAIL(chatId));
      
      // Cache the chat
      this.cacheChat(response);
      this.currentChat = response;
      
      return {
        success: true,
        chat: response,
        fromCache: false,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getChat', chatId }
      });
    }
  }

  /**
   * Update chat session
   */
  async updateChat(chatId, updateData) {
    try {
      this.validateChatId(chatId);
      this.validateChatUpdateData(updateData);
      
      const payload = {};
      if (updateData.title) payload.title = updateData.title.trim();
      if (updateData.status) payload.status = updateData.status;
      if (updateData.tags) payload.tags = updateData.tags;
      if (updateData.contextWindowSize) payload.context_window_size = updateData.contextWindowSize;

      const response = await apiService.put(API_ENDPOINTS.CHATS.DETAIL(chatId), payload);
      
      // Update cache
      this.cacheChat(response);
      if (this.currentChat?.id === chatId) {
        this.currentChat = response;
      }
      
      // Notify listeners
      this.notifyChatChange('updated', response);
      
      return {
        success: true,
        chat: response,
        message: 'Chat updated successfully',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'updateChat', chatId, updateData }
      });
    }
  }

  /**
   * Delete chat session
   */
  async deleteChat(chatId, hardDelete = false) {
    try {
      this.validateChatId(chatId);
      
      await apiService.delete(API_ENDPOINTS.CHATS.DETAIL(chatId), {
        params: { hard_delete: hardDelete }
      });
      
      // Remove from cache
      this.removeChatFromCache(chatId);
      if (this.currentChat?.id === chatId) {
        this.currentChat = null;
      }
      
      // Notify listeners
      this.notifyChatChange('deleted', { id: chatId });
      
      return {
        success: true,
        message: hardDelete ? 'Chat deleted permanently' : 'Chat deleted',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'deleteChat', chatId, hardDelete }
      });
    }
  }

  /**
   * Archive chat session
   */
  async archiveChat(chatId) {
    return this.updateChat(chatId, { status: CHAT_STATUS.ARCHIVED });
  }

  /**
   * Restore archived chat
   */
  async restoreChat(chatId) {
    return this.updateChat(chatId, { status: CHAT_STATUS.ACTIVE });
  }

  /**
   * Get chat analytics
   */
  async getChatAnalytics(chatId) {
    try {
      this.validateChatId(chatId);
      
      const response = await apiService.get(API_ENDPOINTS.CHATS.ANALYTICS(chatId), {
        useCache: true,
        cacheTTL: 300000, // 5 minutes cache
      });
      
      return {
        success: true,
        analytics: response,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getChatAnalytics', chatId }
      });
    }
  }

  /**
   * Export conversation
   */
  async exportChat(chatId, options = {}) {
    try {
      this.validateChatId(chatId);
      this.validateExportOptions(options);
      
      const params = {
        format: options.format || EXPORT_FORMATS.JSON,
        include_metadata: options.includeMetadata !== false,
        include_branches: options.includeBranches || false,
      };

      const response = await apiService.post(
        API_ENDPOINTS.CHATS.EXPORT(chatId),
        null,
        { params }
      );
      
      // Handle different response formats
      let content = response.content;
      const format = response.format;
      
      if (format === EXPORT_FORMATS.JSON && typeof content === 'object') {
        content = JSON.stringify(content, null, 2);
      }
      
      return {
        success: true,
        content,
        format,
        filename: this.generateExportFilename(chatId, format),
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'exportChat', chatId, options }
      });
    }
  }

  /**
   * Search messages across chats
   */
  async searchMessages(query, options = {}) {
    try {
      this.validateSearchQuery(query);
      
      const params = {
        query: query.trim(),
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'searchMessages', query, options }
      });
    }
  }

  /**
   * Get user's chat statistics
   */
  async getChatStatistics() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CHATS.STATISTICS, {
        useCache: true,
        cacheTTL: 300000, // 5 minutes cache
      });
      
      return {
        success: true,
        statistics: response,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getChatStatistics' }
      });
    }
  }

  /**
   * Get conversation branches
   */
  async getBranches(chatId) {
    try {
      this.validateChatId(chatId);
      
      const response = await apiService.get(API_ENDPOINTS.CHATS.BRANCHES(chatId), {
        useCache: true,
        cacheTTL: 60000, // 1 minute cache
      });
      
      return {
        success: true,
        branches: response,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getBranches', chatId }
      });
    }
  }

  /**
   * Switch conversation branch
   */
  async switchBranch(chatId, branchId) {
    try {
      this.validateChatId(chatId);
      this.validateBranchId(branchId);
      
      await apiService.post(API_ENDPOINTS.CHATS.SWITCH_BRANCH(chatId, branchId));
      
      return {
        success: true,
        message: 'Switched to conversation branch successfully',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'switchBranch', chatId, branchId }
      });
    }
  }

  /**
   * Batch operations on chats
   */
  async batchOperation(operation, chatIds, parameters = {}) {
    try {
      this.validateBatchOperation(operation, chatIds);
      
      const results = [];
      const errors = [];
      
      for (const chatId of chatIds) {
        try {
          let result;
          switch (operation) {
            case 'delete':
              result = await this.deleteChat(chatId, parameters.hardDelete);
              break;
            case 'archive':
              result = await this.archiveChat(chatId);
              break;
            case 'restore':
              result = await this.restoreChat(chatId);
              break;
            case 'tag':
              result = await this.updateChat(chatId, { tags: parameters.tags });
              break;
            default:
              throw new ValidationError(`Unsupported batch operation: ${operation}`);
          }
          results.push({ chatId, success: true, result });
        } catch (error) {
          errors.push({ chatId, error: error.message });
        }
      }
      
      return {
        success: errors.length === 0,
        results,
        errors,
        total: chatIds.length,
        successful: results.length,
        failed: errors.length,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'batchOperation', operation, chatIds }
      });
    }
  }

  /**
   * Get recent chats
   */
  async getRecentChats(limit = 10) {
    try {
      const response = await this.getChats({
        size: limit,
        page: 1,
        useCache: true,
      });
      
      return {
        success: true,
        chats: response.chats,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getRecentChats', limit }
      });
    }
  }

  /**
   * Get favorite chats (based on usage stats)
   */
  async getFavoriteChats(limit = 10) {
    try {
      // This would need to be implemented in the backend
      // For now, return recent chats as favorites
      return this.getRecentChats(limit);
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getFavoriteChats', limit }
      });
    }
  }

  /**
   * Cache management
   */
  cacheChat(chat) {
    this.chatCache.set(chat.id, {
      ...chat,
      cached_at: Date.now(),
    });
    
    // Limit cache size
    if (this.chatCache.size > 100) {
      const oldestKey = this.chatCache.keys().next().value;
      this.chatCache.delete(oldestKey);
    }
  }

  getCachedChat(chatId) {
    const cached = this.chatCache.get(chatId);
    if (!cached) return null;
    
    // Check if cache is still valid (5 minutes)
    const isExpired = Date.now() - cached.cached_at > 300000;
    if (isExpired) {
      this.chatCache.delete(chatId);
      return null;
    }
    
    return cached;
  }

  removeChatFromCache(chatId) {
    this.chatCache.delete(chatId);
  }

  clearChatCache() {
    this.chatCache.clear();
  }

  /**
   * Event listeners
   */
  onChatChange(callback) {
    this.chatListeners.push(callback);
    
    return () => {
      this.chatListeners = this.chatListeners.filter(listener => listener !== callback);
    };
  }

  notifyChatChange(action, chat) {
    this.chatListeners.forEach(listener => {
      try {
        listener({ action, chat, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Error in chat change listener:', error);
      }
    });
  }

  /**
   * Validation methods
   */
  validateChatData(data) {
    if (!data.title || !data.title.trim()) {
      throw new ValidationError('Chat title is required', 'title');
    }
    
    if (data.title.trim().length > VALIDATION.CHAT_TITLE_MAX_LENGTH) {
      throw new ValidationError(
        `Chat title must be no more than ${VALIDATION.CHAT_TITLE_MAX_LENGTH} characters`,
        'title'
      );
    }
    
    if (data.initialMessage && data.initialMessage.length > VALIDATION.MESSAGE_MAX_LENGTH) {
      throw new ValidationError(
        `Initial message must be no more than ${VALIDATION.MESSAGE_MAX_LENGTH} characters`,
        'initialMessage'
      );
    }
  }

  validateChatUpdateData(data) {
    if (data.title !== undefined) {
      if (!data.title || !data.title.trim()) {
        throw new ValidationError('Chat title cannot be empty', 'title');
      }
      
      if (data.title.trim().length > VALIDATION.CHAT_TITLE_MAX_LENGTH) {
        throw new ValidationError(
          `Chat title must be no more than ${VALIDATION.CHAT_TITLE_MAX_LENGTH} characters`,
          'title'
        );
      }
    }
    
    if (data.status && !Object.values(CHAT_STATUS).includes(data.status)) {
      throw new ValidationError('Invalid chat status', 'status');
    }
  }

  validateChatId(chatId) {
    if (!chatId || typeof chatId !== 'string') {
      throw new ValidationError('Valid chat ID is required', 'chatId');
    }
  }

  validateBranchId(branchId) {
    if (!branchId || typeof branchId !== 'string') {
      throw new ValidationError('Valid branch ID is required', 'branchId');
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

  validateExportOptions(options) {
    if (options.format && !Object.values(EXPORT_FORMATS).includes(options.format)) {
      throw new ValidationError('Invalid export format', 'format');
    }
  }

  validateBatchOperation(operation, chatIds) {
    const validOperations = ['delete', 'archive', 'restore', 'tag'];
    if (!validOperations.includes(operation)) {
      throw new ValidationError(`Invalid batch operation: ${operation}`, 'operation');
    }
    
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      throw new ValidationError('Chat IDs array is required and cannot be empty', 'chatIds');
    }
    
    if (chatIds.length > 50) {
      throw new ValidationError('Cannot perform batch operation on more than 50 chats at once', 'chatIds');
    }
  }

  /**
   * Utility methods
   */
  generateExportFilename(chatId, format) {
    const timestamp = new Date().toISOString().split('T')[0];
    const chatName = this.currentChat?.title || 'chat';
    const safeChatName = chatName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    return `lawbuddy_${safeChatName}_${timestamp}.${format}`;
  }

  downloadExportedContent(content, filename, format) {
    const mimeTypes = {
      [EXPORT_FORMATS.JSON]: 'application/json',
      [EXPORT_FORMATS.MARKDOWN]: 'text/markdown',
      [EXPORT_FORMATS.TXT]: 'text/plain',
    };
    
    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get current chat
   */
  getCurrentChat() {
    return this.currentChat;
  }

  /**
   * Set current chat
   */
  setCurrentChat(chat) {
    this.currentChat = chat;
    if (chat) {
      this.cacheChat(chat);
    }
  }

  /**
   * Clear current chat
   */
  clearCurrentChat() {
    this.currentChat = null;
  }

  /**
   * Refresh chat list
   */
  async refreshChats(options = {}) {
    // Clear cache
    this.clearChatCache();
    
    // Fetch fresh data
    return this.getChats({ ...options, useCache: false });
  }

  /**
   * Get chat service statistics
   */
  getServiceStatistics() {
    return {
      cachedChats: this.chatCache.size,
      hasCurrentChat: !!this.currentChat,
      listenerCount: this.chatListeners.length,
      lastFetchedChats: this.lastFetchedChats ? {
        total: this.lastFetchedChats.total,
        count: this.lastFetchedChats.chat_sessions.length,
        timestamp: this.lastFetchedChats.timestamp,
      } : null,
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      isOperational: true,
      cacheSize: this.chatCache.size,
      hasActiveListeners: this.chatListeners.length > 0,
      currentChatId: this.currentChat?.id || null,
      lastOperation: this.lastOperation || null,
    };
  }

  /**
   * Reset service state
   */
  reset() {
    this.currentChat = null;
    this.clearChatCache();
    this.lastFetchedChats = null;
    this.chatListeners = [];
  }
}

// Create and export singleton instance
const chatService = new ChatService();

export default chatService;
        page: options.page || PAGINATION.DEFAULT_PAGE,
        size: options.size || PAGINATION.DEFAULT_PAGE_SIZE,
      };

      if (options.chatId) {
        params.chat_id = options.chatId;
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
        query: query.trim(),