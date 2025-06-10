import Navigation from './components/ui/Navigation'
import HeroSection from './components/landing/HeroSection'
import AboutSection from './components/landing/AboutSection'
import FeaturesSection from './components/landing/FeaturesSection'
import TestimonialsSection from './components/landing/TestimonialsSection'
import ContactSection from './components/landing/ContactSection'
import Footer from './components/ui/Footer'

// Main App Component
function App() {
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation scrollToSection={scrollToSection} />
      <HeroSection scrollToSection={scrollToSection} />
      <AboutSection />
      <FeaturesSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer scrollToSection={scrollToSection} />
    </div>
  )
}

export default App