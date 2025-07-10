// Frontend/src/components/landing/HeroSection.jsx
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Colors, getButtonColors, getCardColors, getTextColors } from '../../constants/Colors'
import { addLandingButtonHoverAnimations } from '../../utils/animations'

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger)

// Enhanced Stat Card Component with sophisticated animations
const StatCard = ({ number, label, index }) => {
  const cardRef = useRef(null)
  const numberRef = useRef(null)

  useEffect(() => {
    // Entrance animation with 3D effect
    gsap.fromTo(cardRef.current, 
      { 
        opacity: 0, 
        y: 80, 
        rotationX: 45,
        rotationY: 15,
        scale: 0.8,
        z: -100
      }, 
      { 
        opacity: 1, 
        y: 0, 
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        z: 0,
        duration: 1.2, 
        delay: 2.5 + (index * 0.3),
        ease: "power3.out" 
      }
    )

    // Number counter animation with elastic effect
    const target = number.replace(/[^0-9]/g, '')
    if (target) {
      const obj = { val: 0 }
      
      gsap.to(obj, {
        val: parseInt(target),
        duration: 3,
        delay: 3 + (index * 0.3),
        ease: "elastic.out(1, 0.3)",
        onUpdate: () => {
          const formattedVal = Math.ceil(obj.val).toLocaleString()
          const suffix = number.includes('+') ? '+' : ''
          const prefix = number.includes('/') ? '24/' : ''
          numberRef.current.textContent = `${prefix}${formattedVal}${suffix}`
        }
      })
    }

    // Advanced hover animations
    const handleMouseEnter = () => {
      gsap.to(cardRef.current, {
        y: -15,
        scale: 1.08,
        rotationY: 5,
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        duration: 0.4,
        ease: "power2.out"
      })
      
      // Number glow effect
      gsap.to(numberRef.current, {
        textShadow: "0 0 20px rgba(245, 158, 11, 0.5)",
        scale: 1.1,
        duration: 0.3
      })
    }

    const handleMouseLeave = () => {
      gsap.to(cardRef.current, {
        y: 0,
        scale: 1,
        rotationY: 0,
        boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
        duration: 0.4,
        ease: "power2.out"
      })
      
      gsap.to(numberRef.current, {
        textShadow: "none",
        scale: 1,
        duration: 0.3
      })
    }

    const card = cardRef.current
    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [number, index])

  return (
    <div 
      ref={cardRef}
      className={`stat-card ${getCardColors()} rounded-lg p-6 border-l-4 ${Colors.border.secondary[500]} cursor-pointer`}
    >
      <div 
        ref={numberRef}
        className={`text-3xl font-bold ${Colors.text.secondary[600]} mb-2`}
      >
        {number}
      </div>
      <div className={`${getTextColors('body')}`}>{label}</div>
    </div>
  )
}

// Animated Legal Document Component
const FloatingDocument = ({ delay, content, x, y, rotation }) => {
  const docRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(docRef.current, 
      { opacity: 0, y: 100, x: -50, rotation: 45, scale: 0 },
      { 
        opacity: 0.1, 
        y: y, 
        x: x, 
        rotation: rotation, 
        scale: 1,
        duration: 2,
        delay: delay,
        ease: "power2.out"
      }
    )

    // Floating animation
    gsap.to(docRef.current, {
      y: y - 20,
      rotation: rotation + 5,
      duration: 4,
      delay: delay + 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })
  }, [delay, x, y, rotation])

  return (
    <div 
      ref={docRef}
      className="absolute text-4xl md:text-6xl pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      {content}
    </div>
  )
}

// Animated Scales of Justice Component
const ScalesOfJustice = () => {
  const scalesRef = useRef(null)
  const leftPanRef = useRef(null)
  const rightPanRef = useRef(null)

  useEffect(() => {
    // Entrance animation
    gsap.fromTo(scalesRef.current,
      { opacity: 0, scale: 0, y: 50 },
      { 
        opacity: 0.15, 
        scale: 1, 
        y: 0, 
        duration: 1.5,
        delay: 1,
        ease: "back.out(1.7)"
      }
    )

    // Balancing animation
    gsap.to(leftPanRef.current, {
      rotation: -5,
      duration: 3,
      delay: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })

    gsap.to(rightPanRef.current, {
      rotation: 5,
      duration: 3,
      delay: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })
  }, [])

  return (
    <div 
      ref={scalesRef}
      className="absolute top-20 right-10 text-8xl pointer-events-none select-none"
    >
      <div className="relative">
        ⚖️
        <div ref={leftPanRef} className="absolute -left-2 top-3 text-2xl">⚪</div>
        <div ref={rightPanRef} className="absolute -right-2 top-3 text-2xl">⚪</div>
      </div>
    </div>
  )
}

// Animated Legal Text Ticker
const LegalTextTicker = () => {
  const tickerRef = useRef(null)
  
  const legalTexts = [
    "Motor Vehicles Act, 1988",
    "Right to Legal Representation",
    "Equal Justice Under Law",
    "Due Process of Law",
    "Constitutional Rights",
    "Legal Aid Services",
    "Access to Justice"
  ]

  useEffect(() => {
    legalTexts.forEach((text, index) => {
      gsap.fromTo(tickerRef.current.children[index],
        { x: window.innerWidth, opacity: 0 },
        {
          x: -window.innerWidth,
          opacity: 0.1,
          duration: 15,
          delay: index * 3,
          repeat: -1,
          ease: "none"
        }
      )
    })
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div ref={tickerRef} className="relative h-full">
        {legalTexts.map((text, index) => (
          <div
            key={index}
            className="absolute top-1/4 text-6xl font-bold text-gray-200 whitespace-nowrap"
            style={{ top: `${20 + index * 10}%` }}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}

// Orbiting Legal Icons Component
const OrbitingIcons = () => {
  const orbitRef = useRef(null)
  
  const icons = [
    { icon: '🏛️', delay: 0 },
    { icon: '📜', delay: 1 },
    { icon: '🔨', delay: 2 },
    { icon: '📋', delay: 3 },
    { icon: '⚖️', delay: 4 },
    { icon: '🛡️', delay: 5 }
  ]

  useEffect(() => {
    icons.forEach((item, index) => {
      const angle = (index / icons.length) * 360
      const radius = 150
      
      gsap.set(orbitRef.current.children[index], {
        x: radius * Math.cos(angle * Math.PI / 180),
        y: radius * Math.sin(angle * Math.PI / 180),
        opacity: 0
      })

      gsap.to(orbitRef.current.children[index], {
        opacity: 0.3,
        duration: 1,
        delay: item.delay + 3,
        ease: "power2.out"
      })

      gsap.to(orbitRef.current.children[index], {
        rotation: 360,
        duration: 20,
        delay: item.delay + 4,
        repeat: -1,
        ease: "none",
        transformOrigin: `-${radius}px 0px`
      })
    })
  }, [])

  return (
    <div 
      ref={orbitRef}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      {icons.map((item, index) => (
        <div key={index} className="absolute text-4xl">
          {item.icon}
        </div>
      ))}
    </div>
  )
}

// Animated Law Book Component
const AnimatedLawBook = () => {
  const bookRef = useRef(null)
  const pageRef = useRef(null)

  useEffect(() => {
    // Book entrance
    gsap.fromTo(bookRef.current,
      { opacity: 0, scale: 0, rotation: -45 },
      { 
        opacity: 0.2, 
        scale: 1, 
        rotation: 0, 
        duration: 2,
        delay: 4,
        ease: "back.out(1.7)"
      }
    )

    // Page turning animation
    gsap.to(pageRef.current, {
      rotationY: 180,
      duration: 2,
      delay: 6,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    })

    // Floating effect
    gsap.to(bookRef.current, {
      y: -10,
      duration: 3,
      delay: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    })
  }, [])

  return (
    <div 
      ref={bookRef}
      className="absolute bottom-20 left-10 text-6xl pointer-events-none select-none"
    >
      <div className="relative">
        📚
        <div ref={pageRef} className="absolute top-0 left-0 text-3xl">📄</div>
      </div>
    </div>
  )
}

// Constitutional Text Animation
const ConstitutionalText = () => {
  const textRef = useRef(null)

  useEffect(() => {
    const words = "We, the people of India, having solemnly resolved to constitute India into a sovereign, socialist, secular, democratic republic and to secure to all its citizens justice, liberty, equality and fraternity".split(' ')
    
    words.forEach((word, index) => {
      gsap.fromTo(textRef.current.children[index],
        { opacity: 0, y: 20, scale: 0.8 },
        {
          opacity: 0.2,
          y: 0,
          scale: 1,
          duration: 0.5,
          delay: 7 + (index * 0.1),
          ease: "power2.out"
        }
      )
    })
  }, [])

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
      <div 
        ref={textRef}
        className="text-center text-xs md:text-sm font-serif text-gray-300 leading-relaxed"
      >
        {("We, the people of India, having solemnly resolved to constitute India into a sovereign, socialist, secular, democratic republic and to secure to all its citizens justice, liberty, equality and fraternity").split(' ').map((word, index) => (
          <span key={index} className="inline-block mr-1">
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}

// Main Hero Section Component
const HeroSection = ({ scrollToSection }) => {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const buttonContainerRef = useRef(null)
  const statsContainerRef = useRef(null)
  const primaryButtonRef = useRef(null)
  const secondaryButtonRef = useRef(null)

  useEffect(() => {
    // Set initial states
    gsap.set([titleRef.current, subtitleRef.current], { opacity: 0, y: 60, rotationX: 20 })
    gsap.set(buttonContainerRef.current.children, { opacity: 0, y: 40, scale: 0.7 })
    gsap.set(statsContainerRef.current.children, { opacity: 0, y: 60 })

    // Create main timeline with more sophisticated animations
    const tl = gsap.timeline()

    // Title animation with 3D effect and text reveal
    tl.to(titleRef.current, {
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: 1.5,
      ease: "power3.out"
    })
    .to(titleRef.current.querySelector('.highlight'), {
      backgroundPosition: "200% center",
      duration: 2,
      ease: "power2.inOut"
    }, "-=0.8")

    // Subtitle animation with typewriter effect
    tl.to(subtitleRef.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power2.out"
    }, "-=0.8")

    // Buttons animation with elastic effect
    tl.to(buttonContainerRef.current.children, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      stagger: 0.2,
      ease: "elastic.out(1, 0.5)"
    }, "-=0.5")

    // Add button hover effects
    if (primaryButtonRef.current && secondaryButtonRef.current) {
      addLandingButtonHoverAnimations(primaryButtonRef)
      addLandingButtonHoverAnimations(secondaryButtonRef)
    }

  }, [])

  const handleStartConsultation = () => {
    // Enhanced click animation
    gsap.to(primaryButtonRef.current, {
      scale: 0.9,
      rotation: 5,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => navigate('/chat')
    })
  }

  const handleLearnMore = () => {
    gsap.to(secondaryButtonRef.current, {
      scale: 0.9,
      rotation: -5,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      onComplete: () => scrollToSection('about')
    })
  }

  return (
    <section id="hero" className={`relative pt-16 ${Colors.background.gradient.navyToGold} min-h-screen flex items-center overflow-hidden`}>
      {/* Animated Legal Background Elements */}
      <LegalTextTicker />
      
      {/* Floating Legal Documents */}
      <FloatingDocument delay={1} content="📜" x="10%" y="20%" rotation={15} />
      <FloatingDocument delay={2} content="📋" x="85%" y="30%" rotation={-10} />
      <FloatingDocument delay={3} content="🏛️" x="5%" y="70%" rotation={25} />
      <FloatingDocument delay={4} content="🔨" x="90%" y="60%" rotation={-20} />
      <FloatingDocument delay={5} content="📚" x="15%" y="50%" rotation={10} />
      
      {/* Scales of Justice */}
      <ScalesOfJustice />
      
      {/* Orbiting Legal Icons */}
      <OrbitingIcons />
      
      {/* Animated Law Book */}
      <AnimatedLawBook />
      
      {/* Constitutional Text */}
      <ConstitutionalText />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-amber-50/30"></div>
      
      <div ref={heroRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
        <div className="text-center">
          <h1 ref={titleRef} className={`text-4xl md:text-6xl font-bold ${getTextColors('heading')} mb-6`}>
            Your AI-Powered
            <span className={`highlight ${Colors.text.secondary[600]} bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent bg-size-200 bg-pos-0`}> Legal </span>
            Assistant
          </h1>
          
          <p ref={subtitleRef} className={`text-xl md:text-2xl ${getTextColors('body')} mb-8 max-w-3xl mx-auto`}>
            Get instant, accurate answers about traffic violations, motor vehicle laws, and legal procedures. 
            Professional legal guidance available 24/7 to help you navigate complex regulations.
          </p>
          
          <div ref={buttonContainerRef} className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              ref={primaryButtonRef}
              onClick={handleStartConsultation}
              className={`${getButtonColors('primary')} px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 ${Colors.utility.shadow} relative overflow-hidden group`}
            >
              <span className="relative z-10">Start Legal Consultation</span>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </button>
            
            <button 
              ref={secondaryButtonRef}
              onClick={handleLearnMore}
              className={`${getButtonColors('outline')} px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 relative overflow-hidden group`}
            >
              <span className="relative z-10 group-hover:text-white transition-colors duration-300">Learn More</span>
              <div className="absolute inset-0 bg-slate-800 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </button>
          </div>
        </div>

        {/* Enhanced Hero Stats */}
        <div ref={statsContainerRef} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <StatCard number="10,000+" label="Legal Questions Answered" index={0} />
          <StatCard number="24/7" label="Professional Support" index={1} />
          <StatCard number="50+" label="States Covered" index={2} />
        </div>
      </div>

      {/* Scroll indicator with legal gavel animation */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex flex-col items-center">
          <div className="text-2xl mb-2 animate-bounce">🔨</div>
          <div className={`w-6 h-10 border-2 ${Colors.border.primary[600]} rounded-full flex justify-center`}>
            <div className={`w-1 h-3 ${Colors.background.primary[600]} rounded-full mt-2 animate-pulse`}></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .bg-size-200 { background-size: 200% 100%; }
        .bg-pos-0 { background-position: 0% center; }
        .highlight {
          background: linear-gradient(120deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%);
          background-size: 200% 100%;
          background-position: 0% center;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
          50% { text-shadow: 0 0 20px rgba(245, 158, 11, 0.8); }
        }
      `}</style>
    </section>
  )
}

export default HeroSection