import { useNavigate } from 'react-router-dom'
import { Colors, getButtonColors, getCardColors, getTextColors } from '../../constants/Colors'

// Stat Card Component
const StatCard = ({ number, label }) => (
  <div className={`${getCardColors()} rounded-lg p-6 border-l-4 ${Colors.border.secondary[500]}`}>
    <div className={`text-3xl font-bold ${Colors.text.secondary[600]} mb-2`}>{number}</div>
    <div className={`${getTextColors('body')}`}>{label}</div>
  </div>
)

// Hero Section Component
const HeroSection = ({ scrollToSection }) => {
  const navigate = useNavigate()

  const handleStartConsultation = () => {
    navigate('/chat')
  }

  return (
    <section id="hero" className={`pt-16 ${Colors.background.gradient.navyToGold} min-h-screen flex items-center`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className={`text-4xl md:text-6xl font-bold ${getTextColors('heading')} mb-6`}>
            Your AI-Powered
            <span className={`${Colors.text.secondary[600]}`}> Legal </span>
            Assistant
          </h1>
          <p className={`text-xl md:text-2xl ${getTextColors('body')} mb-8 max-w-3xl mx-auto`}>
            Get instant, accurate answers about traffic violations, motor vehicle laws, and legal procedures. 
            Professional legal guidance available 24/7 to help you navigate complex regulations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleStartConsultation}
              className={`${getButtonColors('primary')} px-8 py-4 rounded-lg text-lg font-semibold transform hover:scale-105 transition-all duration-200 ${Colors.utility.shadow}`}
            >
              Start Legal Consultation
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className={`${getButtonColors('outline')} px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200`}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <StatCard number="10,000+" label="Legal Questions Answered" />
          <StatCard number="24/7" label="Professional Support" />
          <StatCard number="50+" label="States Covered" />
        </div>
      </div>
    </section>
  )
}

export default HeroSection