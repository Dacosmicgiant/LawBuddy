import { useNavigate } from 'react-router-dom'
import { Colors, getButtonColors, getTextColors } from '../../constants/Colors'
import ChatHistoryItem from './ChatHistoryItem'

const Sidebar = ({ isOpen, onClose, chatHistory, currentChatId, onSelectChat, onNewChat, onDeleteChat }) => {
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 ${Colors.background.white} border-r ${Colors.border.neutral[200]} z-50 transform transition-transform duration-300 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚖️</span>
                <span className={`font-bold ${getTextColors('heading')}`}>LawBuddy</span>
              </div>
              <button 
                onClick={onClose}
                className="md:hidden p-1 rounded hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <button 
              onClick={onNewChat}
              className={`w-full ${getButtonColors('primary')} p-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Legal Consultation
            </button>
          </div>
          
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className={`text-sm font-semibold ${getTextColors('muted')} mb-3`}>Recent Consultations</h3>
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === currentChatId}
                  onClick={() => onSelectChat(chat.id)}
                  onDelete={() => onDeleteChat(chat.id)}
                />
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className={`p-4 border-t ${Colors.border.neutral[200]}`}>
            <button 
              onClick={() => navigate('/')}
              className={`w-full text-left p-3 rounded-lg ${Colors.hover.background.neutral} transition-colors text-sm ${getTextColors('body')} flex items-center gap-2`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar