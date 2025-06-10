import { Colors } from '../../constants/Colors'

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${Colors.background.primary[600]}`}>
        <span className={`text-sm font-bold ${Colors.text.white}`}>⚖️</span>
      </div>
      <div className={`rounded-lg px-4 py-3 ${Colors.background.white} ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`}>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 ${Colors.background.primary[600]} rounded-full animate-bounce`}></div>
          <div className={`w-2 h-2 ${Colors.background.primary[600]} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
          <div className={`w-2 h-2 ${Colors.background.primary[600]} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
)

export default TypingIndicator