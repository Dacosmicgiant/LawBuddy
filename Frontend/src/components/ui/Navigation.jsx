// Frontend/src/components/ui/Navigation.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Colors, getButtonColors } from '../../constants/Colors'

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger)

const Navigation = ({ scrollToSection }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  // Refs for animations
  const navRef = useRef(null)
  const logoRef = useRef(null)
  const menuItemsRef = useRef([])
  const mobileMenuRef = useRef(null)
  const buttonRef = useRef(null)
  const hamburgerRef = useRef(null)

  // Add menu item to refs
  const addToMenuItems = (el) => {
    if (el && !menuItemsRef.current.includes(el)) {
      menuItemsRef.current.push(el)
    }
  }

  useEffect(() => {
    // Initial entrance animation
    const tl = gsap.timeline()
    
    tl.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    )
    .fromTo(logoRef.current,
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
      "-=0.4"
    )
    .fromTo(menuItemsRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" },
      "-=0.3"
    )
    .fromTo(buttonRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
      "-=0.2"
    )

    // Scroll-based animations
    ScrollTrigger.create({
      start: "top -80",
      end: 99999,
      onUpdate: (self) => {
        if (self.direction === 1 && !isScrolled) {
          // Scrolling down
          setIsScrolled(true)
          gsap.to(navRef.current, {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            duration: 0.3,
            ease: "power2.out"
          })
        } else if (self.direction === -1 && self.scroll() < 80) {
          // Scrolling up to top
          setIsScrolled(false)
          gsap.to(navRef.current, {
            backgroundColor: "rgba(255, 255, 255, 1)",
            backdropFilter: "blur(0px)",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            duration: 0.3,
            ease: "power2.out"
          })
        }
      }
    })

    // Logo hover animation
    const handleLogoHover = () => {
      gsap.to(logoRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out"
      })
    }

    const handleLogoLeave = () => {
      gsap.to(logoRef.current, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      })
    }

    logoRef.current.addEventListener('mouseenter', handleLogoHover)
    logoRef.current.addEventListener('mouseleave', handleLogoLeave)

    // Menu items hover animations
    menuItemsRef.current.forEach((item) => {
      if (item) {
        const handleItemHover = () => {
          gsap.to(item, {
            y: -2,
            color: Colors.text.secondary[600].replace('text-', ''),
            duration: 0.2,
            ease: "power2.out"
          })
        }

        const handleItemLeave = () => {
          gsap.to(item, {
            y: 0,
            color: Colors.text.gray[700].replace('text-', ''),
            duration: 0.2,
            ease: "power2.out"
          })
        }

        item.addEventListener('mouseenter', handleItemHover)
        item.addEventListener('mouseleave', handleItemLeave)
      }
    })

    // Button hover animation
    const handleButtonHover = () => {
      gsap.to(buttonRef.current, {
        scale: 1.05,
        boxShadow: "0 4px 20px rgba(245, 158, 11, 0.3)",
        duration: 0.3,
        ease: "power2.out"
      })
    }

    const handleButtonLeave = () => {
      gsap.to(buttonRef.current, {
        scale: 1,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        duration: 0.3,
        ease: "power2.out"
      })
    }

    if (buttonRef.current) {
      buttonRef.current.addEventListener('mouseenter', handleButtonHover)
      buttonRef.current.addEventListener('mouseleave', handleButtonLeave)
    }

    return () => {
      if (logoRef.current) {
        logoRef.current.removeEventListener('mouseenter', handleLogoHover)
        logoRef.current.removeEventListener('mouseleave', handleLogoLeave)
      }
      if (buttonRef.current) {
        buttonRef.current.removeEventListener('mouseenter', handleButtonHover)
        buttonRef.current.removeEventListener('mouseleave', handleButtonLeave)
      }
    }
  }, [isScrolled])

  // Mobile menu animation
  useEffect(() => {
    if (isMenuOpen && mobileMenuRef.current) {
      gsap.fromTo(mobileMenuRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
      )
      
      gsap.fromTo(mobileMenuRef.current.children,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.05, delay: 0.1, ease: "power2.out" }
      )
    }
  }, [isMenuOpen])

  // Hamburger menu animation
  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    
    if (!isMenuOpen) {
      // Open animation
      gsap.to(hamburgerRef.current.children[0], {
        rotation: 45,
        y: 6,
        duration: 0.3,
        ease: "power2.out"
      })
      gsap.to(hamburgerRef.current.children[1], {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out"
      })
      gsap.to(hamburgerRef.current.children[2], {
        rotation: -45,
        y: -6,
        duration: 0.3,
        ease: "power2.out"
      })
    } else {
      // Close animation
      gsap.to(hamburgerRef.current.children[0], {
        rotation: 0,
        y: 0,
        duration: 0.3,
        ease: "power2.out"
      })
      gsap.to(hamburgerRef.current.children[1], {
        opacity: 1,
        duration: 0.2,
        delay: 0.1,
        ease: "power2.out"
      })
      gsap.to(hamburgerRef.current.children[2], {
        rotation: 0,
        y: 0,
        duration: 0.3,
        ease: "power2.out"
      })
    }
  }

  const handleScrollToSection = (sectionId) => {
    if (isLandingPage) {
      scrollToSection(sectionId)
    } else {
      navigate('/')
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
    setIsMenuOpen(false)
  }

  const handleTryLawBuddy = () => {
    // Button click animation
    gsap.to(buttonRef.current, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => navigate('/chat')
    })
    setIsMenuOpen(false)
  }

  const handleLogoClick = () => {
    // Logo click animation
    gsap.to(logoRef.current, {
      rotation: 360,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        if (isLandingPage) {
          scrollToSection('hero')
        } else {
          navigate('/')
        }
      }
    })
  }

  return (
    <nav 
      ref={navRef}
      className={`${Colors.background.white} fixed w-full top-0 z-50 transition-all duration-300`}
      style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <button 
                ref={logoRef}
                onClick={handleLogoClick}
                className={`text-2xl font-bold ${Colors.text.primary[600]} transition-colors cursor-pointer`}
              >
                ⚖️ LawBuddy
              </button>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              ref={addToMenuItems}
              onClick={() => handleScrollToSection('hero')} 
              className={`${Colors.text.gray[700]} transition-colors cursor-pointer`}
            >
              Home
            </button>
            <button 
              ref={addToMenuItems}
              onClick={() => handleScrollToSection('about')} 
              className={`${Colors.text.gray[700]} transition-colors cursor-pointer`}
            >
              About
            </button>
            <button 
              ref={addToMenuItems}
              onClick={() => handleScrollToSection('features')} 
              className={`${Colors.text.gray[700]} transition-colors cursor-pointer`}
            >
              Features
            </button>
            <button 
              ref={addToMenuItems}
              onClick={() => handleScrollToSection('contact')} 
              className={`${Colors.text.gray[700]} transition-colors cursor-pointer`}
            >
              Contact
            </button>
            <button 
              ref={buttonRef}
              onClick={handleTryLawBuddy}
              className={`${getButtonColors('gold')} px-6 py-2 rounded-lg transition-all font-semibold`}
            >
              Try LawBuddy
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              ref={hamburgerRef}
              onClick={toggleMobileMenu}
              className={`${Colors.text.gray[700]} focus:outline-none p-2`}
            >
              <div className="w-6 h-0.5 bg-current mb-1.5 transition-all"></div>
              <div className="w-6 h-0.5 bg-current mb-1.5 transition-all"></div>
              <div className="w-6 h-0.5 bg-current transition-all"></div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="md:hidden"
          >
            <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${Colors.background.white} ${Colors.utility.shadow} border-t ${Colors.border.neutral[200]}`}>
              <button 
                onClick={() => handleScrollToSection('hero')} 
                className={`block px-3 py-2 ${Colors.text.gray[700]} w-full text-left transition-colors`}
              >
                Home
              </button>
              <button 
                onClick={() => handleScrollToSection('about')} 
                className={`block px-3 py-2 ${Colors.text.gray[700]} w-full text-left transition-colors`}
              >
                About
              </button>
              <button 
                onClick={() => handleScrollToSection('features')} 
                className={`block px-3 py-2 ${Colors.text.gray[700]} w-full text-left transition-colors`}
              >
                Features
              </button>
              <button 
                onClick={() => handleScrollToSection('contact')} 
                className={`block px-3 py-2 ${Colors.text.gray[700]} w-full text-left transition-colors`}
              >
                Contact
              </button>
              <button 
                onClick={handleTryLawBuddy}
                className={`w-full text-left ${getButtonColors('gold')} px-3 py-2 rounded-lg transition-colors font-semibold mt-2`}
              >
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