// src/services/websocketService.js - WebSocket service with real-time communication
import errorService, { WebSocketError } from './errorService.js';
import authService from './authService.js';
import { 
  API_CONFIG, 
  WS_MESSAGE_TYPES, 
  CONNECTION_STATES, 
  TIMEOUTS, 
  WS_READY_STATES,
  STORAGE_KEYS 
} from './constants.js';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.connectionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = null;
    this.heartbeatInterval = null;
    this.messageQueue = [];
    this.isManualDisconnect = false;
    
    // Event listeners
    this.listeners = {
      connection: [],
      message: [],
      error: [],
      [WS_MESSAGE_TYPES.AI_STREAM_CHUNK]: [],
      [WS_MESSAGE_TYPES.AI_STREAM_COMPLETE]: [],
      [WS_MESSAGE_TYPES.MESSAGE_SENT]: [],
      [WS_MESSAGE_TYPES.NEW_MESSAGE]: [],
      [WS_MESSAGE_TYPES.TYPING_INDICATOR]: [],
      [WS_MESSAGE_TYPES.BRANCH_SWITCHED]: [],
      [WS_MESSAGE_TYPES.CHAT_CREATED]: [],
      [WS_MESSAGE_TYPES.ERROR]: [],
    };

    // Current chat room
    this.currentChatId = null;
    
    // Message acknowledgment tracking
    this.pendingAcks = new Map();
    this.messageTimeout = 30000; // 30 seconds
    
    // Performance tracking
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnectCount: 0,
      totalDowntime: 0,
      lastConnected: null,
    };

    // Listen for auth changes
    authService.onAuthChange(this.handleAuthChange.bind(this));
  }

  /**
   * Connect to WebSocket server
   */
  async connect(chatId = null) {
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        throw new WebSocketError('Authentication required for WebSocket connection');
      }

      // Prevent multiple connection attempts
      if (this.connectionState === CONNECTION_STATES.CONNECTING) {
        return;
      }

      this.setConnectionState(CONNECTION_STATES.CONNECTING);
      this.isManualDisconnect = false;

      // Get access token for authentication
      const token = localStorage.getItem('lawbuddy_access_token');
      if (!token) {
        throw new WebSocketError('No access token available');
      }

      // Build WebSocket URL with authentication
      const wsUrl = new URL('/ws/chat', API_CONFIG.WS_URL.replace('http', 'ws'));
      wsUrl.searchParams.set('token', token);
      if (chatId) {
        wsUrl.searchParams.set('chat_id', chatId);
        this.currentChatId = chatId;
      }

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl.toString());
      
      // Set up event handlers
      this.setupEventHandlers();

      // Start connection timeout
      this.startConnectionTimeout();

    } catch (error) {
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isManualDisconnect = true;
    this.clearReconnectInterval();
    this.clearHeartbeat();
    this.clearMessageQueue();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
    this.currentChatId = null;
    this.connectionId = null;
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = (event) => {
      this.handleConnectionOpen(event);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      this.handleConnectionClose(event);
    };

    this.ws.onerror = (event) => {
      this.handleConnectionError(event);
    };
  }

  /**
   * Handle WebSocket connection open
   */
  handleConnectionOpen(event) {
    console.log('✅ WebSocket connected');
    
    this.setConnectionState(CONNECTION_STATES.CONNECTED);
    this.reconnectAttempts = 0;
    this.stats.lastConnected = new Date();
    this.clearReconnectInterval();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process queued messages
    this.processMessageQueue();
    
    // Notify listeners
    this.emit('connection', {
      type: 'connected',
      connectionId: this.connectionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.stats.messagesReceived++;
      
      // Handle connection establishment
      if (data.type === WS_MESSAGE_TYPES.CONNECTION_ESTABLISHED) {
        this.connectionId = data.metadata?.connection_id;
        localStorage.setItem(STORAGE_KEYS.CONNECTION_ID, this.connectionId);
        return;
      }

      // Handle pong responses
      if (data.type === WS_MESSAGE_TYPES.PONG) {
        this.handlePong(data);
        return;
      }

      // Handle message acknowledgments
      if (data.message_id && this.pendingAcks.has(data.message_id)) {
        this.handleMessageAck(data.message_id);
      }

      // Emit to specific listeners
      this.emit(data.type, data);
      
      // Emit to general message listeners
      this.emit('message', data);

    } catch (error) {
      console.error('WebSocket message parsing error:', error);
      errorService.handleError(
        errorService.createWebSocketError('Failed to parse WebSocket message', { 
          rawData: event.data 
        })
      );
    }
  }

  /**
   * Handle WebSocket connection close
   */
  handleConnectionClose(event) {
    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
    
    this.ws = null;
    this.clearHeartbeat();
    
    // Update stats
    if (this.stats.lastConnected) {
      this.stats.totalDowntime += Date.now() - this.stats.lastConnected.getTime();
    }

    // Don't reconnect if it was a manual disconnect
    if (this.isManualDisconnect) {
      this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
      return;
    }

    // Handle different close codes
    if (event.code === 4001) {
      // Authentication failed
      this.setConnectionState(CONNECTION_STATES.ERROR);
      this.emit('error', {
        type: 'authentication_failed',
        message: 'WebSocket authentication failed',
        code: event.code,
      });
      return;
    }

    // Attempt to reconnect
    this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket connection error
   */
  handleConnectionError(error) {
    console.error('❌ WebSocket error:', error);
    
    this.setConnectionState(CONNECTION_STATES.ERROR);
    
    const wsError = errorService.createWebSocketError(
      error.message || 'WebSocket connection failed',
      { error }
    );
    
    errorService.handleError(wsError);
    this.emit('error', wsError);
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setConnectionState(CONNECTION_STATES.ERROR);
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnectCount++;
    
    const delay = this.getReconnectDelay();
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.setConnectionState(CONNECTION_STATES.RECONNECTING);
    
    this.reconnectInterval = setTimeout(() => {
      this.connect(this.currentChatId);
    }, delay);
  }

  /**
   * Get reconnect delay with exponential backoff
   */
  getReconnectDelay() {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ping();
      }
    }, TIMEOUTS.HEARTBEAT_INTERVAL);
  }

  /**
   * Clear heartbeat interval
   */
  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send ping message
   */
  ping() {
    this.sendMessage({
      type: WS_MESSAGE_TYPES.PING,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle pong response
   */
  handlePong(data) {
    // Connection is healthy
    console.log('🏓 Received pong');
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message, options = {}) {
    try {
      // Add message ID for tracking
      const messageWithId = {
        ...message,
        id: this.generateMessageId(),
        timestamp: new Date().toISOString(),
      };

      // Check connection state
      if (!this.isConnected()) {
        if (options.queue !== false) {
          this.queueMessage(messageWithId);
          return messageWithId.id;
        } else {
          throw new WebSocketError('WebSocket is not connected');
        }
      }

      // Send message
      this.ws.send(JSON.stringify(messageWithId));
      this.stats.messagesSent++;

      // Track acknowledgment if needed
      if (options.expectAck) {
        this.trackMessageAck(messageWithId.id);
      }

      return messageWithId.id;

    } catch (error) {
      errorService.handleError(
        errorService.createWebSocketError('Failed to send WebSocket message', { 
          message, 
          error: error.message 
        })
      );
      throw error;
    }
  }

  /**
   * Send chat message
   */
  sendChatMessage(chatId, content, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.SEND_MESSAGE,
      chat_session_id: chatId,
      content,
      role: 'user',
      response_format: options.responseFormat || 'markdown',
      metadata: options.metadata || {},
    }, { expectAck: true, ...options });
  }

  /**
   * Regenerate message
   */
  regenerateMessage(chatId, messageId, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.REGENERATE_MESSAGE,
      chat_session_id: chatId,
      message_id: messageId,
      response_format: options.responseFormat || 'markdown',
    }, { expectAck: true, ...options });
  }

  /**
   * Edit message
   */
  editMessage(chatId, messageId, newContent, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.EDIT_MESSAGE,
      chat_session_id: chatId,
      message_id: messageId,
      new_content: newContent,
    }, { expectAck: true, ...options });
  }

  /**
   * Cancel AI generation
   */
  cancelGeneration(streamId, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.CANCEL_GENERATION,
      stream_id: streamId,
    }, options);
  }

  /**
   * Switch conversation branch
   */
  switchBranch(chatId, branchId, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.SWITCH_BRANCH,
      chat_session_id: chatId,
      branch_id: branchId,
    }, { expectAck: true, ...options });
  }

  /**
   * Get conversation branches
   */
  getBranches(chatId, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.GET_BRANCHES,
      chat_session_id: chatId,
    }, { expectAck: true, ...options });
  }

  /**
   * Join chat room
   */
  joinChat(chatId, options = {}) {
    this.currentChatId = chatId;
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.JOIN_CHAT,
      chat_session_id: chatId,
    }, options);
  }

  /**
   * Leave chat room
   */
  leaveChat(chatId, options = {}) {
    const result = this.sendMessage({
      type: WS_MESSAGE_TYPES.LEAVE_CHAT,
      chat_session_id: chatId,
    }, options);
    
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
    
    return result;
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId, isTyping, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.TYPING,
      chat_session_id: chatId,
      metadata: { is_typing: isTyping },
    }, { queue: false, ...options });
  }

  /**
   * Create new chat
   */
  createChat(title, initialMessage = null, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.CREATE_CHAT,
      title,
      initial_message: initialMessage,
    }, { expectAck: true, ...options });
  }

  /**
   * Get chat list
   */
  getChatList(options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.GET_CHAT_LIST,
      limit: options.limit || 20,
      skip: options.skip || 0,
    }, { expectAck: true, ...options });
  }

  /**
   * Get messages for chat
   */
  getMessages(chatId, options = {}) {
    return this.sendMessage({
      type: WS_MESSAGE_TYPES.GET_MESSAGES,
      chat_session_id: chatId,
      limit: options.limit || 50,
      skip: options.skip || 0,
      branch_id: options.branchId,
    }, { expectAck: true, ...options });
  }

  /**
   * Queue message for later sending
   */
  queueMessage(message) {
    this.messageQueue.push({
      message,
      timestamp: Date.now(),
    });

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue = this.messageQueue.slice(-100);
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(({ message }) => {
      try {
        this.ws.send(JSON.stringify(message));
        this.stats.messagesSent++;
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Re-queue if sending fails
        this.queueMessage(message);
      }
    });
  }

  /**
   * Clear message queue
   */
  clearMessageQueue() {
    this.messageQueue = [];
  }

  /**
   * Track message acknowledgment
   */
  trackMessageAck(messageId) {
    const timeout = setTimeout(() => {
      this.pendingAcks.delete(messageId);
      this.emit('message_timeout', { messageId });
    }, this.messageTimeout);

    this.pendingAcks.set(messageId, timeout);
  }

  /**
   * Handle message acknowledgment
   */
  handleMessageAck(messageId) {
    const timeout = this.pendingAcks.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAcks.delete(messageId);
      this.emit('message_ack', { messageId });
    }
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WS_READY_STATES.OPEN;
  }

  /**
   * Check if WebSocket is connecting
   */
  isConnecting() {
    return this.connectionState === CONNECTION_STATES.CONNECTING;
  }

  /**
   * Check if WebSocket is reconnecting
   */
  isReconnecting() {
    return this.connectionState === CONNECTION_STATES.RECONNECTING;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Set connection state and notify listeners
   */
  setConnectionState(state) {
    const previousState = this.connectionState;
    this.connectionState = state;

    if (previousState !== state) {
      this.emit('connection', {
        type: 'state_change',
        state,
        previousState,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Add event listener
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(
        listener => listener !== callback
      );
    };
  }

  /**
   * Remove event listener
   */
  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(
        listener => listener !== callback
      );
    }
  }

  /**
   * Emit event to listeners
   */
  emit(eventType, data) {
    const listeners = this.listeners[eventType] || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket ${eventType} listener:`, error);
      }
    });
  }

  /**
   * Clear reconnect interval
   */
  clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Start connection timeout
   */
  startConnectionTimeout() {
    setTimeout(() => {
      if (this.connectionState === CONNECTION_STATES.CONNECTING) {
        this.handleConnectionError(new Error('Connection timeout'));
      }
    }, TIMEOUTS.WEBSOCKET_CONNECT);
  }

  /**
   * Handle authentication changes
   */
  handleAuthChange(authState) {
    if (!authState.isAuthenticated && this.isConnected()) {
      // User logged out, disconnect WebSocket
      this.disconnect();
    }
  }

  /**
   * Get WebSocket statistics
   */
  getStatistics() {
    return {
      connectionState: this.connectionState,
      connectionId: this.connectionId,
      currentChatId: this.currentChatId,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      pendingAcks: this.pendingAcks.size,
      listenerCounts: Object.fromEntries(
        Object.entries(this.listeners).map(([key, listeners]) => [key, listeners.length])
      ),
      stats: { ...this.stats },
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnectCount: 0,
      totalDowntime: 0,
      lastConnected: null,
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      isConnected: this.isConnected(),
      connectionState: this.connectionState,
      hasActiveListeners: Object.values(this.listeners).some(list => list.length > 0),
      queueSize: this.messageQueue.length,
      pendingAcks: this.pendingAcks.size,
      reconnectAttempts: this.reconnectAttempts,
      uptime: this.stats.lastConnected 
        ? Date.now() - this.stats.lastConnected.getTime() 
        : 0,
    };
  }
}

// Create and export singleton instance
const websocketService = new WebSocketService();

export default websocketService;