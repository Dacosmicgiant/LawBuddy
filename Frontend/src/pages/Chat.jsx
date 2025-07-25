// Frontend/src/pages/Chat.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Colors, getButtonColors, getTextColors } from '../constants/Colors'
import GeminiService from '../services/geminiService'

// Import chat components
import Message from '../components/chat/Message'
import StreamingMessage from '../components/chat/StreamingMessage'
import TypingIndicator from '../components/chat/TypingIndicator'
import SuggestedQuestions from '../components/chat/SuggestedQuestions'
import UserProfileDropdown from '../components/chat/UserProfileDropdown'
import Sidebar from '../components/chat/Sidebar'

const Chat = () => {
  const navigate = useNavigate()
  const [geminiService] = useState(() => new GeminiService())
  const [messages, setMessages] = useState([
    {
      id: 1,
      message: "Hello! I'm LawBuddy, your AI legal assistant specializing in Indian traffic laws. I can help you understand traffic violations, fines, procedures, and your rights under the Motor Vehicles Act, 1988. What would you like to know?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: false
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(1)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      title: "Traffic Laws Consultation",
      preview: "Hello! I'm LawBuddy, your AI legal...",
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      title: "Speeding Fine Query",
      preview: "What are the penalties for overspeeding...",
      timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      title: "Helmet Violation",
      preview: "How much is the fine for not wearing...",
      timestamp: new Date(Date.now() - 172800000).toISOString()
    }
  ])
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Check if Gemini API is configured
  useEffect(() => {
    if (!GeminiService.isConfigured()) {
      const errorMessage = {
        id: Date.now(),
        message: "⚠️ Gemini API is not configured. Please add your VITE_GEMINI_API_KEY to your environment variables to enable AI responses.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: false
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, streamingMessage])

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileDropdownOpen])

  // Handle sending message with real-time streaming
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    // Check API configuration
    if (!GeminiService.isConfigured()) {
      const errorMessage = {
        id: Date.now(),
        message: "Please configure your Gemini API key to use LawBuddy. Add VITE_GEMINI_API_KEY to your .env file.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: false
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }

    const userMessage = {
      id: Date.now(),
      message: inputMessage.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: false
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Initialize streaming message
      const streamingId = Date.now() + 1
      const initialStreamingMessage = {
        id: streamingId,
        message: '',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true
      }
      
      setStreamingMessage(initialStreamingMessage)

      // Send message with real-time character streaming
      await geminiService.sendCharacterStreamingMessage(
        userMessage.message,
        // onCharacter callback - called for each character as it arrives
        (char, currentText, index, total) => {
          setStreamingMessage(prev => ({
            ...prev,
            message: currentText,
            progress: total > 0 ? (index / total) * 100 : 0
          }))
        },
        // onComplete callback - called when streaming is finished
        (finalText) => {
          // Replace streaming message with final message
          const finalMessage = {
            id: streamingId,
            message: finalText,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isStreaming: false
          }
          
          setMessages(prev => [...prev, finalMessage])
          setStreamingMessage(null)
          setIsLoading(false)
          
          // Update chat title based on first user message if it's a new chat
          if (messages.filter(m => m.isUser).length === 0) {
            updateChatTitle(currentChatId, userMessage.message)
          }
        }
      )
      
    } catch (error) {
      console.error('Streaming error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        message: "I apologize, but I'm experiencing technical difficulties. Please check your internet connection and try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: false
      }
      setMessages(prev => [...prev, errorMessage])
      setStreamingMessage(null)
      setIsLoading(false)
    }
  }

  // Update chat title based on first message
  const updateChatTitle = (chatId, firstMessage) => {
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 47) + "..." 
      : firstMessage
    
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title, preview: firstMessage.substring(0, 50) + "..." }
          : chat
      )
    )
  }

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle suggested question click
  const handleSuggestedQuestion = (question) => {
    setInputMessage(question)
    inputRef.current?.focus()
  }

  // Handle new chat
  const handleNewChat = () => {
    const newChatId = Date.now()
    const newChat = {
      id: newChatId,
      title: "New Legal Consultation",
      preview: "Hello! I'm LawBuddy, your AI legal...",
      timestamp: new Date().toISOString()
    }
    
    setChatHistory(prev => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setMessages([
      {
        id: 1,
        message: "Hello! I'm LawBuddy, your AI legal assistant specializing in Indian traffic laws. I can help you understand traffic violations, fines, procedures, and your rights under the Motor Vehicles Act, 1988. What would you like to know?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: false
      }
    ])
    
    // Reset conversation in Gemini service
    geminiService.resetConversation()
    setStreamingMessage(null)
    setIsSidebarOpen(false)
  }

  // Handle chat selection
  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId)
    geminiService.resetConversation()
    setMessages([
      {
        id: 1,
        message: "Hello! I'm LawBuddy, your AI legal assistant specializing in Indian traffic laws. I can help you understand traffic violations, fines, procedures, and your rights under the Motor Vehicles Act, 1988. What would you like to know?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: false
      }
    ])
    setStreamingMessage(null)
    setIsSidebarOpen(false)
  }

  // Handle chat deletion
  const handleDeleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
    if (chatId === currentChatId && chatHistory.length > 1) {
      const remainingChats = chatHistory.filter(chat => chat.id !== chatId)
      if (remainingChats.length > 0) {
        handleSelectChat(remainingChats[0].id)
      }
    }
  }

  return (
    <div className={`min-h-screen ${Colors.background.neutral[50]} flex`}>
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-80">
        {/* Header */}
        <div className={`${Colors.background.white} ${Colors.utility.shadow} px-4 py-4 border-b ${Colors.border.neutral[200]}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>

              <h1 className={`text-lg font-semibold ${getTextColors('heading')}`}>Legal Consultation</h1>
              
              {/* API Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  GeminiService.isConfigured() ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className={`text-xs ${getTextColors('muted')}`}>
                  {GeminiService.isConfigured() ? 'AI Active' : 'API Not Configured'}
                </span>
              </div>
            </div>

            {/* User Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className={`hidden sm:block text-sm font-medium ${getTextColors('heading')}`}>Legal User</span>
                <div className={`w-8 h-8 ${Colors.background.secondary[600]} rounded-full flex items-center justify-center`}>
                  <svg className={`w-4 h-4 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <svg className={`w-4 h-4 ${getTextColors('muted')}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              <UserProfileDropdown 
                isOpen={isProfileDropdownOpen}
                onClose={() => setIsProfileDropdownOpen(false)}
                onNavigateHome={() => navigate('/')}
              />
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {/* Welcome message and suggestions */}
              {messages.filter(m => m.isUser).length === 0 && !streamingMessage && (
                <div className="mb-8">
                  <SuggestedQuestions onQuestionClick={handleSuggestedQuestion} />
                </div>
              )}

              {/* Messages */}
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Message
                    message={message.message}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    isStreaming={message.isStreaming}
                  />
                </div>
              ))}

              {/* Streaming Message */}
              {streamingMessage && (
                <div className="animate-fadeInUp">
                  <StreamingMessage
                    message={streamingMessage.message}
                    isUser={streamingMessage.isUser}
                    timestamp={streamingMessage.timestamp}
                    progress={streamingMessage.progress}
                  />
                </div>
              )}

              {/* Typing indicator */}
              {isLoading && !streamingMessage && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`${Colors.background.white} border-t ${Colors.border.neutral[200]} p-4`}>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={GeminiService.isConfigured() 
                      ? "Ask me about Indian traffic laws, fines, procedures, or your rights..."
                      : "Please configure Gemini API key to start chatting..."
                    }
                    className={`w-full p-3 border ${Colors.border.neutral[200]} rounded-lg resize-none focus:outline-none focus:ring-2 ${Colors.utility.ring} focus:border-transparent ${getTextColors('body')} transition-all duration-200`}
                    rows="1"
                    style={{ maxHeight: '120px' }}
                    disabled={isLoading || !GeminiService.isConfigured()}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || !GeminiService.isConfigured()}
                  className={`${getButtonColors('primary')} px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:scale-105 active:scale-95`}
                >
                  {isLoading ? (
                    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
                  ) : (
                    <svg className={`w-4 h-4 ${Colors.text.white} transition-transform group-hover:translate-x-1`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
              
              {/* Disclaimer */}
              <p className={`text-xs ${getTextColors('muted')} mt-2 text-center`}>
                LawBuddy provides general legal information about Indian traffic laws. For specific legal advice, consult a qualified lawyer.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default Chat