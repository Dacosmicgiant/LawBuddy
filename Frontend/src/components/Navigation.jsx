import { useState } from 'react'

const Navigation = ({ scrollToSection }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleScrollToSection = (sectionId) => {
    scrollToSection(sectionId)
    setIsMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-blue-600">⚖️ LawBuddy</span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => handleScrollToSection('hero')} className="text-gray-700 hover:text-blue-600 transition-colors">Home</button>
            <button onClick={() => handleScrollToSection('about')} className="text-gray-700 hover:text-blue-600 transition-colors">About</button>
            <button onClick={() => handleScrollToSection('features')} className="text-gray-700 hover:text-blue-600 transition-colors">Features</button>
            <button onClick={() => handleScrollToSection('contact')} className="text-gray-700 hover:text-blue-600 transition-colors">Contact</button>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Try LawBuddy
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
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
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white shadow-lg">
              <button onClick={() => handleScrollToSection('hero')} className="block px-3 py-2 text-gray-700 hover:text-blue-600">Home</button>
              <button onClick={() => handleScrollToSection('about')} className="block px-3 py-2 text-gray-700 hover:text-blue-600">About</button>
              <button onClick={() => handleScrollToSection('features')} className="block px-3 py-2 text-gray-700 hover:text-blue-600">Features</button>
              <button onClick={() => handleScrollToSection('contact')} className="block px-3 py-2 text-gray-700 hover:text-blue-600">Contact</button>
              <button className="w-full text-left bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
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