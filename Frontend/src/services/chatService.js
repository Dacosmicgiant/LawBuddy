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
    this.lastOperation = null;
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
      
      // Update last operation
      this.lastOperation = { action: 'create', timestamp: Date.now() };
      
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
      this.lastOperation = { action: 'list', timestamp: Date.now() };
      
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
      this.lastOperation = { action: 'get', timestamp: Date.now(), chatId };
      
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
      
      this.lastOperation = { action: 'update', timestamp: Date.now(), chatId };
      
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
      
      this.lastOperation = { action: 'delete', timestamp: Date.now(), chatId };
      
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
      
      this.lastOperation = { 
        action: 'batch', 
        operation, 
        timestamp: Date.now(), 
        count: chatIds.length 
      };
      
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
   * Advanced search with filters
   */
  async searchChats(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new ValidationError('Search query is required', 'query');
      }

      const params = {
        query: query.trim(),
        page: options.page || PAGINATION.DEFAULT_PAGE,
        size: options.size || PAGINATION.DEFAULT_PAGE_SIZE,
      };

      // Add filters
      if (options.status) {
        params.status = options.status;
      }

      if (options.tags && options.tags.length > 0) {
        params.tags = options.tags.join(',');
      }

      if (options.dateFrom) {
        params.date_from = options.dateFrom;
      }

      if (options.dateTo) {
        params.date_to = options.dateTo;
      }

      // Since there's no dedicated chat search endpoint, 
      // we'll filter the existing chats based on title matching
      const allChats = await this.getChats({ useCache: true });
      const filteredChats = allChats.chats.filter(chat => {
        const titleMatch = chat.title.toLowerCase().includes(query.toLowerCase());
        const previewMatch = chat.preview.toLowerCase().includes(query.toLowerCase());
        
        let statusMatch = true;
        if (options.status) {
          statusMatch = chat.status === options.status;
        }

        let tagMatch = true;
        if (options.tags && options.tags.length > 0) {
          tagMatch = options.tags.some(tag => chat.tags.includes(tag));
        }

        return (titleMatch || previewMatch) && statusMatch && tagMatch;
      });

      // Paginate results
      const startIndex = (params.page - 1) * params.size;
      const endIndex = startIndex + params.size;
      const paginatedChats = filteredChats.slice(startIndex, endIndex);

      return {
        success: true,
        chats: paginatedChats,
        pagination: {
          total: filteredChats.length,
          page: params.page,
          size: params.size,
          hasNext: endIndex < filteredChats.length,
        },
        query: query.trim(),
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'searchChats', query, options }
      });
    }
  }

  /**
   * Get chat summary/preview
   */
  async getChatSummary(chatId) {
    try {
      this.validateChatId(chatId);
      
      const chat = await this.getChat(chatId);
      if (!chat.success) {
        throw new Error('Failed to get chat');
      }

      return {
        success: true,
        summary: {
          id: chat.chat.id,
          title: chat.chat.title,
          preview: chat.chat.preview,
          status: chat.chat.status,
          messageCount: chat.chat.metadata?.message_count || 0,
          lastMessage: chat.chat.last_message_at,
          legalCategories: chat.chat.metadata?.legal_categories || [],
          createdAt: chat.chat.created_at,
          updatedAt: chat.chat.updated_at,
        },
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'getChatSummary', chatId }
      });
    }
  }

  /**
   * Duplicate chat
   */
  async duplicateChat(chatId, newTitle = null) {
    try {
      this.validateChatId(chatId);
      
      const originalChat = await this.getChat(chatId);
      if (!originalChat.success) {
        throw new Error('Failed to get original chat');
      }

      const duplicateTitle = newTitle || `${originalChat.chat.title} (Copy)`;
      
      const duplicateData = {
        title: duplicateTitle,
        tags: [...(originalChat.chat.tags || [])],
        contextWindowSize: originalChat.chat.context_window_size || 10,
      };

      return this.createChat(duplicateData);
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'duplicateChat', chatId, newTitle }
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
   * Filter chats by various criteria
   */
  filterChats(chats, filters = {}) {
    return chats.filter(chat => {
      // Status filter
      if (filters.status && chat.status !== filters.status) {
        return false;
      }

      // Tag filter
      if (filters.tags && filters.tags.length > 0) {
        const hasRequiredTag = filters.tags.some(tag => chat.tags.includes(tag));
        if (!hasRequiredTag) {
          return false;
        }
      }

      // Date filter
      if (filters.dateFrom) {
        const chatDate = new Date(chat.created_at);
        const fromDate = new Date(filters.dateFrom);
        if (chatDate < fromDate) {
          return false;
        }
      }

      if (filters.dateTo) {
        const chatDate = new Date(chat.created_at);
        const toDate = new Date(filters.dateTo);
        if (chatDate > toDate) {
          return false;
        }
      }

      // Legal category filter
      if (filters.legalCategories && filters.legalCategories.length > 0) {
        const chatCategories = chat.metadata?.legal_categories || [];
        const hasRequiredCategory = filters.legalCategories.some(cat => 
          chatCategories.includes(cat)
        );
        if (!hasRequiredCategory) {
          return false;
        }
      }

      // Message count filter
      if (filters.minMessages !== undefined) {
        const messageCount = chat.metadata?.message_count || 0;
        if (messageCount < filters.minMessages) {
          return false;
        }
      }

      if (filters.maxMessages !== undefined) {
        const messageCount = chat.metadata?.message_count || 0;
        if (messageCount > filters.maxMessages) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort chats by various criteria
   */
  sortChats(chats, sortBy = 'updated_at', sortOrder = 'desc') {
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
      lastOperation: this.lastOperation,
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
      memoryUsage: {
        cachedChats: this.chatCache.size,
        listeners: this.chatListeners.length,
      },
    };
  }

  /**
   * Performance metrics
   */
  getPerformanceMetrics() {
    return {
      cacheHitRate: this.calculateCacheHitRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
      operationCount: this.getOperationCount(),
      errorRate: this.calculateErrorRate(),
    };
  }

  calculateCacheHitRate() {
    // Mock implementation - in real app, track cache hits/misses
    return Math.random() * 0.3 + 0.7; // 70-100% hit rate
  }

  calculateAverageResponseTime() {
    // Mock implementation - in real app, track actual response times
    return Math.random() * 200 + 100; // 100-300ms
  }

  getOperationCount() {
    // Mock implementation - in real app, track operations
    return {
      total: Math.floor(Math.random() * 1000) + 100,
      create: Math.floor(Math.random() * 50) + 10,
      read: Math.floor(Math.random() * 500) + 50,
      update: Math.floor(Math.random() * 100) + 20,
      delete: Math.floor(Math.random() * 30) + 5,
    };
  }

  calculateErrorRate() {
    // Mock implementation - in real app, track actual errors
    return Math.random() * 0.05; // 0-5% error rate
  }

  /**
   * Export service configuration
   */
  exportConfiguration() {
    return {
      serviceInfo: {
        name: 'ChatService',
        version: '1.0.0',
        initialized: true,
      },
      currentState: {
        currentChatId: this.currentChat?.id || null,
        cachedChats: this.chatCache.size,
        listenerCount: this.chatListeners.length,
        lastOperation: this.lastOperation,
      },
      statistics: this.getServiceStatistics(),
      healthCheck: this.healthCheck(),
      performance: this.getPerformanceMetrics(),
    };
  }

  /**
   * Import service configuration (for testing/debugging)
   */
  importConfiguration(config) {
    try {
      if (config.currentState?.currentChatId) {
        // Note: This would need the actual chat data to work properly
        console.log('Import configuration - current chat ID:', config.currentState.currentChatId);
      }
      
      return {
        success: true,
        message: 'Configuration imported successfully',
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'importConfiguration' }
      });
    }
  }

  /**
   * Backup chat data
   */
  async backupChats(options = {}) {
    try {
      const chats = await this.getChats({ 
        size: 1000, // Get all chats
        useCache: false 
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalChats: chats.chats.length,
        chats: options.includeFullData ? chats.chats : chats.chats.map(chat => ({
          id: chat.id,
          title: chat.title,
          status: chat.status,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          message_count: chat.metadata?.message_count || 0,
        })),
        metadata: {
          exportedBy: 'ChatService',
          includeFullData: options.includeFullData || false,
          exportOptions: options,
        },
      };

      return {
        success: true,
        backup: backupData,
        size: JSON.stringify(backupData).length,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'backupChats', options }
      });
    }
  }

  /**
   * Download backup
   */
  downloadBackup(backupData, filename = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `lawbuddy_chat_backup_${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    const content = JSON.stringify(backupData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return {
      success: true,
      filename: finalFilename,
      size: content.length,
    };
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupData, options = {}) {
    try {
      if (!backupData || !backupData.chats) {
        throw new ValidationError('Invalid backup data', 'backupData');
      }

      const results = [];
      const errors = [];

      for (const chatData of backupData.chats) {
        try {
          if (options.skipExisting) {
            // Check if chat already exists
            const existing = this.getCachedChat(chatData.id);
            if (existing) {
              results.push({ 
                chatId: chatData.id, 
                status: 'skipped', 
                reason: 'already exists' 
              });
              continue;
            }
          }

          // Create chat from backup data
          const restoredChat = await this.createChat({
            title: chatData.title + (options.appendSuffix ? ' (Restored)' : ''),
            tags: chatData.tags || [],
            contextWindowSize: chatData.context_window_size || 10,
          });

          results.push({ 
            chatId: restoredChat.chat.id, 
            originalId: chatData.id,
            status: 'restored' 
          });
        } catch (error) {
          errors.push({ 
            chatId: chatData.id, 
            error: error.message 
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        total: backupData.chats.length,
        restored: results.filter(r => r.status === 'restored').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        failed: errors.length,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'restoreFromBackup', options }
      });
    }
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    const expireTime = 300000; // 5 minutes
    let cleanedCount = 0;

    for (const [chatId, chatData] of this.chatCache.entries()) {
      if (now - chatData.cached_at > expireTime) {
        this.chatCache.delete(chatId);
        cleanedCount++;
      }
    }

    return {
      cleaned: cleanedCount,
      remaining: this.chatCache.size,
    };
  }

  /**
   * Optimize cache performance
   */
  optimizeCache() {
    // Remove least recently accessed items if cache is too large
    if (this.chatCache.size > 50) {
      const entries = Array.from(this.chatCache.entries());
      
      // Sort by last accessed time (cached_at)
      entries.sort((a, b) => a[1].cached_at - b[1].cached_at);
      
      // Remove oldest 25% of entries
      const removeCount = Math.floor(entries.length * 0.25);
      for (let i = 0; i < removeCount; i++) {
        this.chatCache.delete(entries[i][0]);
      }
    }

    return {
      size: this.chatCache.size,
      optimized: true,
    };
  }

  /**
   * Debug information
   */
  getDebugInfo() {
    return {
      service: 'ChatService',
      version: '1.0.0',
      state: {
        initialized: true,
        currentChat: this.currentChat ? {
          id: this.currentChat.id,
          title: this.currentChat.title,
          status: this.currentChat.status,
        } : null,
        cache: {
          size: this.chatCache.size,
          entries: Array.from(this.chatCache.keys()),
        },
        listeners: this.chatListeners.length,
        lastOperation: this.lastOperation,
        lastFetch: this.lastFetchedChats ? {
          total: this.lastFetchedChats.total,
          timestamp: this.lastFetchedChats.timestamp,
        } : null,
      },
      methods: [
        'createChat', 'getChats', 'getChat', 'updateChat', 'deleteChat',
        'archiveChat', 'restoreChat', 'exportChat', 'searchMessages',
        'getChatAnalytics', 'getBranches', 'switchBranch', 'batchOperation',
        'getRecentChats', 'getFavoriteChats', 'searchChats', 'duplicateChat',
        'backupChats', 'restoreFromBackup', 'healthCheck',
      ],
      features: {
        caching: true,
        eventListeners: true,
        validation: true,
        errorHandling: true,
        batchOperations: true,
        exportImport: true,
        search: true,
        analytics: true,
        backup: true,
      },
    };
  }

  /**
   * Reset service state
   */
  reset() {
    this.currentChat = null;
    this.clearChatCache();
    this.lastFetchedChats = null;
    this.lastOperation = null;
    this.chatListeners = [];
    
    console.log('ChatService has been reset');
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    try {
      // Clear all listeners
      this.chatListeners = [];
      
      // Clear cache
      this.clearChatCache();
      
      // Reset state
      this.currentChat = null;
      this.lastFetchedChats = null;
      this.lastOperation = null;
      
      console.log('ChatService shutdown completed');
      
      return {
        success: true,
        message: 'ChatService shutdown completed',
      };
    } catch (error) {
      console.error('Error during ChatService shutdown:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Auto-cleanup routine
   */
  startAutoCleanup(intervalMinutes = 15) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      try {
        const cleanup = this.cleanupCache();
        const optimize = this.optimizeCache();
        
        console.log('Auto-cleanup completed:', {
          cacheCleanup: cleanup,
          cacheOptimization: optimize,
        });
      } catch (error) {
        console.error('Auto-cleanup error:', error);
      }
    }, intervalMinutes * 60 * 1000);

    return {
      success: true,
      interval: intervalMinutes,
      message: 'Auto-cleanup started',
    };
  }

  /**
   * Stop auto-cleanup
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      
      return {
        success: true,
        message: 'Auto-cleanup stopped',
      };
    }

    return {
      success: false,
      message: 'Auto-cleanup was not running',
    };
  }

  /**
   * Batch chat operations with progress tracking
   */
  async batchOperationWithProgress(operation, chatIds, parameters = {}, onProgress = null) {
    try {
      this.validateBatchOperation(operation, chatIds);
      
      const results = [];
      const errors = [];
      const total = chatIds.length;
      
      for (let i = 0; i < chatIds.length; i++) {
        const chatId = chatIds[i];
        
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
        
        // Report progress
        if (onProgress) {
          onProgress({
            completed: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100),
            currentChatId: chatId,
            successful: results.length,
            failed: errors.length,
          });
        }
      }
      
      this.lastOperation = { 
        action: 'batchWithProgress', 
        operation, 
        timestamp: Date.now(), 
        count: chatIds.length 
      };
      
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
        context: { action: 'batchOperationWithProgress', operation, chatIds }
      });
    }
  }

  /**
   * Smart cache preloading
   */
  async preloadCache(chatIds = null) {
    try {
      let idsToLoad = chatIds;
      
      if (!idsToLoad) {
        // Get recent chats for preloading
        const recentChats = await this.getRecentChats(20);
        idsToLoad = recentChats.chats.map(chat => chat.id);
      }
      
      const results = [];
      const errors = [];
      
      for (const chatId of idsToLoad) {
        try {
          // Check if already cached
          if (!this.getCachedChat(chatId)) {
            const chat = await this.getChat(chatId);
            if (chat.success) {
              results.push(chatId);
            }
          }
        } catch (error) {
          errors.push({ chatId, error: error.message });
        }
      }
      
      return {
        success: errors.length === 0,
        preloaded: results.length,
        errors: errors.length,
        chatIds: results,
      };
    } catch (error) {
      throw errorService.handleError(error, {
        context: { action: 'preloadCache', chatIds }
      });
    }
  }
}

// Create and export singleton instance
const chatService = new ChatService();

// Start auto-cleanup by default
chatService.startAutoCleanup(15); // Every 15 minutes

export default chatService;