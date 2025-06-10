import { Colors, getTextColors } from '../../constants/Colors'

const SuggestedQuestions = ({ onQuestionClick }) => {
  const questionCategories = [
    {
      title: "🚓 Traffic Violations & Fines",
      questions: [
        "What's the fine for not wearing a helmet in India?",
        "How much penalty for overspeeding on highways?",
        "What happens if I jump a red light?",
        "Fine for using mobile phone while driving?"
      ]
    },
    {
      title: "📄 Documents & Procedures", 
      questions: [
        "What documents do I need while driving?",
        "How to get a driving license in India?",
        "How to transfer vehicle ownership?",
        "What is NOC and when do I need it?"
      ]
    },
    {
      title: "⚖️ Legal Rights & Procedures",
      questions: [
        "Can police stop me without any reason?",
        "How to contest a traffic challan?",
        "What to do if my license gets suspended?",
        "How to pay traffic fines online?"
      ]
    },
    {
      title: "🚗 Insurance & Accidents",
      questions: [
        "What to do immediately after an accident?",
        "Is third-party insurance mandatory?",
        "How to claim insurance after accident?",
        "What is hit-and-run case procedure?"
      ]
    }
  ]

  return (
    <div className="mb-6">
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold ${getTextColors('heading')} mb-2`}>
          Ask me about Indian Traffic Laws
        </h2>
        <p className={`${getTextColors('body')} max-w-2xl mx-auto`}>
          Get instant answers about Motor Vehicles Act, fines, procedures, and your legal rights. 
          Click on any question below to get started:
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {questionCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className={`${Colors.background.white} rounded-lg p-4 ${Colors.utility.shadow} border ${Colors.border.neutral[200]}`}>
            <h3 className={`font-semibold ${getTextColors('heading')} mb-3 text-sm`}>
              {category.title}
            </h3>
            <div className="space-y-2">
              {category.questions.map((question, questionIndex) => (
                <button
                  key={questionIndex}
                  onClick={() => onQuestionClick(question)}
                  className={`w-full text-left p-3 rounded-lg border ${Colors.border.neutral[200]} ${Colors.hover.background.neutral} transition-colors text-sm ${getTextColors('body')} hover:border-amber-300 group`}
                >
                  <span className="group-hover:text-amber-600 transition-colors">
                    {question}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start Examples */}
      <div className={`mt-6 p-4 ${Colors.background.secondary[50]} rounded-lg border ${Colors.border.secondary[200]}`}>
        <h4 className={`font-medium ${getTextColors('heading')} mb-2 text-sm flex items-center gap-2`}>
          💡 Quick Examples
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          {[
            "Fine for drunk driving in Mumbai?",
            "Documents needed for bike license?", 
            "How to pay Delhi traffic challan?"
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(example)}
              className={`text-left p-2 rounded ${Colors.hover.background.secondary} transition-colors ${getTextColors('muted')} hover:text-amber-700`}
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className={`mt-4 text-center text-xs ${getTextColors('muted')}`}>
        <p>
          💼 LawBuddy provides general information about Indian traffic laws. 
          For specific legal advice, please consult a qualified lawyer.
        </p>
      </div>
    </div>
  )
}

export default SuggestedQuestions