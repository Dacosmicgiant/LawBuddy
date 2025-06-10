import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Colors, getButtonColors, getTextColors } from '../constants/Colors'

// Import chat components
import Message from '../components/chat/Message'
import TypingIndicator from '../components/chat/TypingIndicator'
import SuggestedQuestions from '../components/chat/SuggestedQuestions'
import UserProfileDropdown from '../components/chat/UserProfileDropdown'
import Sidebar from '../components/chat/Sidebar'

const Chat = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      id: 1,
      message: "Hello! I'm LawBuddy, your AI legal assistant specializing in Indian traffic laws. I can help you understand traffic violations, fines, procedures, and your rights. What would you like to know?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(1)
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

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

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

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      message: inputMessage.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // TODO: Replace with actual Gemini API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const botResponse = {
        id: Date.now() + 1,
        message: `I understand you're asking about "${userMessage.message}". 

Based on Indian traffic laws, here's what you need to know:

This is a simulated response. In the actual implementation, this would be powered by Google's Gemini AI, specifically trained on Indian traffic laws and regulations.

The response would be:
• Clear and in layman's terms
• Specific to Indian traffic laws
• Include relevant sections and penalties
• Provide actionable advice

Would you like me to clarify any specific aspect of this topic?`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, botResponse])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        message: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
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
        message: "Hello! I'm LawBuddy, your AI legal assistant specializing in Indian traffic laws. I can help you understand traffic violations, fines, procedures, and your rights. What would you like to know?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
    setIsSidebarOpen(false)
  }

  // Handle chat selection
  const handleSelectChat = (chatId) => {
    setCurrentChatId(chatId)
    // In a real app, you'd load the messages for this chat
    setIsSidebarOpen(false)
  }

  // Handle chat deletion
  const handleDeleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
    if (chatId === currentChatId && chatHistory.length > 1) {
      const remainingChats = chatHistory.filter(chat => chat.id !== chatId)
      setCurrentChatId(remainingChats[0]?.id || null)
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
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>

              <h1 className={`text-lg font-semibold ${getTextColors('heading')}`}>Legal Consultation</h1>
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
              {/* Welcome message and suggestions (only show when no user messages) */}
              {messages.filter(m => m.isUser).length === 0 && (
                <div className="mb-8">
                  <SuggestedQuestions onQuestionClick={handleSuggestedQuestion} />
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message.message}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}

              {/* Typing indicator */}
              {isLoading && <TypingIndicator />}
              
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
                    placeholder="Ask me about Indian traffic laws, fines, procedures, or your rights..."
                    className={`w-full p-3 border ${Colors.border.neutral[200]} rounded-lg resize-none focus:outline-none focus:ring-2 ${Colors.utility.ring} focus:border-transparent ${getTextColors('body')}`}
                    rows="1"
                    style={{ maxHeight: '120px' }}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className={`${getButtonColors('primary')} px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                >
                  {isLoading ? (
                    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
                  ) : (
                    <svg className={`w-4 h-4 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
              
              {/* Disclaimer */}
              <p className={`text-xs ${getTextColors('muted')} mt-2 text-center`}>
                LawBuddy provides general legal information. For specific legal advice, consult a qualified lawyer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat