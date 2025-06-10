import { Colors, getTextColors } from '../../constants/Colors'

const SuggestedQuestions = ({ onQuestionClick }) => {
  const suggestions = [
    "What are the penalties for overspeeding in India?",
    "How much is the fine for not wearing a helmet?",
    "What documents do I need while driving?",
    "Can I get my license suspended for drunk driving?",
    "What's the fine for using mobile phone while driving?",
    "How do I pay traffic challan online?"
  ]

  return (
    <div className="mb-6">
      <h3 className={`text-sm font-semibold ${getTextColors('muted')} mb-3`}>Suggested Questions:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className={`text-left p-3 rounded-lg border ${Colors.border.neutral[200]} ${Colors.hover.background.neutral} transition-colors text-sm ${getTextColors('body')}`}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SuggestedQuestions