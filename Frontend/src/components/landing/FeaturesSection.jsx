// Frontend/src/components/landing/FeaturesSection.jsx
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Colors, getCardColors, getTextColors } from '../../constants/Colors'

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger)

// Enhanced Feature Card Component with animations
const FeatureCard = ({ icon, title, description, index }) => {
  const cardRef = useRef(null)
  const iconRef = useRef(null)

  useEffect(() => {
    const card = cardRef.current
    const iconEl = iconRef.current

    // Scroll-triggered entrance animation
    ScrollTrigger.create({
      trigger: card,
      start: "top 85%",
      onEnter: () => {
        gsap.fromTo(card, 
          { 
            opacity: 0, 
            y: 60, 
            rotationY: 15, 
            scale: 0.9 
          },
          { 
            opacity: 1, 
            y: 0, 
            rotationY: 0, 
            scale: 1,
            duration: 0.8,
            delay: index * 0.15,
            ease: "power3.out"
          }
        )

        // Icon animation
        gsap.fromTo(iconEl,
          { scale: 0, rotation: -180 },
          { 
            scale: 1, 
            rotation: 0, 
            duration: 0.6, 
            delay: (index * 0.15) + 0.3,
            ease: "back.out(1.7)" 
          }
        )
      },
      onLeaveBack: () => {
        gsap.to(card, { 
          opacity: 0, 
          y: 60, 
          duration: 0.3 
        })
      }
    })

    // Hover animations
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -10,
        scale: 1.03,
        boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        duration: 0.3,
        ease: "power2.out"
      })
      
      gsap.to(iconEl, {
        scale: 1.1,
        rotation: 5,
        duration: 0.3,
        ease: "power2.out"
      })
    }

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
        duration: 0.3,
        ease: "power2.out"
      })
      
      gsap.to(iconEl, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: "power2.out"
      })
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [index])

  return (
    <div 
      ref={cardRef}
      className={`feature-card ${getCardColors()} rounded-lg p-8 border-l-4 ${Colors.border.secondary[500]} cursor-pointer transform transition-transform`}
    >
      <div 
        ref={iconRef}
        className={`w-12 h-12 ${Colors.background.secondary[100]} rounded-lg flex items-center justify-center mb-6`}
      >
        {icon}
      </div>
      <h3 className={`text-xl font-bold ${getTextColors('heading')} mb-4`}>{title}</h3>
      <p className={`${getTextColors('body')}`}>{description}</p>
    </div>
  )
}

// Features Section Component
const FeaturesSection = () => {
  const sectionRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    // Title and subtitle animations
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        )
        
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power2.out" }
        )
      }
    })

    // Background animation
    gsap.to(sectionRef.current, {
      backgroundPosition: "200% center",
      duration: 20,
      repeat: -1,
      ease: "none"
    })

  }, [])

  const features = [
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      ),
      title: "24/7 Legal Support",
      description: "Access professional legal assistance anytime, anywhere. Our AI legal assistant is available round the clock for your legal questions."
    },
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      title: "Comprehensive Legal Database",
      description: "Access extensive information on traffic violations, penalties, court procedures, and legal requirements across all jurisdictions."
    },
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      title: "Clear Legal Explanations",
      description: "Complex legal terminology translated into straightforward, understandable language that empowers informed decisions."
    },
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
        </svg>
      ),
      title: "Jurisdiction-Specific Guidance",
      description: "Get precise legal information tailored to your specific state's laws, regulations, and court procedures."
    },
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
      ),
      title: "Personalized Legal Advice",
      description: "Receive customized legal guidance based on your specific situation, circumstances, and jurisdiction."
    },
    {
      icon: (
        <svg className={`w-6 h-6 ${Colors.text.secondary[600]}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      ),
      title: "Attorney-Client Privilege",
      description: "Your legal consultations are completely confidential and protected with enterprise-grade security and privacy."
    }
  ]

  return (
    <section 
      id="features" 
      ref={sectionRef}
      className={`py-20 ${Colors.background.cream} relative overflow-hidden`}
      style={{
        background: `linear-gradient(45deg, ${Colors.background.cream}, #fef7cd, ${Colors.background.cream})`,
        backgroundSize: '400% 400%'
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-6xl animate-pulse">⚖️</div>
        <div className="absolute top-40 right-20 text-4xl animate-bounce delay-1000">📋</div>
        <div className="absolute bottom-40 left-20 text-5xl animate-pulse delay-2000">🏛️</div>
        <div className="absolute bottom-20 right-10 text-4xl animate-bounce delay-3000">📄</div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center mb-16">
          <h2 
            ref={titleRef}
            className={`text-3xl md:text-4xl font-bold ${getTextColors('heading')} mb-4`}
          >
            Professional Legal Features
          </h2>
          <p 
            ref={subtitleRef}
            className={`text-xl ${getTextColors('body')} max-w-3xl mx-auto`}
          >
            Discover how LawBuddy provides professional-grade legal assistance to help you understand and navigate complex legal matters.
          </p>
        </div>

        <div 
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Floating particles animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-amber-300/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.2; }
          50% { transform: translateY(-20px); opacity: 0.5; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}

export default FeaturesSection