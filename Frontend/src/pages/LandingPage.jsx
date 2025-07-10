// Frontend/src/pages/LandingPage.jsx
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navigation from '../components/ui/Navigation'
import HeroSection from '../components/landing/HeroSection'
import AboutSection from '../components/landing/AboutSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import TestimonialsSection from '../components/landing/TestimonialsSection'
import ContactSection from '../components/landing/ContactSection'
import Footer from '../components/ui/Footer'
import { cleanupLandingAnimations } from '../utils/animations'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const LandingPage = () => {
  const pageRef = useRef(null)

  useEffect(() => {
    // Page entrance animation
    gsap.fromTo(pageRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: "power2.out" }
    )

    // Smooth scrolling configuration
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
    })

    // Create a global scroll progress indicator
    gsap.to(".progress-bar", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    })

    // Cleanup on unmount
    return () => {
      cleanupLandingAnimations()
    }
  }, [])

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      // Smooth animated scroll
      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: element, offsetY: 80 },
        ease: "power2.inOut"
      })
    }
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-white relative">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50">
        <div 
          className="progress-bar h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 origin-left scale-x-0"
        />
      </div>

      {/* Cursor Trail Effect */}
      <div id="cursor-trail" className="fixed pointer-events-none z-40">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-amber-400/30 rounded-full"
            style={{
              animation: `cursorTrail 0.6s ease-out forwards`,
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <Navigation scrollToSection={scrollToSection} />
      <HeroSection scrollToSection={scrollToSection} />
      <AboutSection />
      <FeaturesSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer scrollToSection={scrollToSection} />

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => scrollToSection('hero')}
          className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          style={{
            transform: 'translateY(0px)',
            animation: 'float 3s ease-in-out infinite'
          }}
        >
          <svg 
            className="w-6 h-6 group-hover:animate-bounce" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-32 h-32 bg-amber-200/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-10 w-24 h-24 bg-blue-200/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-amber-100/5 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <style jsx>{`
        @keyframes cursorTrail {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #f59e0b, #d97706);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #d97706, #b45309);
        }

        /* Smooth scrolling for better animations */
        html {
          scroll-behavior: smooth;
        }

        /* Selection styling */
        ::selection {
          background-color: #fef3c7;
          color: #92400e;
        }

        /* Focus styles for accessibility */
        button:focus,
        a:focus {
          outline: 2px solid #f59e0b;
          outline-offset: 2px;
        }
      `}</style>

      {/* Mouse Cursor Trail Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('mousemove', (e) => {
            const trail = document.getElementById('cursor-trail');
            if (trail) {
              trail.style.left = e.clientX + 'px';
              trail.style.top = e.clientY + 'px';
            }
          });
        `
      }} />
    </div>
  )
}

export default LandingPage