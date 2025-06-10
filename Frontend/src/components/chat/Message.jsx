import { Colors, getTextColors } from '../../constants/Colors'

const Message = ({ message, isUser, timestamp }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
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
      <div className={`rounded-lg px-4 py-3 ${
        isUser 
          ? `${Colors.background.secondary[600]} ${Colors.text.white}` 
          : `${Colors.background.white} ${getTextColors('body')} ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`
      }`}>
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message}</p>
        <span className={`text-xs mt-2 block opacity-70 ${
          isUser ? Colors.text.primary[100] : getTextColors('muted')
        }`}>
          {timestamp}
        </span>
      </div>
    </div>
  </div>
)

export default Message