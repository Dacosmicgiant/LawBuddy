import { Colors, getTextColors } from '../../constants/Colors'

const ChatHistoryItem = ({ chat, isActive, onClick, onDelete }) => (
  <div className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
    isActive ? `${Colors.background.secondary[100]} ${Colors.text.secondary[700]}` : `${Colors.hover.background.neutral} ${getTextColors('body')}`
  }`}>
    <div className="flex-1 min-w-0" onClick={onClick}>
      <p className="text-sm font-medium truncate">{chat.title}</p>
      <p className="text-xs opacity-70 truncate">{chat.preview}</p>
    </div>
    <button
      onClick={onDelete}
      className={`opacity-0 group-hover:opacity-100 p-1 rounded ${Colors.hover.background.primary} transition-opacity`}
    >
      <svg className={`w-4 h-4 ${getTextColors('muted')}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </button>
  </div>
)

export default ChatHistoryItem