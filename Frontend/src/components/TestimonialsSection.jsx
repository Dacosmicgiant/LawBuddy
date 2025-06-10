// Star Rating Component
const StarRating = () => (
  <div className="flex text-yellow-400">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
)

// Testimonial Card Component
const TestimonialCard = ({ quote, name, location }) => (
  <div className="bg-gray-50 rounded-lg p-8">
    <div className="flex items-center mb-4">
      <StarRating />
    </div>
    <p className="text-gray-600 mb-4">"{quote}"</p>
    <div className="font-semibold text-gray-900">{name}</div>
    <div className="text-gray-500">{location}</div>
  </div>
)

// Testimonials Section Component
const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "LawBuddy helped me understand my speeding ticket situation in minutes. The explanations were clear and I knew exactly what to expect in court.",
      name: "Sarah M.",
      location: "California"
    },
    {
      quote: "Amazing service! I was confused about DUI laws in my state, and LawBuddy provided comprehensive information that saved me from making costly mistakes.",
      name: "Mike R.",
      location: "Texas"
    },
    {
      quote: "The 24/7 availability is a game-changer. I got pulled over at midnight and LawBuddy was there to help me understand my rights immediately.",
      name: "Jennifer L.",
      location: "Florida"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real feedback from people who've used LawBuddy to understand their traffic law situations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index}
              quote={testimonial.quote}
              name={testimonial.name}
              location={testimonial.location}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection