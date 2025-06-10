import { Colors, getTextColors } from '../../constants/Colors'
import FormattedAIResponse from './FormattedAIResponse'

const Message = ({ message, isUser, timestamp }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
    <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? Colors.background.secondary[600] : Colors.background.primary[600]
      }`}>
        {isUser ? (
          <svg className={`w-4 h-4 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className={`text-sm font-bold ${Colors.text.white}`}>⚖️</span>
        )}
      </div>
      
      {/* Message Content */}
      <div className={`rounded-lg ${
        isUser 
          ? `px-4 py-3 ${Colors.background.secondary[600]} ${Colors.text.white}` 
          : `p-5 ${Colors.background.white} ${getTextColors('body')} ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`
      } ${!isUser ? 'w-full' : ''}`}>
        {isUser ? (
          // User messages: simple text display
          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message}</p>
        ) : (
          // AI messages: enhanced formatting
          <FormattedAIResponse content={message} />
        )}
        
        {/* Timestamp */}
        <div className={`${isUser ? 'mt-2' : 'mt-4'} text-xs opacity-70 ${
          isUser ? Colors.text.primary[100] : getTextColors('muted')
        } ${isUser ? '' : 'border-t border-gray-100 pt-2'}`}>
          {timestamp}
        </div>
      </div>
    </div>
  </div>
)

export default Message