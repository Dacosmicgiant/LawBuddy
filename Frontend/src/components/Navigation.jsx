import { useState } from 'react'
import { Colors, getButtonColors } from '../constants/Colors'

const Navigation = ({ scrollToSection }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleScrollToSection = (sectionId) => {
    scrollToSection(sectionId)
    setIsMenuOpen(false)
  }

  return (
    <nav className={`${Colors.background.white} ${Colors.utility.shadow} fixed w-full top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className={`text-2xl font-bold ${Colors.text.primary[600]}`}>⚖️ LawBuddy</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => handleScrollToSection('hero')} className={`${Colors.text.gray[700]} ${Colors.hover.text.primary} transition-colors`}>Home</button>
            <button onClick={() => handleScrollToSection('about')} className={`${Colors.text.gray[700]} ${Colors.hover.text.primary} transition-colors`}>About</button>
            <button onClick={() => handleScrollToSection('features')} className={`${Colors.text.gray[700]} ${Colors.hover.text.primary} transition-colors`}>Features</button>
            <button onClick={() => handleScrollToSection('contact')} className={`${Colors.text.gray[700]} ${Colors.hover.text.primary} transition-colors`}>Contact</button>
            <button className={`${getButtonColors('gold')} px-6 py-2 rounded-lg transition-colors font-semibold`}>
              Try LawBuddy
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`${Colors.text.gray[700]} ${Colors.hover.text.primary} focus:outline-none`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${Colors.background.white} ${Colors.utility.shadow}`}>
              <button onClick={() => handleScrollToSection('hero')} className={`block px-3 py-2 ${Colors.text.gray[700]} ${Colors.hover.text.primary}`}>Home</button>
              <button onClick={() => handleScrollToSection('about')} className={`block px-3 py-2 ${Colors.text.gray[700]} ${Colors.hover.text.primary}`}>About</button>
              <button onClick={() => handleScrollToSection('features')} className={`block px-3 py-2 ${Colors.text.gray[700]} ${Colors.hover.text.primary}`}>Features</button>
              <button onClick={() => handleScrollToSection('contact')} className={`block px-3 py-2 ${Colors.text.gray[700]} ${Colors.hover.text.primary}`}>Contact</button>
              <button className={`w-full text-left ${getButtonColors('gold')} px-3 py-2 rounded-lg transition-colors font-semibold`}>
                Try LawBuddy
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation