// Frontend/src/utils/animations.js
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// Animation configurations for landing page
export const ANIMATION_CONFIG = {
  duration: 0.8,
  ease: "power2.out",
  stagger: 0.1,
  delay: 0.2
}

// Hero section entrance animations
export const animateHero = (heroRef) => {
  const tl = gsap.timeline()
  
  tl.fromTo(heroRef.current.querySelector('h1'), 
    { opacity: 0, y: 50, scale: 0.9 }, 
    { opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out" }
  )
  .fromTo(heroRef.current.querySelector('p'), 
    { opacity: 0, y: 30 }, 
    { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 
    "-=0.6"
  )
  .fromTo(heroRef.current.querySelectorAll('button'), 
    { opacity: 0, y: 20, scale: 0.9 }, 
    { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.7)" }, 
    "-=0.4"
  )
  .fromTo(heroRef.current.querySelectorAll('.stat-card'), 
    { opacity: 0, y: 40, rotationX: 10 }, 
    { opacity: 1, y: 0, rotationX: 0, duration: 0.8, stagger: 0.15, ease: "power2.out" }, 
    "-=0.3"
  )

  return tl
}

// Scroll-triggered animations for sections
export const animateOnScroll = (elementRef, options = {}) => {
  const {
    trigger = elementRef.current,
    start = "top 80%",
    end = "bottom 20%",
    animation = "fadeInUp",
    stagger = 0.1,
    duration = 0.8
  } = options

  const animations = {
    fadeInUp: { opacity: 0, y: 50 },
    fadeInLeft: { opacity: 0, x: -50 },
    fadeInRight: { opacity: 0, x: 50 },
    scaleUp: { opacity: 0, scale: 0.8 },
    slideInUp: { opacity: 0, y: 100 },
    rotateIn: { opacity: 0, rotation: 10, scale: 0.9 }
  }

  const fromVars = animations[animation] || animations.fadeInUp
  const toVars = { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, duration, ease: "power2.out" }

  ScrollTrigger.create({
    trigger,
    start,
    end,
    onEnter: () => {
      gsap.fromTo(elementRef.current.children, fromVars, { ...toVars, stagger })
    },
    onLeaveBack: () => {
      gsap.to(elementRef.current.children, { ...fromVars, duration: 0.3 })
    }
  })
}

// Feature cards animation
export const animateFeatureCards = (containerRef) => {
  const cards = containerRef.current.querySelectorAll('.feature-card')
  
  ScrollTrigger.create({
    trigger: containerRef.current,
    start: "top 70%",
    onEnter: () => {
      gsap.fromTo(cards, 
        { opacity: 0, y: 60, rotationY: 15, scale: 0.9 },
        { 
          opacity: 1, 
          y: 0, 
          rotationY: 0, 
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out"
        }
      )
    }
  })
}

// Testimonials animation
export const animateTestimonials = (containerRef) => {
  const testimonials = containerRef.current.querySelectorAll('.testimonial-card')
  
  ScrollTrigger.create({
    trigger: containerRef.current,
    start: "top 75%",
    onEnter: () => {
      gsap.fromTo(testimonials,
        { opacity: 0, y: 50, rotationX: 10 },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.9,
          stagger: 0.2,
          ease: "power3.out"
        }
      )
    }
  })
}

// Landing page specific button hover animations
export const addLandingButtonHoverAnimations = (buttonRef) => {
  if (!buttonRef.current) return

  const button = buttonRef.current
  
  const handleMouseEnter = () => {
    gsap.to(button, { 
      scale: 1.05, 
      duration: 0.3, 
      ease: "power2.out",
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
    })
  }
  
  const handleMouseLeave = () => {
    gsap.to(button, { 
      scale: 1, 
      duration: 0.3, 
      ease: "power2.out",
      boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
    })
  }
  
  const handleMouseDown = () => {
    gsap.to(button, { scale: 0.95, duration: 0.1 })
  }
  
  const handleMouseUp = () => {
    gsap.to(button, { scale: 1.05, duration: 0.1 })
  }

  button.addEventListener('mouseenter', handleMouseEnter)
  button.addEventListener('mouseleave', handleMouseLeave)
  button.addEventListener('mousedown', handleMouseDown)
  button.addEventListener('mouseup', handleMouseUp)

  // Return cleanup function
  return () => {
    button.removeEventListener('mouseenter', handleMouseEnter)
    button.removeEventListener('mouseleave', handleMouseLeave)
    button.removeEventListener('mousedown', handleMouseDown)
    button.removeEventListener('mouseup', handleMouseUp)
  }
}

// Landing page transition animations
export const animateLandingPageTransition = (elementRef, direction = 'in') => {
  if (!elementRef.current) return

  if (direction === 'in') {
    gsap.fromTo(elementRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    )
  } else {
    gsap.to(elementRef.current,
      { opacity: 0, y: -30, duration: 0.4, ease: "power2.in" }
    )
  }
}

// Parallax effect for hero background
export const addParallaxEffect = (elementRef) => {
  if (!elementRef.current) return

  gsap.to(elementRef.current, {
    yPercent: -50,
    ease: "none",
    scrollTrigger: {
      trigger: elementRef.current,
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  })
}

// Stats counter animation
export const animateCounters = (containerRef) => {
  if (!containerRef.current) return

  const counters = containerRef.current.querySelectorAll('.counter-number')
  
  ScrollTrigger.create({
    trigger: containerRef.current,
    start: "top 80%",
    onEnter: () => {
      counters.forEach((counter) => {
        const target = counter.getAttribute('data-target')
        if (target) {
          const obj = { val: 0 }
          
          gsap.to(obj, {
            val: target,
            duration: 2,
            ease: "power2.out",
            onUpdate: () => {
              counter.textContent = Math.ceil(obj.val).toLocaleString()
            }
          })
        }
      })
    }
  })
}

// Magnetic effect for interactive elements (landing page only)
export const addMagneticEffect = (elementRef) => {
  if (!elementRef.current) return

  const element = elementRef.current
  
  const handleMouseMove = (e) => {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    
    gsap.to(element, {
      x: x * 0.1,
      y: y * 0.1,
      duration: 0.3,
      ease: "power2.out"
    })
  }

  const handleMouseLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "power2.out"
    })
  }

  element.addEventListener('mousemove', handleMouseMove)
  element.addEventListener('mouseleave', handleMouseLeave)

  // Return cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove)
    element.removeEventListener('mouseleave', handleMouseLeave)
  }
}

// Navigation scroll animations
export const animateNavigation = (navRef) => {
  if (!navRef.current) return

  ScrollTrigger.create({
    start: "top -80",
    end: 99999,
    onUpdate: (self) => {
      if (self.direction === 1) {
        // Scrolling down
        gsap.to(navRef.current, {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          duration: 0.3,
          ease: "power2.out"
        })
      } else if (self.scroll() < 80) {
        // Scrolling up to top
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
}

// Section reveal animations
export const animateSectionReveal = (sectionRef, options = {}) => {
  if (!sectionRef.current) return

  const {
    start = "top 80%",
    animation = "fadeInUp",
    stagger = 0.1,
    duration = 0.8
  } = options

  const elements = sectionRef.current.children

  ScrollTrigger.create({
    trigger: sectionRef.current,
    start,
    onEnter: () => {
      switch (animation) {
        case 'fadeInUp':
          gsap.fromTo(elements,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration, stagger, ease: "power2.out" }
          )
          break
        case 'scaleIn':
          gsap.fromTo(elements,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration, stagger, ease: "back.out(1.7)" }
          )
          break
        case 'slideInLeft':
          gsap.fromTo(elements,
            { opacity: 0, x: -50 },
            { opacity: 1, x: 0, duration, stagger, ease: "power2.out" }
          )
          break
        default:
          gsap.fromTo(elements,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration, stagger, ease: "power2.out" }
          )
      }
    }
  })
}

// Text animation utilities
export const animateTextReveal = (textRef, options = {}) => {
  if (!textRef.current) return

  const {
    duration = 0.8,
    delay = 0,
    ease = "power2.out"
  } = options

  gsap.fromTo(textRef.current,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration, delay, ease }
  )
}

// Cleanup function for ScrollTrigger (landing page only)
export const cleanupLandingAnimations = () => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  gsap.killTweensOf("*")
}