// Frontend/src/components/chat/TypingIndicator.jsx
import { Colors } from '../../constants/Colors'

const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-4 animate-slideIn">
      <div className="flex items-start gap-3 relative">
        {/* Animated avatar */}
        <div className="relative">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${Colors.background.primary[600]} relative z-10 animate-pulse`}>
            <span className={`text-sm font-bold ${Colors.text.white}`}>⚖️</span>
          </div>
          
          {/* Pulsing waves around avatar */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/30 opacity-30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/20 opacity-20 animate-ping" style={{ animationDelay: '0.3s' }}></div>
          <div className="absolute inset-0 rounded-full border-2 border-slate-800/10 opacity-10 animate-ping" style={{ animationDelay: '0.6s' }}></div>
        </div>

        {/* Message bubble with enhanced styling */}
        <div className={`rounded-lg px-4 py-3 ${Colors.background.white} ${Colors.utility.shadow} border ${Colors.border.neutral[200]} relative animate-breathe`}>
          {/* Thinking indicator text */}
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-xs ${Colors.text.secondary[600]} font-medium`}>
              LawBuddy is thinking
            </span>
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-1 h-1 ${Colors.background.secondary[600]} rounded-full animate-pulse`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>

          {/* Main typing dots */}
          <div className="flex items-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 ${Colors.background.primary[600]} rounded-full animate-bounce`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          {/* Animated progress bar */}
          <div className={`mt-3 h-1 ${Colors.background.neutral[200]} rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${Colors.background.secondary[500]} rounded-full animate-shimmer`}
            />
          </div>

          {/* Chat bubble tail */}
          <div className={`absolute left-0 top-4 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 ${Colors.border.neutral[200]} -ml-1`} />
          <div className={`absolute left-0 top-4 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-white`} style={{ marginLeft: '-3px' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes shimmer {
          0% { 
            background-position: -200% 0;
            background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
            background-size: 200% 100%;
          }
          100% { 
            background-position: 200% 0;
            background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
            background-size: 200% 100%;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }

        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }

        .animate-shimmer {
          background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  )
}

export default TypingIndicator