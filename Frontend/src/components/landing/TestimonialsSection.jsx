// Frontend/src/components/landing/TestimonialsSection.jsx
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Colors, getTextColors } from '../../constants/Colors'

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger)

// Enhanced Star Rating Component with animations
const StarRating = ({ delay = 0 }) => {
  const starsRef = useRef([])

  useEffect(() => {
    starsRef.current.forEach((star, index) => {
      if (star) {
        gsap.fromTo(star,
          { scale: 0, rotation: -180 },
          { 
            scale: 1, 
            rotation: 0, 
            duration: 0.4, 
            delay: delay + (index * 0.1),
            ease: "back.out(1.7)" 
          }
        )
      }
    })
  }, [delay])

  const addToRefs = (el) => {
    if (el && !starsRef.current.includes(el)) {
      starsRef.current.push(el)
    }
  }

  return (
    <div className={`flex ${Colors.utility.accent.stars}`}>
      {[...Array(5)].map((_, i) => (
        <svg 
          key={i} 
          ref={addToRefs}
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// Enhanced Testimonial Card Component with animations
const TestimonialCard = ({ quote, name, location, title, index }) => {
  const cardRef = useRef(null)
  const quoteRef = useRef(null)
  const authorRef = useRef(null)

  useEffect(() => {
    const card = cardRef.current

    // Scroll-triggered entrance animation
    ScrollTrigger.create({
      trigger: card,
      start: "top 85%",
      onEnter: () => {
        gsap.fromTo(card, 
          { 
            opacity: 0, 
            y: 50, 
            rotationX: 10,
            scale: 0.9
          },
          { 
            opacity: 1, 
            y: 0, 
            rotationX: 0,
            scale: 1,
            duration: 0.9,
            delay: index * 0.2,
            ease: "power3.out"
          }
        )

        // Quote text animation
        gsap.fromTo(quoteRef.current,
          { opacity: 0, y: 20 },
          { 
            opacity: 1, 
            y: 0, 
            duration: 0.6, 
            delay: (index * 0.2) + 0.3,
            ease: "power2.out" 
          }
        )

        // Author info animation
        gsap.fromTo(authorRef.current.children,
          { opacity: 0, x: -20 },
          { 
            opacity: 1, 
            x: 0, 
            duration: 0.5, 
            delay: (index * 0.2) + 0.5,
            stagger: 0.1,
            ease: "power2.out" 
          }
        )
      },
      onLeaveBack: () => {
        gsap.to(card, { 
          opacity: 0, 
          y: 50, 
          duration: 0.3 
        })
      }
    })

    // Hover animations
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -8,
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        duration: 0.3,
        ease: "power2.out"
      })
      
      gsap.to(quoteRef.current, {
        scale: 1.02,
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
      
      gsap.to(quoteRef.current, {
        scale: 1,
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
      className={`testimonial-card ${Colors.background.neutral[100]} rounded-lg p-8 border-l-4 ${Colors.border.secondary[500]} ${Colors.utility.shadow} cursor-pointer transform transition-transform`}
    >
      <div className="flex items-center mb-4">
        <StarRating delay={index * 0.2 + 0.6} />
      </div>
      <p 
        ref={quoteRef}
        className={`${getTextColors('body')} mb-4 italic text-lg leading-relaxed`}
      >
        "{quote}"
      </p>
      <div ref={authorRef}>
        <div className={`font-semibold ${getTextColors('heading')} text-lg`}>{name}</div>
        <div className={`${getTextColors('muted')} text-sm`}>{title}</div>
        <div className={`${Colors.text.secondary[600]} text-sm font-medium`}>{location}</div>
      </div>
    </div>
  )
}

// Testimonials Section Component with enhanced animations
const TestimonialsSection = () => {
  const sectionRef = useRef(null)
  const titleRef = useRef(null)
  const subtitleRef = useRef(null)
  const gridRef = useRef(null)
  const backgroundRef = useRef(null)

  useEffect(() => {
    // Background animation
    gsap.to(backgroundRef.current, {
      rotation: 360,
      duration: 60,
      repeat: -1,
      ease: "none"
    })

    // Title and subtitle animations
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(titleRef.current,
          { opacity: 0, y: 50, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
        )
        
        gsap.fromTo(subtitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power2.out" }
        )
      }
    })

    // Floating elements animation
    const floatingElements = sectionRef.current.querySelectorAll('.floating-element')
    floatingElements.forEach((el, index) => {
      gsap.to(el, {
        y: "random(-30, 30)",
        x: "random(-20, 20)",
        rotation: "random(-15, 15)",
        duration: "random(4, 6)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.5
      })
    })

  }, [])

  const testimonials = [
    {
      quote: "LawBuddy provided clear, professional guidance on my speeding ticket case. The legal explanations were thorough and I felt confident representing myself in court.",
      name: "Sarah Martinez",
      title: "Small Business Owner",
      location: "California"
    },
    {
      quote: "As a first-time DUI offender, I was overwhelmed. LawBuddy helped me understand my rights and the legal process, saving me thousands in legal fees.",
      name: "Michael Chen",
      title: "Engineer",
      location: "Texas"
    },
    {
      quote: "The 24/7 availability is invaluable. When I got pulled over late at night, LawBuddy was there to help me understand my legal options immediately.",
      name: "Jennifer Williams",
      title: "Healthcare Professional",
      location: "Florida"
    }
  ]

  return (
    <section 
      ref={sectionRef}
      className={`py-20 ${Colors.background.white} relative overflow-hidden`}
    >
      {/* Animated background pattern */}
      <div 
        ref={backgroundRef}
        className="absolute inset-0 opacity-5 pointer-events-none"
      >
        <div className="absolute top-20 left-20 text-8xl">⚖️</div>
        <div className="absolute top-40 right-10 text-6xl">📋</div>
        <div className="absolute bottom-40 left-10 text-7xl">🏛️</div>
        <div className="absolute bottom-20 right-20 text-5xl">📄</div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-element absolute top-32 left-16 w-4 h-4 bg-amber-300/20 rounded-full"></div>
        <div className="floating-element absolute top-64 right-24 w-6 h-6 bg-amber-400/15 rounded-full"></div>
        <div className="floating-element absolute bottom-48 left-32 w-5 h-5 bg-amber-500/10 rounded-full"></div>
        <div className="floating-element absolute bottom-32 right-16 w-3 h-3 bg-amber-300/25 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center mb-16">
          <h2 
            ref={titleRef}
            className={`text-3xl md:text-4xl font-bold ${getTextColors('heading')} mb-4`}
          >
            Client Testimonials
          </h2>
          <p 
            ref={subtitleRef}
            className={`text-xl ${getTextColors('body')} max-w-3xl mx-auto`}
          >
            Real feedback from clients who've used LawBuddy to navigate their legal challenges successfully.
          </p>
        </div>

        <div 
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index}
              quote={testimonial.quote}
              name={testimonial.name}
              title={testimonial.title}
              location={testimonial.location}
              index={index}
            />
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className={`text-sm font-medium ${getTextColors('muted')}`}>Verified Reviews</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className={`text-sm font-medium ${getTextColors('muted')}`}>Confidential Service</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className={`text-sm font-medium ${getTextColors('muted')}`}>4.9/5 Average Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              <span className={`text-sm font-medium ${getTextColors('muted')}`}>10,000+ Happy Clients</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection