// Frontend/src/components/chat/StreamingMessage.jsx
import { useEffect, useRef } from 'react'
import { Colors, getTextColors } from '../../constants/Colors'
import StreamingResponse from './StreamingResponse'

const StreamingMessage = ({ message, isUser, timestamp, progress = 0 }) => {
  const messageRef = useRef(null)

  // Auto-scroll to keep the streaming message in view
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [message])

  return (
    <div ref={messageRef} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-slideInFade`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? Colors.background.secondary[600] : Colors.background.primary[600]
        } relative`}>
          {isUser ? (
            <svg className={`w-4 h-4 ${Colors.text.white}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ) : (
            <span className={`text-sm font-bold ${Colors.text.white}`}>⚖️</span>
          )}
          
          {/* Pulsing indicator for active streaming */}
          {!isUser && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
            </div>
          )}
        </div>
        
        {/* Message Content */}
        <div className={`rounded-lg ${
          isUser 
            ? `px-4 py-3 ${Colors.background.secondary[600]} ${Colors.text.white}` 
            : `p-5 ${Colors.background.white} ${getTextColors('body')} ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`
        } ${!isUser ? 'w-full' : ''} relative`}>
          
          {isUser ? (
            // User messages: simple text display
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message}</p>
          ) : (
            // AI messages: enhanced formatting with real-time streaming
            <div className="space-y-2">
              {/* Show streaming indicator when message is empty or very short */}
              {message.length < 10 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>Receiving response...</span>
                </div>
              )}
              
              <StreamingResponse 
                content={message} 
                isStreaming={true}
                onComplete={() => {
                  // Streaming complete - handled by parent
                }}
              />
            </div>
          )}
          
          {/* Progress bar for streaming */}
          {!isUser && progress > 0 && progress < 100 && (
            <div className={`mt-3 h-1 ${Colors.background.neutral[200]} rounded-full overflow-hidden`}>
              <div 
                className={`h-full ${Colors.background.secondary[500]} rounded-full transition-all duration-300 animate-pulse`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          
          {/* Timestamp with streaming status */}
          <div className={`${isUser ? 'mt-2' : 'mt-4'} text-xs opacity-70 ${
            isUser ? Colors.text.primary[100] : getTextColors('muted')
          } ${isUser ? '' : 'border-t border-gray-100 pt-2'} flex items-center gap-2`}>
            <span>{timestamp}</span>
            {!isUser && (
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium text-xs">
                  {message.length < 10 ? 'Connecting...' : 'Streaming...'}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFade {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-slideInFade {
          animation: slideInFade 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default StreamingMessage