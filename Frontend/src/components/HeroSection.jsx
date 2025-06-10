// Stat Card Component
const StatCard = ({ number, label }) => (
  <div className="bg-white rounded-lg p-6 shadow-lg">
    <div className="text-3xl font-bold text-blue-600 mb-2">{number}</div>
    <div className="text-gray-600">{label}</div>
  </div>
)

// Hero Section Component
const HeroSection = ({ scrollToSection }) => (
  <section id="hero" className="pt-16 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Your AI-Powered
          <span className="text-blue-600"> Traffic Law </span>
          Assistant
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Get instant, accurate answers about traffic violations, motor vehicle laws, and legal procedures. 
          Available 24/7 to help you navigate complex traffic regulations.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
            Start Chatting Now
          </button>
          <button 
            onClick={() => scrollToSection('about')}
            className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <StatCard number="10,000+" label="Questions Answered" />
        <StatCard number="24/7" label="Available Support" />
        <StatCard number="50+" label="States Covered" />
      </div>
    </div>
  </section>
)

export default HeroSection