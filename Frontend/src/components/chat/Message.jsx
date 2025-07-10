// Frontend/src/components/chat/Message.jsx
import { Colors, getTextColors } from '../../constants/Colors'
import FormattedAIResponse from './FormattedAIResponse'

const Message = ({ message, isUser, timestamp, isStreaming = false }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fadeInSlide`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        {/* Avatar */}
        <div 
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative transition-all duration-300 hover:scale-110 ${
            isUser ? Colors.background.secondary[600] : Colors.background.primary[600]
          }`}
        >
          {isUser ? (
            <svg className={`w-4 h-4 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <span className={`text-sm font-bold ${Colors.text.white}`}>⚖️</span>
          )}
          
          {/* Status indicator for AI */}
          {!isUser && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          )}
        </div>
        
        {/* Message Content */}
        <div 
          className={`rounded-lg transition-all duration-300 hover:scale-[1.01] ${
            isUser 
              ? `px-4 py-3 ${Colors.background.secondary[600]} ${Colors.text.white}` 
              : `p-5 ${Colors.background.white} ${getTextColors('body')} ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`
          } ${!isUser ? 'w-full' : ''} relative`}
        >
          {/* Message status indicator for user messages */}
          {isUser && (
            <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
              <div className="w-2 h-2 bg-white/60 rounded-full"></div>
              <div className="w-2 h-2 bg-white/80 rounded-full"></div>
            </div>
          )}
          
          {isUser ? (
            // User messages: simple text display with enhanced styling
            <div>
              <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                {message}
              </p>
            </div>
          ) : (
            // AI messages: enhanced formatting
            <div>
              <FormattedAIResponse content={message} />
            </div>
          )}
          
          {/* Timestamp */}
          <div className={`${isUser ? 'mt-2' : 'mt-4'} text-xs opacity-70 ${
            isUser ? Colors.text.primary[100] : getTextColors('muted')
          } ${isUser ? '' : 'border-t border-gray-100 pt-2'} flex items-center justify-between`}>
            <span>{timestamp}</span>
            
            {/* Message indicators */}
            {!isUser && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium text-xs">AI Response</span>
                </span>
              </div>
            )}
            
            {isUser && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-white/60 text-xs">Delivered</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeInSlide {
          animation: fadeInSlide 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default Message